import { describe, it, expect } from "vitest";
import { hashOrderId, bytesToHex, hexToBytes } from "../../../lib/stellar/scval";
import { resolveOrderIdHash } from "../../../lib/stellar/orders";

const HEX64 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("resolveOrderIdHash", () => {
  it("passes an already-hashed 64-hex order id through unchanged", async () => {
    const bytes = await resolveOrderIdHash(HEX64);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
    expect(bytesToHex(bytes)).toBe(HEX64);
    expect(bytes).toEqual(hexToBytes(HEX64));
  });

  it("handles uppercase and mixed-case 64-hex order ids without re-hashing", async () => {
    const mixedHex = HEX64.toUpperCase();
    const bytes = await resolveOrderIdHash(mixedHex);
    expect(bytesToHex(bytes)).toBe(HEX64.toLowerCase());
  });

  it("handles 64-hex order ids with 0x prefix", async () => {
    const bytes = await resolveOrderIdHash(`0x${HEX64}`);
    expect(bytesToHex(bytes)).toBe(HEX64);
  });

  it("hashes a short raw pre-image via SHA-256 matching hashOrderId", async () => {
    const rawId = "SS-2024-0001";
    const resolved = await resolveOrderIdHash(rawId);
    const expected = await hashOrderId(rawId);
    expect(resolved).toEqual(expected);
    expect(resolved.length).toBe(32);
  });

  it("hashes an arbitrary pre-image string via SHA-256", async () => {
    const rawId = "order-xyz-987654321";
    const resolved = await resolveOrderIdHash(rawId);
    const expected = await hashOrderId(rawId);
    expect(resolved).toEqual(expected);
  });

  it("trims surrounding whitespace on 64-hex string", async () => {
    const bytes = await resolveOrderIdHash(`  ${HEX64}  \n`);
    expect(bytesToHex(bytes)).toBe(HEX64);
  });
});
