import { rpc, TransactionBuilder } from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
  TokenConfig,
  defaultToken,
  USDC_DECIMALS,
} from "./config";
import { resolveXlmUsdRate, XlmRateUnavailableError } from "./price";
import { ensureNetwork, signWithFreighter, WalletError } from "./freighter";
import { decodePaymentEvent, PaymentReceipt, waitForTransaction } from "./events";
import { addressToScVal, bytes32ToScVal, bytesToHex, hashOrderId, i128ToScVal } from "./scval";
import { assertPaymentReady } from "./account";
import { buildInvocationTransaction, budgetFee, prepareAndReport } from "./simulate";

export { fundTestnetAccount } from "./account";

export interface PayOptions {
  /** Price in dollars (USD), converted to token raw units internally. */
  amountUsd: number;
  /** Optional explicit token amount override (e.g. converted XLM amount). */
  tokenAmount?: number;
  /** Human-readable order id (any string), hashed to 32 bytes for the contract. */
  orderId: string;
  /** Buyer's Freighter public key. */
  publicKey: string;
  /** Token to pay with (defaults to the first supported token, USDC, but can be native XLM). */
  token?: TokenConfig;
  /** USD per 1 XLM. Required when paying with native XLM; ignored for stablecoins. */
  xlmUsdPrice?: number;
  /** Called with human-readable progress updates. */
  onStatus?: (status: string) => void;
}

export interface PayResult {
  hash: string;
  status: string;
  /** The decoded on-chain payment event, already checked against the request. */
  receipt: PaymentReceipt;
  amountUsd: number;
  tokenAmount: number;
  tokenSymbol: string;
  amountRaw: bigint;
  /** Pre-flight simulation details (see lib/stellar/simulate.ts). */
  simulation: {
    minResourceFeeStroops: string;
    recommendedInclusionFeeStroops: string;
    instructions: number;
  };
}

/**
 * Whether the opt-in Stellar debug logging is enabled.
 *
 * Logging is off unless the caller explicitly sets
 * `NEXT_PUBLIC_STELLAR_DEBUG` to `"1"` or `"true"`, so production payments
 * never write internal state to the browser console. See issue #718.
 */
function isStellarDebugEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_STELLAR_DEBUG;
  return flag === "1" || flag === "true";
}

/**
 * Default progress sink used when the caller does not pass `onStatus`.
 * Silent unless debug logging is explicitly enabled.
 */
function status(s: string): void {
  if (isStellarDebugEnabled()) {
    console.log(`[stellar] ${s}`);
  }
}

/**
 * Convert a USD amount to raw token units (7 decimals).
 * e.g. 12.34 -> 123_400_000
 */
export function usdToRawUnits(amountUsd: number): bigint {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new WalletError("Invalid amount to pay.", "INVALID_AMOUNT");
  }
  const raw = Math.round(amountUsd * 10 ** USDC_DECIMALS);
  return BigInt(raw);
}

/**
 * Round-trip an order id string through its 32-byte hash (hex) so callers can
 * cross-check on-chain order ids with their own order numbers.
 */
export async function orderIdHash(orderId: string): Promise<string> {
  return bytesToHex(await hashOrderId(orderId));
}

/**
 * Confirm a payment from the chain rather than from the request that produced it.
 *
 * `payWithStellar` builds the transaction from its own inputs, so those inputs
 * only say what the buyer *asked* to pay. `decodePaymentEvent` reports what the
 * chain actually recorded. Reporting success when the two disagree shows
 * "Payment confirmed ✓" for a payment that escrowed a different amount or landed
 * under a different order id, buyer or token.
 *
 * Every comparison is made on the decoded string form of the value: the receipt
 * carries the raw i128 as a decimal string, so it is compared against
 * `amountRaw.toString()` rather than against the bigint itself.
 */
function assertReceiptMatchesRequest(
  receipt: PaymentReceipt | null,
  expected: { orderId: string; buyer: string; token: string; amountRaw: bigint }
): PaymentReceipt {
  if (!receipt) {
    throw new WalletError(
      "The transaction succeeded but contained no payment event from this checkout contract. " +
        "The payment could not be confirmed.",
      "PAYMENT_NOT_CONFIRMED"
    );
  }

  const mismatches: string[] = [];
  if (receipt.orderId !== expected.orderId) mismatches.push("order id");
  if (receipt.buyer !== expected.buyer) mismatches.push("buyer");
  if (receipt.token !== expected.token) mismatches.push("token");
  if (receipt.amount !== expected.amountRaw.toString()) mismatches.push("amount");

  if (mismatches.length > 0) {
    throw new WalletError(
      `Payment confirmation did not match the request (${mismatches.join(", ")}). ` +
        "The escrowed payment was not the payment that was requested, so it is not confirmed. " +
        `Expected order ${expected.orderId} for ${expected.amountRaw.toString()} raw units.`,
      "PAYMENT_MISMATCH"
    );
  }

  return receipt;
}

/**
 * Main flow: connect wallet -> readiness checks -> simulate -> prepare ->
 * sign -> submit -> wait -> decode event.
 */
export async function payWithStellar(options: PayOptions): Promise<PayResult> {
  const { amountUsd, orderId, publicKey, onStatus = status } = options;
  const token = options.token ?? defaultToken();

  if (!CHECKOUT_CONTRACT_ID) {
    throw new WalletError(
      "Checkout contract is not configured. Set NEXT_PUBLIC_CHECKOUT_CONTRACT_ID in .env.local.",
      "CONTRACT_NOT_CONFIGURED"
    );
  }

  let effectiveTokenAmount: number;
  let usdPerXlm: number | undefined;
  if (token.isNative) {
    const rate = resolveXlmUsdRate(options.xlmUsdPrice);
    if (!rate) throw new XlmRateUnavailableError();
    usdPerXlm = rate.usdPerXlm;
    effectiveTokenAmount = options.tokenAmount ?? amountUsd / rate.usdPerXlm;
  } else {
    effectiveTokenAmount = options.tokenAmount ?? amountUsd;
  }
  const amountRaw = usdToRawUnits(effectiveTokenAmount);
  const orderBytes = await hashOrderId(orderId);

  // 1. Network guard.
  onStatus("Checking Freighter network...");
  await ensureNetwork();

  const server = new rpc.Server(RPC_URL);

  // 2. Account readiness: funded, trustline present, balance sufficient.
  onStatus("Checking account readiness...");
  const readiness = await assertPaymentReady(server, publicKey, {
    token,
    requiredRaw: amountRaw,
    strict: true,
  });

  // 3. Build the invocation.
  onStatus("Building payment transaction...");
  const args = [
    addressToScVal(token.contractId),
    addressToScVal(publicKey),
    bytes32ToScVal(orderBytes),
    i128ToScVal(amountRaw),
  ];
  const tx = buildInvocationTransaction(readiness.account!, CHECKOUT_CONTRACT_ID, "pay", args);

  // 4. Pre-flight simulation (surfaces errors early) + prepare.
  onStatus("Simulating transaction...");
  const { tx: prepared, report } = await prepareAndReport(server, tx);
  if (!report.ok || !readiness.account) {
    throw new WalletError(
      `Transaction simulation failed: ${report.error?.message ?? "unknown error"}`,
      "TX_SIMULATION_ERROR"
    );
  }
  const fee = await budgetFee(server, report);
  onStatus(
    `Estimated fee: ${report.minResourceFee?.toString() ?? "?"} stroops resource + ${fee} stroops total`
  );

  // 5. Sign with Freighter.
  onStatus("Waiting for Freighter signature…");
  const signedXdr = await signWithFreighter(prepared.toXDR(), publicKey);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // 6. Submit.
  onStatus("Submitting transaction…");
  const sendResponse = await server.sendTransaction(signedTx);

  if (sendResponse.status === "ERROR") {
    throw new WalletError(
      `Transaction rejected: ${sendResponse.errorResult?.toXDR("base64") ?? "unknown error"}`,
      "TX_SEND_ERROR"
    );
  }
  if (sendResponse.status === "TRY_AGAIN_LATER") {
    throw new WalletError(
      "Transaction was not accepted by the network (submission congestion or fee too low). Please retry the payment.",
      "TX_TRY_AGAIN_LATER"
    );
  }
  if (sendResponse.status === "PENDING" || sendResponse.status === "DUPLICATE") {
    onStatus("Confirming transaction…");
  }

  // 7. Wait for the final state, decode the payment event, and confirm it
  //    against the request. The request describes what the buyer asked to pay;
  //    only the decoded event describes what the chain recorded.
  const txResult = await waitForTransaction(sendResponse.hash);
  const receipt = assertReceiptMatchesRequest(decodePaymentEvent(txResult), {
    orderId: bytesToHex(orderBytes),
    buyer: publicKey,
    token: token.contractId,
    amountRaw,
  });

  // 8. Report the escrowed figures from the receipt, never the requested ones.
  const escrowedRaw = BigInt(receipt.amount ?? "0");
  const escrowedTokenAmount = Number(escrowedRaw) / 10 ** (token.decimals ?? USDC_DECIMALS);
  const escrowedUsd = token.isNative
    ? escrowedTokenAmount * (usdPerXlm ?? 0)
    : escrowedTokenAmount;

  return {
    hash: sendResponse.hash,
    status: txResult.status,
    receipt,
    amountUsd: escrowedUsd,
    tokenAmount: escrowedTokenAmount,
    tokenSymbol: token.symbol,
    amountRaw: escrowedRaw,
    simulation: {
      minResourceFeeStroops: report.minResourceFee?.toString() ?? "0",
      recommendedInclusionFeeStroops: fee,
      instructions: report.instructions ?? 0,
    },
  };
}
