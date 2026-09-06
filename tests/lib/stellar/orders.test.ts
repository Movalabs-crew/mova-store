import { describe, expect, it } from "vitest";
import { mergeOrderEvent, OrderEvent } from "../../../lib/stellar/orders";

describe("mergeOrderEvent", () => {
  it("merges a dispatch event over an existing Paid row, keeping buyer and tokenSymbol, while updating status to Shipped", () => {
    const existingRow: OrderEvent = {
      orderId: "order_123",
      buyer: "buyer_addr_abc",
      amount: "100.00",
      amountRaw: 1000000000n,
      token: "token_addr_xyz",
      tokenSymbol: "USDC",
      status: "Paid",
      timestamp: 100000,
      ledger: 100,
      txHash: "tx_abc",
    };

    const dispatchEvent: OrderEvent = {
      orderId: "order_123",
      buyer: "merchant_addr", // the dispatch event derived from topic2 might incorrectly have the merchant as buyer
      amount: "0.00",
      amountRaw: 0n,
      token: "",
      tokenSymbol: "TOKEN",
      status: "Shipped",
      timestamp: 100050,
      ledger: 101,
      txHash: "tx_def",
    };

    const merged = mergeOrderEvent(existingRow, dispatchEvent);

    // Lifecycle fields are carried forward
    expect(merged.status).toBe("Shipped");
    expect(merged.ledger).toBe(101);
    expect(merged.txHash).toBe("tx_def");
    expect(merged.timestamp).toBe(100050);

    // Original payment properties are preserved
    expect(merged.buyer).toBe("buyer_addr_abc");
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.token).toBe("token_addr_xyz");
    expect(merged.amount).toBe("100.00");
    expect(merged.amountRaw).toBe(1000000000n);
  });
});
