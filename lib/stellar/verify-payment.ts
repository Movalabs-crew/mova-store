import { rpc } from "@stellar/stellar-sdk";

import { RPC_URL } from "./config";
import { decodePaymentEvent } from "./events";
import { readOrder, type OrderDetails } from "./orders";
import { bytesToHex, resolveOrderIdHash } from "./scval";

// ---------------------------------------------------------------------------
// On-chain payment verification.
//
// The browser can claim anything about a payment; only the chain can prove it.
// This helper is the single place that decides whether an order the client
// wants recorded is backed by a real, successful payment to the checkout
// contract for that order id. `/api/orders` records nothing unless this returns
// `verified: true`.
// ---------------------------------------------------------------------------

export interface PaymentVerificationInput {
  /** Human order id ("SS-...") or an already-hashed 64-hex order id. */
  orderId: string;
  /** Hash of the transaction the client says paid for the order. */
  txHash?: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  /** Machine-readable reason when `verified` is false. */
  reason?:
    | "missing_order_id"
    | "missing_tx_hash"
    | "transaction_lookup_failed"
    | "transaction_not_successful"
    | "no_payment_event"
    | "order_id_mismatch"
    | "order_not_found_on_chain"
    | "order_not_paid";
  /** The on-chain order record, present only when `verified` is true. */
  order?: OrderDetails;
  orderIdHash?: string;
  ledger?: number;
}

function reject(reason: PaymentVerificationResult["reason"]): PaymentVerificationResult {
  return { verified: false, reason };
}

/**
 * Verify that `txHash` is a successful transaction that emitted the checkout
 * contract's `pay` event for `orderId`, and that the contract's order record
 * confirms it is paid.
 *
 * `server` is injectable so callers (and tests) can supply an RPC client
 * without a network round trip.
 */
export async function verifyOnChainPayment(
  input: PaymentVerificationInput,
  server: rpc.Server = new rpc.Server(RPC_URL)
): Promise<PaymentVerificationResult> {
  const orderId = (input.orderId ?? "").trim();
  const txHash = (input.txHash ?? "").trim();
  if (!orderId) return reject("missing_order_id");
  if (!txHash) return reject("missing_tx_hash");

  const orderIdHash = bytesToHex(await resolveOrderIdHash(orderId));

  // 1. The transaction must exist and have succeeded.
  let tx: rpc.Api.GetTransactionResponse;
  try {
    tx = await server.getTransaction(txHash);
  } catch {
    return reject("transaction_lookup_failed");
  }
  if (tx.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    return reject("transaction_not_successful");
  }

  // 2. That transaction must carry a `pay` event for *this* order id, so a
  //    successful but unrelated transaction cannot stand in for a payment.
  const receipt = decodePaymentEvent(tx);
  if (!receipt) return reject("no_payment_event");
  if (receipt.orderId !== orderIdHash) return reject("order_id_mismatch");

  // 3. The contract's own order state must exist and be paid.
  const order = await readOrder(orderId);
  if (!order) return reject("order_not_found_on_chain");
  if (order.status === "Unknown" || order.status === "Pending") {
    return reject("order_not_paid");
  }

  return { verified: true, order, orderIdHash, ledger: tx.ledger };
}
