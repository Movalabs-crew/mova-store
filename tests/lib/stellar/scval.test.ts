import { describe, it, expect } from "vitest";
import { nativeToScVal, xdr } from "@stellar/stellar-sdk";
import {
  i128ToScVal,
  bytes32ToScVal,
  addressToScVal,
  symbolToScVal,
  scValToString,
  scValToNativeSafe,
  hexToBytes,
  bytesToHex,
  hashOrderId,
} from "../../../lib/stellar/scval";

describe("ScVal helpers", () => {
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
        const customScVal = i128ToScVal(val);
        const nativeScVal = nativeToScVal(val, { type: "i128" });
        expect(customScVal.toXDR("base64")).toBe(nativeScVal.toXDR("base64"));
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
  });

  describe("bytes32ToScVal", () => {
    it("accepts exactly 32-byte Uint8Array", () => {
      const bytes = new Uint8Array(32).fill(7);
      const scVal = bytes32ToScVal(bytes);
      expect(scVal.switch()).toBe(xdr.ScValType.scvBytes());
      expect(scVal.bytes().length).toBe(32);
    });

    it("accepts 64-character hex string", () => {
      const hex = "ab".repeat(32);
      const scVal = bytes32ToScVal(hex);
      expect(scVal.switch()).toBe(xdr.ScValType.scvBytes());
      expect(scVal.bytes().length).toBe(32);
    });

    it("throws on inputs not equal to 32 bytes", () => {
      expect(() => bytes32ToScVal(new Uint8Array(31))).toThrow(
        "order_id must be exactly 32 bytes (got 31)"
      );
      expect(() => bytes32ToScVal(new Uint8Array(33))).toThrow(
        "order_id must be exactly 32 bytes (got 33)"
      );
      expect(() => bytes32ToScVal("aabbcc")).toThrow("order_id must be exactly 32 bytes");
    });

    it("throws when passed a 64-character non-hex string instead of producing zero bytes", () => {
      const nonHex64 = "g".repeat(64);
      expect(() => bytes32ToScVal(nonHex64)).toThrow(/invalid hex character/);
    });

    it("produces byte-identical XDR when passed a hex string vs a Uint8Array of the same bytes", () => {
      const hex = "4a5e1e5509952278b9b9b30b5b173b9d0d319ff42d3096c48e26fbc952796e37";
      const bytes = hexToBytes(hex);
      const scValFromHex = bytes32ToScVal(hex);
      const scValFromBytes = bytes32ToScVal(bytes);

      expect(scValFromHex.toXDR("base64")).toBe(scValFromBytes.toXDR("base64"));
      expect(scValFromHex.toXDR("hex")).toBe(scValFromBytes.toXDR("hex"));
      expect(scValFromHex.toXDR()).toEqual(scValFromBytes.toXDR());
    });

    it("works without Node.js Buffer global", () => {
      const originalBuffer = globalThis.Buffer;
      try {
        delete (globalThis as { Buffer?: unknown }).Buffer;
        const hex = "4a5e1e5509952278b9b9b30b5b173b9d0d319ff42d3096c48e26fbc952796e37";
        const bytes = hexToBytes(hex);
        const scVal = bytes32ToScVal(bytes);
        expect(scVal.switch()).toBe(xdr.ScValType.scvBytes());
        expect(scVal.bytes().length).toBe(32);
      } finally {
        globalThis.Buffer = originalBuffer;
      }
    });
  });

  it("passes through a 64-hex string unchanged as bytes", async () => {
    const hexId =
      "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
    const result = await resolveOrderIdHash(hexId);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    const decoded = hexToBytes(hexId);
    expect(Array.from(result)).toEqual(Array.from(decoded));
    const hashed = await hashOrderId(hexId);
    expect(Array.from(result)).not.toEqual(Array.from(hashed));
  });

  it("is case-insensitive for 64-hex input", async () => {
    const upper =
      "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2";
    const lower =
      "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
    const rUpper = await resolveOrderIdHash(upper);
    const rLower = await resolveOrderIdHash(lower);
    expect(Array.from(rUpper)).toEqual(Array.from(rLower));
  });

  it("falls back to hashing for inputs shorter than 64 hex chars", async () => {
    const short = "hello";
    const result = await resolveOrderIdHash(short);
    const expected = await hashOrderId(short);
    expect(Array.from(result)).toEqual(Array.from(expected));
  });
});

