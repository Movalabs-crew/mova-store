import { describe, it, expect } from "vitest";
import {
  hashOrderId,
  bytesToHex,
} from "../../../lib/stellar/scval";
import { resolveOrderIdHash } from "../../../lib/stellar/orders";

const HEX64 =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("resolveOrderIdHash", () => {
  it("passes an already-hashed 64-hex order id through unchanged", async () => {
    const bytes = await resolveOrderIdHash(HEX64);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(32);
    expect(bytesToHex(bytes)).toBe(HEX64);
  });

  it("accepts uppercase 64-hex ids", async () => {
    const bytes = await resolveOrderIdHash(HEX64.toUpperCase());
    expect(bytesToHex(bytes)).toBe(HEX64);
  });

  it("hashes short raw pre-images with SHA-256", async () => {
    const rawId = "SS-2024-0001";
    const bytes = await resolveOrderIdHash(rawId);
    expect(bytes).toHaveLength(32);
    expect(bytesToHex(bytes)).toBe(bytesToHex(await hashOrderId(rawId)));
    // It must be a real hash, not the input copied/padded.
    expect(bytesToHex(bytes)).not.toBe(rawId.toLowerCase().padEnd(64, "0"));
  });

  it("treats near-miss lengths (63 or 65 hex chars) as raw pre-images", async () => {
    const short63 = HEX64.slice(0, 63);
    const bytes63 = await resolveOrderIdHash(short63);
    expect(bytesToHex(bytes63)).toBe(bytesToHex(await hashOrderId(short63)));

    const long65 = HEX64 + "f";
    const bytes65 = await resolveOrderIdHash(long65);
    expect(bytesToHex(bytes65)).toBe(bytesToHex(await hashOrderId(long65)));
  });

  it("treats 64-char strings containing non-hex characters as raw pre-images", async () => {
    const notHex = "g".repeat(64);
    const bytes = await resolveOrderIdHash(notHex);
    expect(bytesToHex(bytes)).toBe(bytesToHex(await hashOrderId(notHex)));
  });
});
