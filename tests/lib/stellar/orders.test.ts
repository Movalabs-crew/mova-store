import { describe, it, expect } from "vitest";
import { mergeOrderEvent, OrderEvent } from "../../../lib/stellar/orders";

describe("mergeOrderEvent", () => {
  const existingPaidOrder: OrderEvent = {
    orderId: "order_1234567890abcdef",
    buyer: "GBUYER_ORIGINAL_STELLAR_KEY_123",
    amount: "100.00",
    amountRaw: BigInt(1000000000),
    token: "C_USDC_CONTRACT_ADDRESS",
    tokenSymbol: "USDC",
    status: "Paid",
    timestamp: 1690000000000,
    ledger: 1000,
    txHash: "tx_pay_hash_123",
  };

  it("merges a dispatch event over an existing Paid row, keeping buyer, token, and amount while updating status, ledger, and txHash", () => {
    const incomingDispatchEvent: OrderEvent = {
      orderId: "order_1234567890abcdef",
      buyer: "GMERCHANT_KEY_TOPIC2", // dispatch topic2 is merchant address
      amount: "0.00",
      amountRaw: BigInt(0),
      token: "",
      tokenSymbol: "TOKEN",
      status: "Shipped",
      timestamp: 1690000050000,
      ledger: 1050,
      txHash: "tx_dispatch_hash_456",
    };

    const merged = mergeOrderEvent(existingPaidOrder, incomingDispatchEvent);

    expect(merged.orderId).toBe("order_1234567890abcdef");
    expect(merged.status).toBe("Shipped");
    expect(merged.ledger).toBe(1050);
    expect(merged.txHash).toBe("tx_dispatch_hash_456");

    // Preserved fields from existing order
    expect(merged.buyer).toBe("GBUYER_ORIGINAL_STELLAR_KEY_123");
    expect(merged.token).toBe("C_USDC_CONTRACT_ADDRESS");
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("100.00");
    expect(merged.amountRaw).toBe(BigInt(1000000000));
  });

  it("merges a refund event over an existing Paid row, keeping buyer, token, and amount while updating status to Refunded", () => {
    const incomingRefundEvent: OrderEvent = {
      orderId: "order_1234567890abcdef",
      buyer: "GMERCHANT_KEY_TOPIC2",
      amount: "0.00",
      amountRaw: BigInt(0),
      token: "",
      tokenSymbol: "TOKEN",
      status: "Refunded",
      timestamp: 1690000060000,
      ledger: 1060,
      txHash: "tx_refund_hash_789",
    };

    const merged = mergeOrderEvent(existingPaidOrder, incomingRefundEvent);

    expect(merged.orderId).toBe("order_1234567890abcdef");
    expect(merged.status).toBe("Refunded");
    expect(merged.ledger).toBe(1060);
    expect(merged.txHash).toBe("tx_refund_hash_789");
    expect(merged.buyer).toBe("GBUYER_ORIGINAL_STELLAR_KEY_123");
    expect(merged.token).toBe("C_USDC_CONTRACT_ADDRESS");
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("100.00");
  });

  it("does not overwrite with older ledgers if incoming event is older than existing", () => {
    const olderEvent: OrderEvent = {
      orderId: "order_1234567890abcdef",
      buyer: "GOTHER",
      amount: "50.00",
      amountRaw: BigInt(500000000),
      token: "C_XLM",
      tokenSymbol: "XLM",
      status: "Pending",
      timestamp: 1680000000000,
      ledger: 900,
      txHash: "tx_old_hash",
    };

    const merged = mergeOrderEvent(existingPaidOrder, olderEvent);
    expect(merged).toEqual(existingPaidOrder);
  });
});
