import { rpc, StrKey, xdr } from "@stellar/stellar-sdk";

import { CHECKOUT_CONTRACT_ID, RPC_URL, TX_TIMEOUT_SECONDS, TX_POLL_INTERVAL_MS } from "./config";
import { scValToString } from "./scval";

// ---------------------------------------------------------------------------
// Payment event decoding.
//
// The checkout contract emits (via #[contractevent]):
//   topics: [Symbol("pay"), token, buyer, merchant, order_id]
//   data:   { amount: i128 }
// ---------------------------------------------------------------------------

export interface PaymentReceipt {
  contractId?: string;
  token?: string;
  buyer?: string;
  merchant?: string;
  orderId?: string; // hex; undefined when the event does not carry a resolvable id
  amount?: string; // raw token units as decimal string
  txHash: string;
  ledger: number;
}

/**
 * Poll `getTransaction` until the tx reaches a final state.
 * Resolves with the successful transaction; throws on FAILED.
 */
export async function waitForTransaction(
  hash: string
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const server = new rpc.Server(RPC_URL);
  const deadline = Date.now() + TX_TIMEOUT_SECONDS * 1000;
  let last: rpc.Api.GetTransactionResponse | null = null;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      last = await server.getTransaction(hash);
      lastError = null;
    } catch (err) {
      lastError = err;
      await sleep(TX_POLL_INTERVAL_MS);
      continue;
    }
    if (last.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return last;
    }
    if (last.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction failed on ledger ${last.ledger} (hash: ${hash}). ` +
          "See StellarExpert for details."
      );
    }
    await sleep(TX_POLL_INTERVAL_MS);
  }

  if (lastError) {
    throw new Error(
      `Transaction did not reach a final state within ${TX_TIMEOUT_SECONDS}s ` +
        `(hash: ${hash}). Last RPC error: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`
    );
  }
  throw new Error(
    `Transaction did not reach a final state within ${TX_TIMEOUT_SECONDS}s ` +
      `(hash: ${hash}). Check its status on StellarExpert.`
  );
}

/**
 * Find the `PaymentReceived` event emitted by the checkout contract inside a
 * successful transaction's contract events.
 */
export function decodePaymentEvent(
  tx: rpc.Api.GetSuccessfulTransactionResponse
): PaymentReceipt | null {
  const contractEvents: xdr.ContractEvent[] = tx.events?.contractEventsXdr?.flat() ?? [];
  for (const event of contractEvents) {
    let v0: xdr.ContractEventV0;
    try {
      v0 = event.body.v0;
    } catch {
      continue;
    }
    const topics = v0.topics;
    if (!topics || topics.length < 1) continue;
    const first = topics[0];
    if (first.type !== "scvSymbol") continue;
    if (first.sym.toString() !== "pay") continue;

    let eventContractId: string | undefined;
    try {
      const contractId = event.contractId;
      if (contractId) {
        // ContractId is a BytesValue wrapper in SDK 17, not a raw Buffer.
        eventContractId = StrKey.encodeContract(contractId.toBytes());
      }
    } catch {
      // system events have no contract id
    }

    // When a checkout contract id is configured, only accept events emitted by it
    if (CHECKOUT_CONTRACT_ID && eventContractId && eventContractId !== CHECKOUT_CONTRACT_ID) {
      continue;
    }

    const data = v0.data;
    const receipt: PaymentReceipt = {
      txHash: tx.txHash,
      ledger: tx.ledger,
      contractId: eventContractId,
    };

    // topics[1..] = [token, buyer, merchant, order_id]
    for (let i = 1; i < topics.length; i++) {
      const str = scValToString(topics[i]);
      switch (i) {
        case 1:
          receipt.token = str;
          break;
        case 2:
          receipt.buyer = str;
          break;
        case 3:
          receipt.merchant = str;
          break;
        case 4:
          receipt.orderId = str;
          break;
      }
    }
    // Fail loudly rather than fabricate identity: an event without an explicit
    // order id must not silently fall back to the token contract address.
    if (!receipt.orderId) {
      return null;
    }
    // data = Map { "amount": i128 }
    if (data.type === "scvMap") {
      const entries = data.map;
      for (const entry of entries ?? []) {
        if (entry.key.type === "scvSymbol") {
          const key = entry.key.sym.toString();
          if (key === "amount") {
            receipt.amount = scValToString(entry.val);
          }
        }
      }
    } else {
      receipt.amount = scValToString(data);
    }
    return receipt;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
