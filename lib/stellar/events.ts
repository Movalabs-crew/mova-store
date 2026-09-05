import { rpc, StrKey, xdr } from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  RPC_URL,
  TX_TIMEOUT_SECONDS,
  TX_POLL_INTERVAL_MS,
} from "./config";
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
  orderId?: string; // hex
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

  while (Date.now() < deadline) {
    last = await server.getTransaction(hash);
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
  const contractEvents: xdr.ContractEvent[] =
    tx.events?.contractEventsXdr?.flat() ?? [];
  for (const event of contractEvents) {
    let v0: xdr.ContractEventV0;
    try {
      v0 = event.body().v0();
    } catch {
      continue;
    }
    const topics = v0.topics();
    if (!topics || topics.length < 1) continue;
    const first = topics[0];
    if (first.switch() !== xdr.ScValType.scvSymbol()) continue;
    if (first.sym().toString() !== "pay") continue;

    let eventContractId: string | undefined;
    try {
      if (event.contractId()) {
        -        StrKey.encodeContract(
-          Buffer.from(event.contractId() as unknown as Uint8Array)
-        )
+        StrKey.encodeContract(event.contractId() as unknown as Uint8Array)
      }
    } catch {
      // system events have no contract id
    }

    // When a checkout contract id is configured, only accept events emitted by it
    if (CHECKOUT_CONTRACT_ID && eventContractId && eventContractId !== CHECKOUT_CONTRACT_ID) {
      continue;
    }

    const data = v0.data();
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
    // data = Map { "amount": i128 }
    if (data.switch() === xdr.ScValType.scvMap()) {
      const entries = data.map();
      for (const entry of entries ?? []) {
        if (entry.key().switch() === xdr.ScValType.scvSymbol()) {
          const key = entry.key().sym().toString();
          if (key === "amount") {
            receipt.amount = scValToString(entry.val());
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
