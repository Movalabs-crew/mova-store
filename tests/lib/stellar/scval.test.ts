/**
 * Authoritative test suite for `lib/stellar/scval.ts`.
 *
 * This file is the single place to look for behaviour of the ScVal helpers.
 * It replaces seven overlapping files that had grown up around the module
 * (`tests/lib/scval.test.ts`, `tests/lib/stellar/bytes32ToScVal.test.ts`,
 * `tests/lib/bytes32-scval.test.ts`, `tests/lib/hash-order-id.test.ts`,
 * `tests/lib/resolve-order-id-hash.test.ts` and `__tests__/scval.test.ts`);
 * every assertion they held is preserved here, regrouped by exported function.
 */

import { describe, it, expect } from "vitest";
import { Address, StrKey, nativeToScVal, xdr } from "@stellar/stellar-sdk";

import {
  addressToScVal,
  bytes32ToScVal,
  bytesToHex,
  hashOrderId,
  hexToBytes,
  i128ToScVal,
  isOrderIdHashHex,
  resolveOrderIdHash,
  scValToNativeSafe,
  scValToString,
  symbolToScVal,
  toSdkBytes,
} from "../../../lib/stellar/scval";

const HEX32 = "4a5e1e5509952278b9b9b30b5b173b9d0d319ff42d3096c48e26fbc952796e37";
const REPEATED_HEX32 = "3f1a".repeat(16); // 64 hex chars = 32 bytes
const BYTES32 = hexToBytes(HEX32);

// The admin order table is built from indexer events, whose `order_id` topic is
// the already-hashed BytesN<32> rendered as hex. Hashing that a second time can
// never reproduce the stored value, so dispatch/refund must pass it through.
const EVENT_DERIVED_ID = "a".repeat(64);
const PRE_IMAGE_ID = "SS-1042";

/**
 * These modules are bundled for the browser, where a Node `Buffer` global is not
 * guaranteed. Nothing in the conversion path may reach for one.
 */
function withoutBuffer<T>(run: () => T): T {
  const scope = globalThis as Record<string, unknown>;
  const saved = scope.Buffer;
  delete scope.Buffer;
  try {
    return run();
  } finally {
    if (saved === undefined) {
      delete scope.Buffer;
    } else {
      scope.Buffer = saved;
    }
  }
}

describe("i128ToScVal", () => {
  it("matches nativeToScVal XDR base64 for key boundary values", () => {
    const cases = [
      0n,
      1n,
      -1n,
      (1n << 64n) - 1n,
      1n << 64n,
      -(1n << 63n),
      (1n << 127n) - 1n,
      -(1n << 127n),
    ];

    for (const val of cases) {
      expect(i128ToScVal(val).toXDR("base64")).toBe(
        nativeToScVal(val, { type: "i128" }).toXDR("base64")
      );
    }
  });

  it("accepts number and string inputs", () => {
    expect(i128ToScVal(100).toXDR("base64")).toBe(
      nativeToScVal(100n, { type: "i128" }).toXDR("base64")
    );
    expect(i128ToScVal("5000000").toXDR("base64")).toBe(
      nativeToScVal(5000000n, { type: "i128" }).toXDR("base64")
    );
  });

  it.each([
    ["positive bigint overflow", BigInt(1) << BigInt(127)],
    ["negative bigint overflow", -(BigInt(1) << BigInt(127)) - BigInt(1)],
    ["positive decimal-string overflow", (BigInt(1) << BigInt(127)).toString()],
    ["negative decimal-string overflow", (-(BigInt(1) << BigInt(127)) - BigInt(1)).toString()],
    ["unsafe positive number", Number.MAX_SAFE_INTEGER + 1],
    ["unsafe negative number", Number.MIN_SAFE_INTEGER - 1],
  ])("rejects %s before constructing XDR", (_label, value) => {
    expect(() => i128ToScVal(value)).toThrow(RangeError);
  });

  it("preserves safe-number boundary encodings", () => {
    for (const value of [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]) {
      expect(i128ToScVal(value).toXDR("base64")).toBe(
        nativeToScVal(BigInt(value), { type: "i128" }).toXDR("base64")
      );
    }
  });

  it("keeps the sign for negative values", () => {
    expect(scValToNativeSafe(i128ToScVal(-42n))).toBe(-42n);
    expect(i128ToScVal(-42).toXDR("base64")).toBe(
      nativeToScVal(-42n, { type: "i128" }).toXDR("base64")
    );
  });
});

describe("toSdkBytes", () => {
  it("returns the same reference it was given", () => {
    const raw = new Uint8Array(32);
    expect(toSdkBytes(raw)).toBe(raw);
  });

  it("hands a plain Uint8Array to scvBytes unchanged", () => {
    const raw = new Uint8Array(32).fill(9);
    const scVal = xdr.ScVal.scvBytes(toSdkBytes(raw));
    expect(bytesToHex(scVal.bytes.toBytes())).toBe(bytesToHex(raw));
  });

  it("hands a plain Uint8Array to StrKey.encodeContract unchanged", () => {
    const contractId = new Uint8Array(32).fill(7);
    expect(StrKey.encodeContract(toSdkBytes(contractId))).toMatch(/^C[A-Z2-7]{55}$/);
  });
});

describe("bytes32ToScVal", () => {
  it("accepts exactly 32-byte Uint8Array", () => {
    const scVal = bytes32ToScVal(new Uint8Array(32).fill(7));
    expect(scVal.type).toBe("scvBytes");
    expect(scVal.bytes.toBytes().length).toBe(32);
  });

  it("accepts 64-character hex string", () => {
    const scVal = bytes32ToScVal("ab".repeat(32));
    expect(scVal.type).toBe("scvBytes");
    expect(scVal.bytes.toBytes().length).toBe(32);
  });

  it("accepts a hex string with or without an 0x prefix", () => {
    const expected = bytes32ToScVal(BYTES32).toXDR("base64");
    expect(bytes32ToScVal(REPEATED_HEX32).toXDR("base64")).toBe(
      bytes32ToScVal(hexToBytes(REPEATED_HEX32)).toXDR("base64")
    );
    expect(bytes32ToScVal("0x" + HEX32).toXDR("base64")).toBe(expected);
    expect(bytes32ToScVal("0X" + HEX32).toXDR("base64")).toBe(expected);
  });

  it("produces byte-identical XDR from a hex string and the same Uint8Array", () => {
    const fromHex = bytes32ToScVal(HEX32);
    const fromBytes = bytes32ToScVal(BYTES32);

    expect(fromHex.toXDR("base64")).toBe(fromBytes.toXDR("base64"));
    expect(fromHex.toXDR("hex")).toBe(fromBytes.toXDR("hex"));
    expect(fromHex.toXDR()).toEqual(fromBytes.toXDR());
    expect(fromHex.bytes.toBytes()).toEqual(fromBytes.bytes.toBytes());
  });

  it("round-trips the exact bytes into the ScVal", () => {
    expect(bytesToHex(bytes32ToScVal(HEX32).bytes.toBytes())).toBe(HEX32);
  });

  it("preserves all 32 input bytes", () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
    expect(Array.from(bytes32ToScVal(bytes).bytes.toBytes())).toEqual(Array.from(bytes));
  });

  it("preserves the constructed value when the caller later changes its input", () => {
    // `scvBytes` keeps the reference it is handed, so the helper must copy.
    const bytes = hexToBytes(REPEATED_HEX32);
    const scVal = bytes32ToScVal(bytes);
    const originalXdr = scVal.toXDR("base64");

    bytes.fill(0);

    expect(bytesToHex(scVal.bytes.toBytes())).toBe(REPEATED_HEX32);
    expect(scVal.toXDR("base64")).toBe(originalXdr);
  });

  it("rejects anything that is not exactly 32 bytes", () => {
    expect(() => bytes32ToScVal(new Uint8Array(31))).toThrow(
      "order_id must be exactly 32 bytes (got 31)"
    );
    expect(() => bytes32ToScVal(new Uint8Array(33))).toThrow(
      "order_id must be exactly 32 bytes (got 33)"
    );
    expect(() => bytes32ToScVal(new Uint8Array(10))).toThrow(
      "order_id must be exactly 32 bytes (got 10)"
    );
    expect(() => bytes32ToScVal("aa".repeat(16))).toThrow(
      "order_id must be exactly 32 bytes (got 16)"
    );
    expect(() => bytes32ToScVal("ab")).toThrow("order_id must be exactly 32 bytes (got 1)");
    expect(() => bytes32ToScVal("aabbcc")).toThrow("order_id must be exactly 32 bytes");
  });

  it("rejects non-hex input before it can reach the length check", () => {
    expect(() => bytes32ToScVal("g".repeat(64))).toThrow('invalid hex character "g" at index 0');
    expect(() => bytes32ToScVal("gg".repeat(32))).toThrow(/invalid hex character/);
  });

  it("works without a Node Buffer global", () => {
    withoutBuffer(() => {
      expect(bytes32ToScVal(HEX32).toXDR("base64")).toBe(bytes32ToScVal(BYTES32).toXDR("base64"));
      const scVal = bytes32ToScVal(BYTES32);
      expect(scVal.type).toBe("scvBytes");
      expect(scVal.bytes.toBytes().length).toBe(32);
    });
  });
});

describe("addressToScVal", () => {
  const account = StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(1));
  const contract = StrKey.encodeContract(new Uint8Array(32).fill(2));

  it("builds an scvAddress for a G... account address", () => {
    const scVal = addressToScVal(account);
    expect(scVal.type).toBe("scvAddress");
    expect(Address.fromScVal(scVal).toString()).toBe(account);
    expect(scValToString(scVal)).toBe(account);
  });

  it("builds an scvAddress for a C... contract address", () => {
    const scVal = addressToScVal(contract);
    expect(scVal.type).toBe("scvAddress");
    expect(Address.fromScVal(scVal).toString()).toBe(contract);
    expect(scValToString(scVal)).toBe(contract);
  });

  it("matches Address.toScVal byte-for-byte", () => {
    expect(addressToScVal(account).toXDR("base64")).toBe(
      new Address(account).toScVal().toXDR("base64")
    );
    expect(addressToScVal(contract).toXDR("base64")).toBe(
      new Address(contract).toScVal().toXDR("base64")
    );
  });
});

describe("symbolToScVal", () => {
  it("builds an scvSymbol ScVal", () => {
    const scVal = symbolToScVal("pay");
    expect(scVal.type).toBe("scvSymbol");
    expect(scVal.sym.toString()).toBe("pay");
  });

  it("round-trips through scValToString", () => {
    for (const symbol of ["pay", "refund", "order_id"]) {
      expect(scValToString(symbolToScVal(symbol))).toBe(symbol);
    }
  });
});

describe("scValToString", () => {
  it("decodes symbols and strings", () => {
    expect(scValToString(symbolToScVal("checkout"))).toBe("checkout");
    expect(scValToString(xdr.ScVal.scvString("SS-1042"))).toBe("SS-1042");
  });

  it("decodes addresses", () => {
    const account = StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(3));
    expect(scValToString(addressToScVal(account))).toBe(account);
  });

  it("decodes every supported integer width", () => {
    expect(scValToString(i128ToScVal(42n))).toBe("42");
    expect(scValToString(xdr.ScVal.scvI64(-5n))).toBe("-5");
    expect(scValToString(xdr.ScVal.scvI32(-3))).toBe("-3");
    expect(scValToString(xdr.ScVal.scvU32(7))).toBe("7");
    expect(scValToString(xdr.ScVal.scvU64(9n))).toBe("9");
  });

  it("decodes bytes to a lowercase hex string", () => {
    expect(scValToString(xdr.ScVal.scvBytes(new Uint8Array([0xde, 0xad, 0xbe, 0xef])))).toBe(
      "deadbeef"
    );
  });

  it("decodes booleans", () => {
    expect(scValToString(xdr.ScVal.scvBool(true))).toBe("true");
    expect(scValToString(xdr.ScVal.scvBool(false))).toBe("false");
  });

  it("serialises vecs to JSON, stringifying bigints", () => {
    const vec = xdr.ScVal.scvVec([symbolToScVal("a"), i128ToScVal(5n)]);
    expect(scValToString(vec)).toBe('["a","5"]');
  });

  it("serialises maps to JSON", () => {
    const map = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: symbolToScVal("k"), val: xdr.ScVal.scvU32(1) }),
    ]);
    expect(scValToString(map)).toBe('{"k":1}');
  });
});

describe("scValToNativeSafe", () => {
  it("returns BigInt for integers", () => {
    expect(scValToNativeSafe(i128ToScVal(7n))).toBe(7n);
    expect(scValToNativeSafe(i128ToScVal(-7n))).toBe(-7n);
  });

  it("returns native strings for symbols and strings", () => {
    expect(scValToNativeSafe(symbolToScVal("pay"))).toBe("pay");
    expect(scValToNativeSafe(xdr.ScVal.scvString("hello"))).toBe("hello");
  });

  it("returns a Uint8Array for bytes", () => {
    const native = scValToNativeSafe(xdr.ScVal.scvBytes(new Uint8Array([1, 2, 3])));
    expect(Array.from(native as Uint8Array)).toEqual([1, 2, 3]);
  });
});

describe("hexToBytes", () => {
  it("parses valid hex strings with and without an 0x prefix", () => {
    expect(bytesToHex(hexToBytes("0x12abef"))).toBe("12abef");
    expect(bytesToHex(hexToBytes("12abef"))).toBe("12abef");
    expect(bytesToHex(hexToBytes("0X12ABEF"))).toBe("12abef");
  });

  it("is case-insensitive and emits lowercase hex", () => {
    expect(bytesToHex(hexToBytes("a1B2c3"))).toBe("a1b2c3");
    expect(bytesToHex(hexToBytes("0Xa1B2c3"))).toBe("a1b2c3");
  });

  it("returns an empty Uint8Array for empty input", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array(0));
    expect(hexToBytes("0x")).toEqual(new Uint8Array(0));
    expect(hexToBytes("0X")).toEqual(new Uint8Array(0));
  });

  it("throws for odd-length hex strings", () => {
    expect(() => hexToBytes("abc")).toThrow("invalid hex string (odd length)");
    expect(() => hexToBytes("0x123")).toThrow("invalid hex string (odd length)");
    expect(() => hexToBytes("123")).toThrow("invalid hex string (odd length)");
  });

  it("throws for non-hex characters and names the offending index", () => {
    expect(() => hexToBytes("gggg")).toThrow('invalid hex character "g" at index 0');
    expect(() => hexToBytes("0xzz")).toThrow('invalid hex character "z" at index 0');
    expect(() => hexToBytes("00x0")).toThrow('invalid hex character "x" at index 2');
    expect(() => hexToBytes("123g")).toThrow(/invalid hex character/);
  });
});

describe("bytesToHex", () => {
  it("emits lowercase, zero-padded hex", () => {
    expect(bytesToHex(new Uint8Array([0x00, 0x0f, 0xa0, 0xff]))).toBe("000fa0ff");
  });

  it("returns an empty string for empty input", () => {
    expect(bytesToHex(new Uint8Array(0))).toBe("");
  });
});

describe("hashOrderId", () => {
  it("produces a 32-byte Uint8Array digest", async () => {
    const digest = await hashOrderId("order_12345");
    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest.length).toBe(32);
  });

  it("is deterministic for identical inputs", async () => {
    const digestA = await hashOrderId("order_same_input");
    const digestB = await hashOrderId("order_same_input");
    expect(digestA).toEqual(digestB);
    expect(bytesToHex(digestA)).toBe(bytesToHex(digestB));
  });

  it("matches standard SHA-256 test vectors", async () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(bytesToHex(await hashOrderId(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    // SHA-256("test") = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    expect(bytesToHex(await hashOrderId("test"))).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
  });

  it("is sensitive to changes past the first 32 characters", async () => {
    const base40 = "a".repeat(40);
    const digestBase = await hashOrderId(base40);
    const digestModified = await hashOrderId(base40 + "x");

    expect(digestBase.length).toBe(32);
    expect(digestModified.length).toBe(32);
    expect(bytesToHex(digestBase)).not.toBe(bytesToHex(digestModified));
  });

  it("is not a naive byte-copy stub", async () => {
    // A mock that copied the first 32 bytes would make these two identical.
    const hash1 = await hashOrderId("a".repeat(40));
    const hash2 = await hashOrderId("a".repeat(40) + "extra-chars-here");
    expect(hash1).not.toEqual(hash2);
  });
});

describe("isOrderIdHashHex", () => {
  it("accepts 64 hex characters, with or without an 0x prefix", () => {
    expect(isOrderIdHashHex(EVENT_DERIVED_ID)).toBe(true);
    expect(isOrderIdHashHex("0x" + EVENT_DERIVED_ID)).toBe(true);
    expect(isOrderIdHashHex("0X" + EVENT_DERIVED_ID)).toBe(true);
    expect(isOrderIdHashHex(EVENT_DERIVED_ID.toUpperCase())).toBe(true);
  });

  it("rejects anything that is not exactly 32 bytes of hex", () => {
    expect(isOrderIdHashHex(PRE_IMAGE_ID)).toBe(false);
    expect(isOrderIdHashHex("a".repeat(63))).toBe(false);
    expect(isOrderIdHashHex("a".repeat(65))).toBe(false);
    expect(isOrderIdHashHex("g".repeat(64))).toBe(false);
    expect(isOrderIdHashHex("")).toBe(false);
  });
});

describe("resolveOrderIdHash", () => {
  it("passes a 64-hex order id through unchanged", async () => {
    const resolved = await resolveOrderIdHash(EVENT_DERIVED_ID);
    expect(resolved).toEqual(hexToBytes(EVENT_DERIVED_ID));
    expect(bytesToHex(resolved)).toBe(EVENT_DERIVED_ID);
  });

  it("tolerates the 0x-prefixed form", async () => {
    expect(bytesToHex(await resolveOrderIdHash("0x" + EVENT_DERIVED_ID))).toBe(EVENT_DERIVED_ID);
  });

  it("does NOT re-hash an already-hashed id — the bug this guards", async () => {
    const resolved = await resolveOrderIdHash(EVENT_DERIVED_ID);
    const reHashed = await hashOrderId(EVENT_DERIVED_ID);
    expect(resolved).not.toEqual(reHashed);
  });

  it("hashes a short pre-image id and for inputs shorter than 64 hex chars", async () => {
    const resolved = await resolveOrderIdHash(PRE_IMAGE_ID);
    expect(resolved).toEqual(await hashOrderId(PRE_IMAGE_ID));
    expect(resolved.length).toBe(32);

    const short = "hello";
    expect(Array.from(await resolveOrderIdHash(short))).toEqual(
      Array.from(await hashOrderId(short))
    );
  });

  it("returns 32 bytes on both paths", async () => {
    expect((await resolveOrderIdHash(EVENT_DERIVED_ID)).length).toBe(32);
    expect((await resolveOrderIdHash(PRE_IMAGE_ID)).length).toBe(32);
  });

  it("round-trips a real digest: hash a pre-image, then resolve its hex", async () => {
    const digest = await hashOrderId(PRE_IMAGE_ID);
    const asHex = bytesToHex(digest);
    expect(isOrderIdHashHex(asHex)).toBe(true);
    // What the admin page holds is exactly this hex; resolving it must give back
    // the same bytes the contract stored.
    expect(await resolveOrderIdHash(asHex)).toEqual(digest);
  });
});
