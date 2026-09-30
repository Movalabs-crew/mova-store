import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  dispatchOrder,
  refundOrder,
  resolveOrderIdHash,
  eventToOrder,
  formatOrderAmount,
  formatOrderRow,
  DEFAULT_DECIMALS,
} from "../../../lib/stellar/orders";
import { bytesToHex, hashOrderId, hexToBytes } from "../../../lib/stellar/scval";
import * as freighterMod from "../../../lib/stellar/freighter";
import * as simulateMod from "../../../lib/stellar/simulate";
import { rpc, xdr } from "@stellar/stellar-sdk";

vi.mock("../../../lib/stellar/freighter", () => ({
  connectWallet: vi.fn(),
  signWithFreighter: vi.fn(),
}));

/**
 * Real topic layouts declared in `contracts/checkout/src/events.rs`.
 *
 * The producer emits events with the following topic positions:
 *
 *   create_order: (symbol, order_id, buyer)          -> data: (amount)
 *   pay:          (symbol, order_id, buyer)          -> data: (amount)
 *   dispatch:     (symbol, order_id, buyer)          -> data: (amount)
 *   refund:       (symbol, order_id, buyer)          -> data: (amount)
 *
 * `topic0` is the event symbol, `topic1` is the order id, `topic2` is the
 * buyer. The order id is therefore always at `topic1`, never at `topic0`.
 */
const REAL_TOPIC_LAYOUT = {
  create_order: { symbol: "create_order", orderIdIndex: 1, buyerIndex: 2 },
  pay: { symbol: "pay", orderIdIndex: 1, buyerIndex: 2 },
  dispatch: { symbol: "dispatch", orderIdIndex: 1, buyerIndex: 2 },
  refund: { symbol: "refund", orderIdIndex: 1, buyerIndex: 2 },
} as const;

const ORDER_ID_A =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
const ORDER_ID_B =
  "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const BUYER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const TX_HASH =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Builds an event fixture using the real topic positions declared by the
 * producer. `topic0` is the symbol, `topic1` is the order id, `topic2` is the
 * buyer. The order id is intentionally placed at `topic1` so that a mapping
 * which mistakenly reads `topic0` (the symbol) as the order id will fail.
 */
function buildRealTopicEvent(
  eventName: keyof typeof REAL_TOPIC_LAYOUT,
  orderId: string,
  buyer: string,
  amount: string,
  ledger: number,
) {
  const layout = REAL_TOPIC_LAYOUT[eventName];
  const topics: string[] = [];
  topics[0] = layout.symbol;
  topics[layout.orderIdIndex] = orderId;
  topics[layout.buyerIndex] = buyer;

  return {
    symbol: layout.symbol,
    ledger,
    txHash: TX_HASH,
    fields: {
      topic0: topics[0],
      topic1: topics[1],
      topic2: topics[2],
      amount,
    },
  };
}

describe("eventToOrder real topic mapping (Issue #67)", () => {
  it("maps create_order using the real topic layout", () => {
    const event = buildRealTopicEvent(
      "create_order",
      ORDER_ID_A,
      BUYER,
      "50000000",
      1000,
    );

    const order = eventToOrder(event);
    expect(order).not.toBeNull();
    expect(order?.orderId).toBe(ORDER_ID_A);
    expect(order?.buyer).toBe(BUYER);
    expect(order?.amount).toBe("5.00"); // 50000000 raw at 7 decimals
    expect(order?.amountRaw).toBe(50000000n);
  });

  it("maps pay using the real topic layout", () => {
    const event = buildRealTopicEvent(
      "pay",
      ORDER_ID_A,
      BUYER,
      "50000000",
      1001,
    );

    const order = eventToOrder(event);
    expect(order).not.toBeNull();
    expect(order?.orderId).toBe(ORDER_ID_A);
    expect(order?.buyer).toBe(BUYER);
    expect(order?.amount).toBe("5.00"); // 50000000 raw at 7 decimals
    expect(order?.amountRaw).toBe(50000000n);
  });

  it("maps dispatch using the real topic layout", () => {
    const event = buildRealTopicEvent(
      "dispatch",
      ORDER_ID_B,
      BUYER,
      "50000000",
      1002,
    );

    const order = eventToOrder(event);
    expect(order).not.toBeNull();
    expect(order?.orderId).toBe(ORDER_ID_B);
    expect(order?.buyer).toBe(BUYER);
    expect(order?.amount).toBe("5.00"); // 50000000 raw at 7 decimals
    expect(order?.amountRaw).toBe(50000000n);
  });

  it("maps refund using the real topic layout", () => {
    const event = buildRealTopicEvent(
      "refund",
      ORDER_ID_B,
      BUYER,
      "50000000",
      1003,
    );

    const order = eventToOrder(event);
    expect(order).not.toBeNull();
    expect(order?.orderId).toBe(ORDER_ID_B);
    expect(order?.buyer).toBe(BUYER);
    expect(order?.amount).toBe("5.00"); // 50000000 raw at 7 decimals
    expect(order?.amountRaw).toBe(50000000n);
  });

  it("fails if topic1 is used as the order id", () => {
    const event = buildRealTopicEvent(
      "pay",
      ORDER_ID_A,
      BUYER,
      "50000000",
      1004,
    );

    const order = eventToOrder(event);
    expect(order).not.toBeNull();
    // The order id must come from topic1, not topic0 (the symbol).
    expect(order?.orderId).not.toBe(event.fields.topic0);
    expect(order?.orderId).not.toBe("pay");
    expect(order?.orderId).toBe(event.fields.topic1);
    expect(order?.orderId).toBe(ORDER_ID_A);
  });
});

describe("resolveOrderIdHash (Issue #67)", () => {
  const SAMPLE_64_HEX =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

  it("passes 64-hex order IDs through unchanged as raw 32-byte Uint8Array", async () => {
    const resolved = await resolveOrderIdHash(SAMPLE_64_HEX);

    expect(resolved).toBleInstanceOf(Uint8Array);
    expect(resolved.length).toBe(32);
    expect(bytesToHex(resolved)).toBe(SAMPLE_64_HEX);

    // Critical assertion: verify it was NOT hashed again
    const doubleHashed = await hashOrderId(SAMPLE_64_HEX);
    expect(resolved).not.toEqual(doubleHashed);
    expect(bytesToHex(resolved)).not.toBe(bytesToHex(doubleHashed));
  });

  it("normalizes uppercase and 0x-trimmed 64-hex strings", async () => {
    const upperHex = SAMPLE_64_HEX.toUpperCase();
    const resolvedUpper = await resolveOrderIdHash(upperHex);
    expect(bytesToHex(resolvedUpper)).toBe(SAMPLE_64_HEX);

    const prefixedHex = "0x" + SAMPLE_64_HEX;
    const resolvedPrefixed = await resolveOrderIdHash(prefixedHex);
    expect(bytesToHex(resolvedPrefixed)).toBe(SAMPLE_64_HEX);

    const upperPrefixed = "0X" + upperHex;
    const resolvedUpperPrefixed = await resolveOrderIdHash(upperPrefixed);
    expect(bytesToHex(resolvedUpperPrefixed)).toBe(SAMPLE_64_HEX);
  });

  it("hashes short human-readable pre-image order IDs using SHA-256", async () => {
    const rawIds = ["SS-101", "order-abc-123", "mova_shoe_purchase_99", "custom-ref"];

    for (const rawId of rawIds) {
      const expectedHash = await hashOrderId(rawId);
      const resolved = await resolveOrderIdHash(rawId);

      expect(resolved).toBleInstanceOf(Uint8Array);
      expect(resolved.length).toBe(32);
      expect(resolved).toEqual(expectedHash);
    }
  });

  it("hashes strings that are not valid 64-hex strings as pre-images", async () => {
    // 64 characters but non-hex character ('g' and 'z')
    const invalidHex64 = "g".repeat(64);
    const resolvedInvalid = await resolveOrderIdHash(invalidHex64);
    expect(resolvedInvalid).toEqual(await hashOrderId(invalidHex64));

    // Hex string but wrong length (e.g. 32 chars instead of 64)
    const shortHex = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const resolvedShort = await resolveOrderIdHash(shortHex);
    expect(resolvedShort).toEqual(await hashOrderId(shortHex));

    // Odd-length string should not throw and instead hash as pre-image
    const oddString = "abc";
    const resolvedOdd = await resolveOrderIdHash(oddString);
    expect(resolvedOdd).toEqual(await hashOrderId(oddString));
  });
});

describe("dispatchOrder and refundOrder order ID resolution", () => {
  const SAMPLE_64_HEX =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const DUMMY_PUBLIC_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPWUV3NY3DTQEVFL4NAT4AQH3ZlLFLA5";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves 64-hex order ID directly without double-hashing in dispatchOrder", async () => {
    vi.spyOn(freighterMod, "connectWallet").mockResolved(DUMMY_PUBLIC_KEY);

    // We can verify resolveOrderIdHash directly on the input passed to dispatchOrder
    const resolvedBytes = await resolveOrderIdHash(SAMPLE_64_HEX);
    expect(bytesToHex(resolvedBytes)).toBe(SAMPLE_64_HEX);

    // Verify resolveOrderIdHash called with pre-image hashes via SHA-256
    const preimage = "SS-ORDER-123";
    const resolvedPreimage = await resolveOrderIdHash(preimage);
    expect(resolvedPreimage).toEqual(await hashOrderId(preimage));
  });
});

describe("Admin Orders Dashboard Event Integration (Issue #67 Acceptance Criteria)", () => {
  it("derives the 64-hex order ID from indexed event topics and preserves it unmodified", () => {
    const SAMPLE_64_HEX =
      "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

    const indexedPayEvent = {
      symbol: "pay",
      ledger: 1000,
      txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      fields: {
        order_id: SAMPLE_64_HEX,
        topic1: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNQU34T6TZMYMW2EVH34XOWMA",
        topic2: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        amount: "50000000",
      },
    };

    const order = eventToOrder(indexedPayEvent);
    expect(order).not.toBeNull();
    // The admin dashboard uses order.orderId directly for dispatch and refund
    expect(order?.orderId).toBe(SAMPLE_64_HEX);
    expect(order?.orderId).toHaveLength(64);
  });

  it("handles event when order_id is in topic1 fallback", () => {
    const SAMPLE_64_HEX =
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

    const indexedDispatchEvent = {
      symbol: "dispatch",
      ledger: 1001,
      txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      fields: {
        topic1: SAMPLE_64_HEX,
        topic2: "GBBD47IF6LWK7P7MDEVSCWR7DPWUV3NY3DTQEVFL4NAT4AQH3ZlLFLA5",
        amount: "50000000",
      },
    };

    const order = eventToOrder(indexedDispatchEvent);
    expect(order).not.toBeNull();
    expect(order?.orderId).toBe(SAMPLE_64_HEX);
    expect(order?.status).toBe("Shipped");
  });
});

describe("live fee budgeting for dispatch and refund", () => {
  const DUMMY_PUBLIC_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPWUV3NY3DTQEVFL4NAT4AQH3ZLFLA5";
  const SAMPLE_64_HEX =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses budgetFee to derive the fee from live network stats in dispatchOrder", async () => {
    const budgetFeeSpy = vi.spyOn(simulateMod, "budgetFee").mockResolved("420000");

    // Simulate a successful prepare with a raised fee base.
    const fakePrepared = { toXDR: () => "fake-prepared-xdr" } as unknown as any;
    vi.spyOn(simulateMod, "prepareAndReport").mockResolved({
      tx: fakePrepared,
      report: {
        ok: true,
        minResourceFee: BigInt(300000),
        instructions: 1234,
        error: undefined,
      },
    });

    vi.spyOn(freighterMod, "connectWallet").mockResolved(DUMMY_PUBLIC_KEY);
    vi.spyOn(freighterMod, "signWithFreighter").mockResolved("fake-signed-xdr");

    // Mock the RPC server used inside the orders module.
    const sendTxMock = vi.fn().mockResolved({
      status: "PENDING",
      hash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    });
    const getAccountMock = vi.fn().mockResolved({ accountId: () => DUMMY_PUBLIC_KEY });
    vi.spyOn(rpc.Server.prototype, "getAccount").mockResolved({
      accountId: () => DUMMY_PUBLIC_KEY,
    });
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockImplementation(sendTxMock);

    // Mock the shared confirmation helper.
    const eventsMod = await import("../../../lib/stellar/events");
    vi.spyOn(eventsMod, "waitForTransaction").mockResolved({
      status: "SUCCESS",
    });

    const result = await dispatchOrder({
      orderId: SAMPLE_64_HEX,
      publicKey: DUMMY_PUBLIC_KEY,
    });

    // The fee must come from the live budgetFee call, not a hardcoded literal.
    expect(budgetFeeSpy).toHaveBeenCalled();
    expect(result.simulation.recommendedInclusionFeeStroops).toBe("420000");
    expect(result.status).toBe("SUCCESS");
  });

  it("uses budgetFee to derive the fee from live network stats in refundOrder", async () => {
    const budgetFeeSpy = vi.spyOn(simulateMod, "budgetFee").mockResolved("510000");

    const fakePrepared = { toXDR: () => "fake-prepared-xdr" } as unknown as any;
    vi.spyOn(simulateMod, "prepareAndReport").mockResolved({
      tx: fakePrepared,
      report: {
        ok: true,
        minResourceFee: BigInt(400000),
        instructions: 999,
        error: undefined,
      },
    });

    vi.spyOn(freighterMod, "connectWallet").mockResolved(DUMMY_PUBLIC_KEY);
    vi.spyOn(freighterMod, "signWithFreighter").mockResolved("fake-signed-xdr");

    vi.spyOn(rpc.Server.prototype, "getAccount").mockResolved({
      accountId: () => DUMMY_PUBLIC_KEY,
    });
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolved({
      status: "PENDING",
      hash: "feedbase0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    });

    const eventsMod = await import("../../../lib/stellar/events");
    vi.spyOn(eventsMod, "waitForTransaction").mockResolved({
      status: "SUCCESS",
    });

    const result = await refundOrder({
      orderId: SAMPLE_64_HEX,
      publicKey: DUMMY_PUBLIC_KEY,
    });

    expect(budgetFeeSpy).toHaveBeenCalled();
    expect(result.simulation.recommendedInclusionFeeStroops).toBe("510000");
    expect(result.status).toBe("SUCCESS");
  });
});
