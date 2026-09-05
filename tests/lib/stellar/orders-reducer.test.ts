import { describe, it, expect } from "vitest";
import { mergeOrderEvents, OrderEvent } from "../../../lib/stellar/orders";

describe("mergeOrderEvents reducer helper", () => {
  const existingPaidOrder: OrderEvent = {
    orderId: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    buyer: "GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    amount: "50.00",
    amountRaw: 50000000n,
    token: "CAS3J7GYLGXMF6TDJBBYYSE3VGSBRUCM5ZLGNELHM44H6P7TVDA22W27",
    tokenSymbol: "USDC",
    status: "Paid",
    timestamp: 1700000000000,
    ledger: 100,
    txHash: "0xinitialpaidtx123",
  };

  it("keeps buyer, token, amount, and tokenSymbol when merging a dispatch event and updates status to Shipped", () => {
    const dispatchEventOrder: OrderEvent = {
      orderId: existingPaidOrder.orderId,
      buyer: "GMERCHANT9876543210ZYXWVUTSRQPONMLKJIHGFEDCBA",
      amount: "0",
      amountRaw: 0n,
      token: "",
      tokenSymbol: "TOKEN",
      status: "Shipped",
      timestamp: 1700000060000,
      ledger: 105,
      txHash: "0xdispatchtx456",
    };

    const merged = mergeOrderEvents(existingPaidOrder, dispatchEventOrder);

    expect(merged.status).toBe("Shipped");
    expect(merged.ledger).toBe(105);
    expect(merged.txHash).toBe("0xdispatchtx456");
    expect(merged.timestamp).toBe(1700000060000);

    expect(merged.buyer).toBe("GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    expect(merged.token).toBe("CAS3J7GYLGXMF6TDJBBYYSE3VGSBRUCM5ZLGNELHM44H6P7TVDA22W27");
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("50.00");
    expect(merged.amountRaw).toBe(50000000n);
  });

  it("keeps buyer and token details when merging a refund event and updates status to Refunded", () => {
    const refundEventOrder: OrderEvent = {
      orderId: existingPaidOrder.orderId,
      buyer: "GMERCHANT9876543210ZYXWVUTSRQPONMLKJIHGFEDCBA",
      amount: "0",
      amountRaw: 0n,
      token: "",
      tokenSymbol: "TOKEN",
      status: "Refunded",
      timestamp: 1700000080000,
      ledger: 110,
      txHash: "0xrefundtx789",
    };

    const merged = mergeOrderEvents(existingPaidOrder, refundEventOrder);

    expect(merged.status).toBe("Refunded");
    expect(merged.ledger).toBe(110);
    expect(merged.txHash).toBe("0xrefundtx789");
    expect(merged.buyer).toBe(existingPaidOrder.buyer);
    expect(merged.tokenSymbol).toBe("USDC");
    expect(merged.amount).toBe("50.00");
  });

  it("ignores older events with lower ledger numbers", () => {
    const staleEvent: OrderEvent = {
      ...existingPaidOrder,
      ledger: 95,
      status: "Pending",
      txHash: "0xoldtx000",
    };

    const merged = mergeOrderEvents(existingPaidOrder, staleEvent);

    expect(merged).toEqual(existingPaidOrder);
    expect(merged.status).toBe("Paid");
    expect(merged.ledger).toBe(100);
  });
});
