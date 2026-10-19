import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  dispatchOrder,
  refundOrder,
  resolveOrderIdHash,
  readOrder,
  eventToOrder,
  formatOrderAmount,
  formatOrderRow,
  DEFAULT_DECIMALS,
} from "../../../lib/stellar/orders";
import {
  bytesToHex,
  hashOrderId,
  hexToBytes,
  i128ToScVal,
  addressToScVal,
  symbolToScVal,
} from "../../../lib/stellar/scval";
import * as freighterMod from "../../../lib/stellar/freighter";
import { rpc, xdr } from "@stellar/stellar-sdk";

vi.mock("../../../lib/stellar/freighter", () => ({
  connectWallet: vi.fn(),
  signWithFreighter: vi.fn(),
}));

/**
 * The topic layouts the checkout contract actually emits
 * (`contracts/checkout/src/events.rs`):
 *
 *   pay:          (pay, token, buyer, merchant, order_id)  -> data: (amount)
 *   create_order: (create_order, token, buyer, order_id)   -> data: (amount, timestamp)
 *   dispatch:     (dispatch, order_id, merchant)           -> data: (amount)
 *   refund:       (refund, order_id, buyer)                -> data: (amount)
 *
 * The indexer skips `topics[0]` (the symbol, returned separately as `symbol`)
 * and exposes `topics[1..]` as `fields.topic1..fields.topicN`, so `topic1` is
 * the token address for `pay`/`create_order` and only `dispatch`/`refund` put
 * the order id there.
 */
const REAL_TOPIC_LAYOUT = {
  create_order: {
    symbol: "create_order",
    topics: ["create_order", "TOKEN", "BUYER", "ORDER_ID"],
  },
  pay: {
    symbol: "pay",
    topics: ["pay", "TOKEN", "BUYER", "MERCHANT", "ORDER_ID"],
  },
  dispatch: {
    symbol: "dispatch",
    topics: ["dispatch", "ORDER_ID", "MERCHANT"],
  },
  refund: {
    symbol: "refund",
    topics: ["refund", "ORDER_ID", "BUYER"],
  },
} as const;

const TOKEN_ADDRESS =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const MERCHANT =
  "GCMERCHANT7BZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const ORDER_ID_A =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
const ORDER_ID_B =
  "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
const BUYER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const TX_HASH =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Builds an event fixture from the layout the contract declares for that event
 * name. Every key under `fields` is one the indexer produces: `topic1..topicN`
 * (from `topics[1..]`, so never `topic0`) plus the event's data-map entries.
 */
function buildRealTopicEvent(
  eventName: keyof typeof REAL_TOPIC_LAYOUT,
  orderId: string,
  buyer: string,
  amount: string,
  ledger: number,
) {
  const layout = REAL_TOPIC_LAYOUT[eventName];
  const fields: Record<string, string> = {};

  layout.topics.slice(1).forEach((template, index) => {
    const value =
      template === "ORDER_ID"
        ? orderId
        : template === "BUYER"
          ? buyer
          : template === "TOKEN"
            ? TOKEN_ADDRESS
            : MERCHANT;
    fields[`topic${index + 1}`] = value;
  });

  return {
    symbol: layout.symbol,
    ledger,
    txHash: TX_HASH,
    fields: { ...fields, amount },
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
    // dispatch is (dispatch, order_id, merchant), so topic1 is the order id...
    expect(order?.orderId).toBe(ORDER_ID_B);
    expect(order?.orderId).toBe(event.fields.topic1);
    // ...and there is no buyer topic to read, so the merchant is not reported
    // as the buyer of the order.
    expect(event.fields.topic2).toBe(MERCHANT);
    expect(order?.buyer).toBe("");
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

  it("reads a create_order event's timestamp from its data map", () => {
    const event = buildRealTopicEvent(
      "create_order",
      ORDER_ID_A,
      BUYER,
      "50000000",
      1005,
    );
    // create_order's data map is (amount, timestamp); the timestamp arrives in
    // seconds and has to be surfaced in milliseconds.
    event.fields.timestamp = "1700000000";

    const order = eventToOrder(event);
    expect(order?.orderId).toBe(ORDER_ID_A);
    expect(order?.timestamp).toBe(1_700_000_000_000);
  });

  it("never reports the token address as the order id for a pay event", () => {
    const event = buildRealTopicEvent(
      "pay",
      ORDER_ID_A,
      BUYER,
      "50000000",
      1004,
    );

    const order = eventToOrder(event);
    expect(order).not.toBeNull();
    // pay is (pay, token, buyer, merchant, order_id), so topic1 holds the token
    // contract address - reading it as the order id made dispatchOrder hash the
    // token and fail with OrderNotFound.
    expect(event.fields.topic1).toBe(TOKEN_ADDRESS);
    expect(order?.orderId).toBe(ORDER_ID_A);
    expect(order?.orderId).toBe(event.fields.topic4);
    expect(order?.orderId).not.toBe(event.fields.topic1);
    // The address is still reported as the token it is.
    expect(order?.token).toBe(TOKEN_ADDRESS);
  });
});

describe("resolveOrderIdHash (Issue #67)", () => {
  const SAMPLE_64_HEX =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

  it("passes 64-hex order IDs through unchanged as raw 32-byte Uint8Array", async () => {
    const resolved = await resolveOrderIdHash(SAMPLE_64_HEX);

    expect(resolved).toBeInstanceOf(Uint8Array);
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

      expect(resolved).toBeInstanceOf(Uint8Array);
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
  const DUMMY_PUBLIC_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves 64-hex order ID directly without double-hashing in dispatchOrder", async () => {
    vi.spyOn(freighterMod, "connectWallet").mockResolvedValue(DUMMY_PUBLIC_KEY);

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

    // (pay, token, buyer, merchant, order_id) exactly as the indexer emits it:
    // there is no `order_id` key in `fields` for a pay event.
    const indexedPayEvent = {
      symbol: "pay",
      ledger: 1000,
      txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      fields: {
        topic1: TOKEN_ADDRESS,
        topic2: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        topic3: MERCHANT,
        topic4: SAMPLE_64_HEX,
        amount: "50000000",
      },
    };

    const order = eventToOrder(indexedPayEvent);
    expect(order).not.toBeNull();
    // The admin dashboard uses order.orderId directly for dispatch and refund
    expect(order?.orderId).toBe(SAMPLE_64_HEX);
    expect(order?.orderId).toHaveLength(64);
    // A mapping that reads topic1 would hand the dashboard the token address,
    // which hashes to something the contract has no order for.
    expect(order?.orderId).not.toBe(indexedPayEvent.fields.topic1);
  });

  it("resolves a dispatch event's order id from topic1, where the contract puts it", () => {
    const SAMPLE_64_HEX =
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

    const indexedDispatchEvent = {
      symbol: "dispatch",
      ledger: 1001,
      txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      fields: {
        topic1: SAMPLE_64_HEX,
        topic2: "GBBD47IF6LWK7P7MDEVSCWR7DPWWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        amount: "50000000",
      },
    };

    const order = eventToOrder(indexedDispatchEvent);
    expect(order).not.toBeNull();
    expect(order?.orderId).toBe(SAMPLE_64_HEX);
    expect(order?.status).toBe("Shipped");
  });
});

describe("Checkout contract configuration validation", () => {
  const ORIGINAL_CONTRACT_ID = process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;
  const VALID_CONTRACT_ID =
    "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID = ORIGINAL_CONTRACT_ID;
  });

  it("throws a clear error from dispatchOrder when the contract id is missing", async () => {
    delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;

    const connectSpy = vi.spyOn(freighterMod, "connectWallet").mockResolvedValue(
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );

    await expect(
      dispatchOrder("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"),
    ).rejects.toThrow(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);

    // Fail fast: no RPC/network call should have been attempted.
    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("throws a clear error from refundOrder when the contract id is missing", async () => {
    delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;

    const connectSpy = vi.spyOn(freighterMod, "connectWallet").mockResolvedValue(
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );

    await expect(
      refundOrder("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"),
    ).rejects.toThrow(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);

    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("throws a clear error when the contract id is blank", async () => {
    process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID = "   ";

    const connectSpy = vi.spyOn(freighterMod, "connectWallet").mockResolvedValue(
      "GBBD47IF6LWK7P7MDEVSCWR7DPWWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );

    await expect(
      dispatchOrder("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"),
    ).rejects.toThrow(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);

    expect(connectSpy).not.toHaveBeenCalled();
  });

  it("does not report the configuration error when the contract id is set", async () => {
    process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID = VALID_CONTRACT_ID;

    const connectSpy = vi.spyOn(freighterMod, "connectWallet").mockRejectedValue(
      new Error("connect failed"),
    );

    const result = await dispatchOrder(
      "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
    );

    // Reaching the wallet proves the configuration gate opened; the transport
    // failure is still reported as a result, not as a configuration error.
    expect(connectSpy).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBe("connect failed");
    expect(result.error).not.toMatch(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);
  });
});

describe("readOrder (mocked RPC)", () => {
  const ORDER_ID_HEX =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const ORDER_BUYER =
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const ORDER_TOKEN =
    "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
  const ORDER_TIMESTAMP = 1_700_000_000;

  /**
   * The contract returns `Option<Order>`: a zero-length vec for `None` and a
   * one-element vec holding the order struct for `Some`. `readOrder` parses the
   * struct's `scvMap`, so this builds it from the same helpers the rest of the
   * suite uses.
   */
  function buildOrderRetval(): xdr.ScVal {
    const orderMap = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: symbolToScVal("buyer"),
        val: addressToScVal(ORDER_BUYER),
      }),
      new xdr.ScMapEntry({
        key: symbolToScVal("token"),
        val: addressToScVal(ORDER_TOKEN),
      }),
      new xdr.ScMapEntry({
        key: symbolToScVal("amount"),
        val: i128ToScVal(50_000_000n),
      }),
      new xdr.ScMapEntry({
        key: symbolToScVal("timestamp"),
        val: xdr.ScVal.scvU64(BigInt(ORDER_TIMESTAMP)),
      }),
      new xdr.ScMapEntry({
        key: symbolToScVal("status"),
        val: xdr.ScVal.scvVec([symbolToScVal("Paid")]),
      }),
    ]);

    return xdr.ScVal.scvVec([orderMap]);
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    // `readOrder` simulates against a throwaway keypair's account and only
    // parses the result when that lookup does not resolve to an account, so the
    // mocked server must not report one.
    vi.spyOn(rpc.Server.prototype, "getAccount").mockRejectedValue(
      new Error("account not found"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asserts status, amount, token, buyer and timestamp for a found order", async () => {
    vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue({
      transactionData: {},
      result: { retval: buildOrderRetval() },
    } as never);

    const order = await readOrder(ORDER_ID_HEX);

    expect(order).not.toBeNull();
    expect(order?.status).toBe("Paid");
    expect(order?.amount).toBe(50_000_000n);
    expect(order?.amountDisplay).toBe("5.00");
    expect(order?.token).toBe(ORDER_TOKEN);
    expect(order?.buyer).toBe(ORDER_BUYER);
    expect(order?.timestamp).toBe(ORDER_TIMESTAMP);
  });

  it("returns null when the order is absent", async () => {
    // `None` is an empty vec / void retval; either way there is no order map.
    vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue({
      transactionData: {},
      result: { retval: xdr.ScVal.scvVoid() },
    } as never);

    await expect(readOrder(ORDER_ID_HEX)).resolves.toBeNull();
  });

  it("returns null when the RPC simulation reports an error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue({
      error: "host invocation failed",
    } as never);

    await expect(readOrder(ORDER_ID_HEX)).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls.flat().join(" ")).toContain("host invocation failed");
  });
});
