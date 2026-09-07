import { describe, it, expect } from "vitest";
import { resolveOrderIdHash, hashOrderId, bytesToHex, hexToBytes } from "../../../lib/stellar/scval";

describe("resolveOrderIdHash", () => {
  it("passes an already-hashed 64-character hex string through as raw bytes without re-hashing", async () => {
    const hexInput = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const result = await resolveOrderIdHash(hexInput);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    expect(bytesToHex(result)).toBe(hexInput.toLowerCase());
    expect(result).toEqual(hexToBytes(hexInput));
  });

  it("handles uppercase and mixed-case 64-character hex strings correctly", async () => {
    const hexInput = "A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4E5F60718293A4B5C6D7E8F90";
    const result = await resolveOrderIdHash(hexInput);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    expect(bytesToHex(result)).toBe(hexInput.toLowerCase());
  });

  it("hashes a short pre-image order ID using SHA-256", async () => {
    const rawId = "SS-1741112400-ABCD";
    const result = await resolveOrderIdHash(rawId);
    const expectedHash = await hashOrderId(rawId);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    expect(result).toEqual(expectedHash);
  });

  it("hashes non-hex strings of arbitrary length using SHA-256", async () => {
    const rawId = "order-xyz-123";
    const result = await resolveOrderIdHash(rawId);
    const expected = await hashOrderId(rawId);

    expect(result).toEqual(expected);
  });
});
