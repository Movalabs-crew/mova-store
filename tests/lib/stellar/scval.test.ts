import { describe, it, expect } from "vitest";
import { resolveOrderIdHash, hashOrderId, hexToBytes } from "../../../lib/stellar/scval";

describe("resolveOrderIdHash", () => {
  it("hashes short raw pre-image (e.g. SS-...)", async () => {
    const raw = "SS-order-12345";
    const result = await resolveOrderIdHash(raw);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
    const direct = await hashOrderId(raw);
    expect(Array.from(result)).toEqual(Array.from(direct));
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

