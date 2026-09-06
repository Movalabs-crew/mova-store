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

    it("produces byte-identical XDR for equivalent hex and Uint8Array inputs", () => {
      const hex = "00112233445566778899aabbccddeeff".repeat(2);
      const fromHex = bytes32ToScVal(hex);
      const fromBytes = bytes32ToScVal(hexToBytes(hex));

      expect(fromBytes.toXDR("base64")).toBe(fromHex.toXDR("base64"));
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
  });

  describe("hexToBytes and bytesToHex", () => {
    it("round-trips hex and bytes with normalized lowercase output", () => {
      const hex = "a1B2c3";
      const bytes = hexToBytes(hex);
      expect(bytesToHex(bytes)).toBe("a1b2c3");
    });

    it("returns an empty Uint8Array for empty string", () => {
      const bytes = hexToBytes("");
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(0);
      expect(bytesToHex(bytes)).toBe("");
    });

    it("throws on odd-length hex strings", () => {
      expect(() => hexToBytes("123")).toThrow("invalid hex string (odd length)");
    });

    it("throws on invalid hex characters instead of returning zero bytes", () => {
      expect(() => hexToBytes("gggg")).toThrow(/invalid hex character: "g" in "gg"/);
      expect(() => hexToBytes("0xzz")).toThrow(/invalid hex character: "z" in "zz"/);
      expect(() => hexToBytes("12xy")).toThrow(/invalid hex character: "x" in "xy"/);
    });
  });

  describe("scValToString and scValToNativeSafe", () => {
    it("decodes symbols, strings, and booleans", () => {
      expect(scValToString(symbolToScVal("TEST"))).toBe("TEST");
      expect(scValToString(xdr.ScVal.scvString("hello"))).toBe("hello");
      expect(scValToString(xdr.ScVal.scvBool(true))).toBe("true");
    });

    it("decodes negative i128 correctly", () => {
      const scVal = i128ToScVal(-123n);
      expect(scValToString(scVal)).toBe("-123");
      expect(scValToNativeSafe(scVal)).toBe(-123n);
    });

    it("decodes bytes to hex string", () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const scVal = xdr.ScVal.scvBytes(Buffer.from(bytes));
      expect(scValToString(scVal)).toBe("deadbeef");
    });
  });

  describe("hashOrderId", () => {
    it("deterministically returns a 32-byte Uint8Array", async () => {
      const hash1 = await hashOrderId("order_12345");
      const hash2 = await hashOrderId("order_12345");
      expect(hash1).toBeInstanceOf(Uint8Array);
      expect(hash1.length).toBe(32);
      expect(hash1).toEqual(hash2);
    });
  });
});
