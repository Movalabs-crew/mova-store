import { describe, it, expect } from "vitest";
import {
  hexToBytes,
  bytesToHex,
  bytes32ToScVal,
  i128ToScVal,
  addressToScVal,
  symbolToScVal,
  scValToString,
  scValToNativeSafe,
  hashOrderId,
} from "@/lib/stellar/scval";

describe("hexToBytes and bytesToHex", () => {
  it("converts empty string to empty Uint8Array", () => {
    const result = hexToBytes("");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
    expect(bytesToHex(result)).toBe("");
  });

  it("handles 0x prefix case-insensitively and parses valid hex", () => {
    const withoutPrefix = hexToBytes("deadbeef");
    const withPrefixLower = hexToBytes("0xdeadbeef");
    const withPrefixUpper = hexToBytes("0XDEADBEEF");

    expect(Array.from(withoutPrefix)).toEqual([0xde, 0xad, 0xbe, 0xef]);
    expect(Array.from(withPrefixLower)).toEqual([0xde, 0xad, 0xbe, 0xef]);
    expect(Array.from(withPrefixUpper)).toEqual([0xde, 0xad, 0xbe, 0xef]);
  });

  it("round-trips mixed-case hex case-insensitively and emits lowercase output", () => {
    expect(bytesToHex(hexToBytes("a1B2c3"))).toBe("a1b2c3");
    expect(bytesToHex(hexToBytes("0xA1B2C3D4"))).toBe("a1b2c3d4");
  });

  it("throws error for odd-length hex strings", () => {
    expect(() => hexToBytes("123")).toThrow("invalid hex string (odd length)");
    expect(() => hexToBytes("0x12345")).toThrow("invalid hex string (odd length)");
  });

  it("throws error for invalid hex characters naming offending character", () => {
    expect(() => hexToBytes("gggg")).toThrow(/invalid hex character/i);
    expect(() => hexToBytes("0xzz")).toThrow(/invalid hex character/i);
    expect(() => hexToBytes("12g4")).toThrow(/invalid hex character/i);
    expect(() => hexToBytes("0x1234xy")).toThrow(/invalid hex character/i);
  });
});

describe("bytes32ToScVal", () => {
  it("builds BytesN<32> ScVal for valid 32-byte hex string or buffer", () => {
    const hex32 = "00".repeat(32);
    const scValFromHex = bytes32ToScVal(hex32);
    expect(scValFromHex).toBeDefined();

    const bytes32 = new Uint8Array(32).fill(0xaa);
    const scValFromBytes = bytes32ToScVal(bytes32);
    expect(scValFromBytes).toBeDefined();
    expect(scValToString(scValFromBytes)).toBe("aa".repeat(32));
  });

  it("throws error if hex string has length != 64 (not 32 bytes)", () => {
    expect(() => bytes32ToScVal("00".repeat(31))).toThrow(
      /order_id must be exactly 32 bytes/,
    );
    expect(() => bytes32ToScVal("00".repeat(33))).toThrow(
      /order_id must be exactly 32 bytes/,
    );
  });

  it("throws error when given a 64-character non-hex string instead of producing zero bytes", () => {
    const invalid64 = "g".repeat(64);
    expect(() => bytes32ToScVal(invalid64)).toThrow(/invalid hex character/i);
  });
});

describe("scval helpers", () => {
  it("constructs and converts i128 values correctly", () => {
    const scVal = i128ToScVal(12345678901234567890n);
    expect(scValToString(scVal)).toBe("12345678901234567890");
    expect(scValToNativeSafe(scVal)).toBe(12345678901234567890n);
  });

  it("constructs and converts symbols correctly", () => {
    const scVal = symbolToScVal("USDC");
    expect(scValToString(scVal)).toBe("USDC");
  });

  it("hashes orderId with SHA-256 to 32 bytes", async () => {
    const digest = await hashOrderId("order_12345");
    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest.length).toBe(32);
  });
});
