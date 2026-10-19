import { beforeEach, describe, expect, it, vi } from "vitest";
import { rpc } from "@stellar/stellar-sdk";

import { bytesToHex, resolveOrderIdHash } from "../../../lib/stellar/scval";

// The Stellar/RPC dependencies are mocked: these tests never make a network
// call. `readOrder` (contract state) and `decodePaymentEvent` (transaction
// events) are the two chain reads the verifier depends on.
const readOrder = vi.hoisted(() => vi.fn());
const decodePaymentEvent = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/stellar/orders", () => ({ readOrder }));
vi.mock("../../../lib/stellar/events", () => ({ decodePaymentEvent }));

import { verifyOnChainPayment } from "../../../lib/stellar/verify-payment";

const ORDER_ID = "SS-VERIFY-1";

function serverWith(tx: unknown) {
  return { getTransaction: vi.fn().mockResolvedValue(tx) } as unknown as rpc.Server;
}

const SUCCESS_TX = {
  status: rpc.Api.GetTransactionStatus.SUCCESS,
  ledger: 4242,
  txHash: "abc123",
};

describe("verifyOnChainPayment (Issue #491)", () => {
  let orderHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    orderHash = bytesToHex(await resolveOrderIdHash(ORDER_ID));
  });

  it("rejects an order with no transaction hash", async () => {
    const result = await verifyOnChainPayment({ orderId: ORDER_ID }, serverWith(SUCCESS_TX));
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("missing_tx_hash");
  });

  it("rejects a request with no order id", async () => {
    const result = await verifyOnChainPayment({ orderId: "", txHash: "abc" });
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("missing_order_id");
  });

  it("rejects a transaction that is not successful", async () => {
    const result = await verifyOnChainPayment(
      { orderId: ORDER_ID, txHash: "abc123" },
      serverWith({ status: rpc.Api.GetTransactionStatus.NOT_FOUND })
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("transaction_not_successful");
  });

  it("rejects a successful transaction that carries no checkout payment event", async () => {
    decodePaymentEvent.mockReturnValueOnce(null);
    const result = await verifyOnChainPayment(
      { orderId: ORDER_ID, txHash: "abc123" },
      serverWith(SUCCESS_TX)
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("no_payment_event");
  });

  it("rejects a payment event that pays a different order id", async () => {
    decodePaymentEvent.mockReturnValueOnce({
      orderId: "f".repeat(64),
      amount: "100",
      buyer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });
    const result = await verifyOnChainPayment(
      { orderId: ORDER_ID, txHash: "abc123" },
      serverWith(SUCCESS_TX)
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("order_id_mismatch");
  });

  it("rejects when the contract has no record of the order", async () => {
    decodePaymentEvent.mockReturnValueOnce({ orderId: orderHash, amount: "100" });
    readOrder.mockResolvedValueOnce(null);
    const result = await verifyOnChainPayment(
      { orderId: ORDER_ID, txHash: "abc123" },
      serverWith(SUCCESS_TX)
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("order_not_found_on_chain");
  });

  it("rejects an order that is not paid", async () => {
    decodePaymentEvent.mockReturnValueOnce({ orderId: orderHash, amount: "100" });
    readOrder.mockResolvedValueOnce({ orderId: ORDER_ID, status: "Pending" });
    const result = await verifyOnChainPayment(
      { orderId: ORDER_ID, txHash: "abc123" },
      serverWith(SUCCESS_TX)
    );
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("order_not_paid");
  });

  it("verifies a paid order backed by a matching payment event", async () => {
    decodePaymentEvent.mockReturnValueOnce({
      orderId: orderHash,
      amount: "100",
      buyer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });
    readOrder.mockResolvedValueOnce({
      orderId: ORDER_ID,
      status: "Paid",
      buyer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });

    const result = await verifyOnChainPayment(
      { orderId: ORDER_ID, txHash: "abc123" },
      serverWith(SUCCESS_TX)
    );

    expect(result.verified).toBe(true);
    expect(result.orderIdHash).toBe(orderHash);
    expect(result.ledger).toBe(4242);
    expect(result.order).toMatchObject({ orderId: ORDER_ID, status: "Paid" });
  });
});
