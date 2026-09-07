import { describe, it, expect } from "vitest";
import {
  mergeOrderEvent,
  mergeOrderEvents,
  OrderEvent,
} from "../../../lib/stellar/orders";

function createMockOrder(overrides: Partial<OrderEvent> = {}): OrderEvent {
  return {
    orderId: "order_1234567890abcdef",
    buyer: "GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
    amount: "45.00",
    amountRaw: BigInt(450000000),
    token: "CUSDC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD",
    tokenSymbol: "USDC",
    status: "Paid",
    timestamp: 1700000000000,
    ledger: 1000,
    txHash: "txhash_pay_1234567890abcdef",
    ...overrides,
  };
}

describe("mergeOrderEvent", () => {
  it("merges a dispatch event over an existing Paid row: keeps buyer and tokenSymbol, and updates status to Shipped", () => {
    const existing = createMockOrder({
      status: "Paid",
      ledger: 1000,
      txHash: "tx_pay_1",
    });

    // Dispatch events derive buyer from topic2 (merchant) and lack amount/token details
    const dispatchIncoming: OrderEvent = {
      orderId: "order_1234567890abcdef",
      buyer: "GMERCHANT1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890AB",
      amount: "0.00",
      amountRaw: BigInt(0),
      token: "",
      tokenSymbol: "TOKEN",
      status: "Shipped",
      timestamp: 1700000050000,
      ledger: 1005,
      txHash: "tx_dispatch_2",
    };

    const merged = mergeOrderEvent(existing, dispatchIncoming);

    // Lifecycle fields are carried forward from the newer dispatch event
    expect(merged.status).toBe("Shipped");
    expect(merged.ledger).toBe(1005);
    expect(merged.txHash).toBe("tx_dispatch_2");
    expect(merged.timestamp).toBe(1700000050000);

    // Payment and identity fields are strictly preserved from the original Paid row
    expect(merged.buyer).toBe("GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD");
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.token).toBe("CUSDC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD");
    expect(merged.amount).toBe("45.00");
    expect(merged.amountRaw).toBe(BigInt(450000000));
    expect(merged.orderId).toBe("order_1234567890abcdef");
  });

  it("merges a refund event over an existing Paid row: preserves buyer and token and updates status to Refunded", () => {
    const existing = createMockOrder({
      status: "Paid",
      ledger: 2000,
      txHash: "tx_pay_refund_test",
    });

    const refundIncoming: OrderEvent = {
      orderId: "order_1234567890abcdef",
      buyer: "GMERCHANT1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890AB",
      amount: "0.00",
      amountRaw: BigInt(0),
      token: "",
      tokenSymbol: "TOKEN",
      status: "Refunded",
      timestamp: 1700000090000,
      ledger: 2010,
      txHash: "tx_refund_event",
    };

    const merged = mergeOrderEvent(existing, refundIncoming);

    expect(merged.status).toBe("Refunded");
    expect(merged.ledger).toBe(2010);
    expect(merged.txHash).toBe("tx_refund_event");
    expect(merged.timestamp).toBe(1700000090000);

    expect(merged.buyer).toBe(existing.buyer);
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("45.00");
    expect(merged.amountRaw).toBe(BigInt(450000000));
  });

  it("is a pure function that does not mutate either input and returns a new object", () => {
    const existing = createMockOrder();
    const incoming: OrderEvent = {
      orderId: existing.orderId,
      buyer: "GMERCHANT",
      amount: "0.00",
      amountRaw: BigInt(0),
      token: "",
      tokenSymbol: "TOKEN",
      status: "Shipped",
      timestamp: 1700000010000,
      ledger: 1001,
      txHash: "tx_new",
    };

    const merged = mergeOrderEvent(existing, incoming);

    expect(merged).not.toBe(existing);
    expect(merged).not.toBe(incoming);
    expect(existing.status).toBe("Paid");
    expect(existing.ledger).toBe(1000);
    expect(incoming.status).toBe("Shipped");
  });

  it("exports mergeOrderEvents alias that functions identically", () => {
    expect(mergeOrderEvents).toBe(mergeOrderEvent);
  });
});
