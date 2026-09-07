import { describe, it, expect } from "vitest";
import {
  mergeOrderEvent,
  OrderEvent,
} from "../../../lib/stellar/orders";

function makeOrder(overrides: Partial<OrderEvent> = {}): OrderEvent {
  return {
    orderId: "a".repeat(64),
    buyer: "GTESTBUYERBUYERBUYERBUYERBUYERBUYERBUYERBUYERBUYERBUYERB",
    amount: "10.00",
    amountRaw: 10000000n,
    token: "CUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDCUSDC",
    tokenSymbol: "USDC",
    status: "Paid",
    timestamp: 1700000000000,
    ledger: 100,
    txHash: "b".repeat(64),
    ...overrides,
  };
}

describe("mergeOrderEvent", () => {
  it("carries forward only lifecycle fields when a dispatch event merges over a Paid row", () => {
    const existing = makeOrder({
      status: "Paid",
      ledger: 100,
      txHash: "b".repeat(64),
    });
    // dispatch topics are [order_id, merchant], so the event-derived buyer
    // is the merchant and the token may fall back to the unknown symbol.
    const incoming = makeOrder({
      status: "Shipped",
      buyer: "GMERCHANTMERCHANTMERCHANTMERCHANTMERCHANTMERCHANTMERCHANTM",
      tokenSymbol: "TOKEN",
      amount: "0.00",
      amountRaw: 0n,
      ledger: 110,
      txHash: "c".repeat(64),
    });

    const merged = mergeOrderEvent(existing, incoming);

    // lifecycle fields come from the newer event
    expect(merged.status).toBe("Shipped");
    expect(merged.ledger).toBe(110);
    expect(merged.txHash).toBe("c".repeat(64));
    // identity fields from the original pay event are preserved
    expect(merged.buyer).toBe(existing.buyer);
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("10.00");
    expect(merged.amountRaw).toBe(10000000n);
    expect(merged.token).toBe(existing.token);
    expect(merged.orderId).toBe(existing.orderId);
    expect(merged.timestamp).toBe(existing.timestamp);
  });

  it("preserves the original row when a refund event merges over it", () => {
    const existing = makeOrder({ status: "Paid", ledger: 200 });
    const incoming = makeOrder({
      status: "Refunded",
      buyer: "GMERCHANT2",
      ledger: 210,
      txHash: "d".repeat(64),
    });

    const merged = mergeOrderEvent(existing, incoming);

    expect(merged.status).toBe("Refunded");
    expect(merged.buyer).toBe(existing.buyer);
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("10.00");
    expect(merged.ledger).toBe(210);
    expect(merged.txHash).toBe("d".repeat(64));
  });

  it("does not mutate either input and returns a new object", () => {
    const existing = makeOrder();
    const incoming = makeOrder({ status: "Shipped", ledger: 101 });

    const merged = mergeOrderEvent(existing, incoming);

    expect(merged).not.toBe(existing);
    expect(merged).not.toBe(incoming);
    expect(existing.status).toBe("Paid");
    expect(existing.ledger).toBe(100);
    expect(existing.txHash).toBe("b".repeat(64));
    expect(incoming.status).toBe("Shipped");
  });
});
