import { describe, it, expect } from "vitest";
import { hashOrderId } from "../../lib/stellar/scval";

describe("hashOrderId", () => {
  it("produces a 32-byte digest", async () => {
    const hash = await hashOrderId("test-order-123");
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it("is deterministic — same input yields same output", async () => {
    const hash1 = await hashOrderId("order-abc");
    const hash2 = await hashOrderId("order-abc");
    expect(hash1).toEqual(hash2);
  });

  it("produces different hashes for different inputs (>32 chars)", async () => {
    const longId = "a".repeat(40);
    const longIdModified = "a".repeat(40) + "x";
    const hash1 = await hashOrderId(longId);
    const hash2 = await hashOrderId(longIdModified);
    expect(hash1).not.toEqual(hash2);
  });

  it("is not a naive byte-copy stub — hash of 40 'a's differs from first-32-bytes-only", async () => {
    // If the mock were the old fake (just copy first 32 bytes),
    // these two would produce identical hashes. With real SHA-256 they differ.
    const hash1 = await hashOrderId("a".repeat(40));
    const hash2 = await hashOrderId("a".repeat(40) + "extra-chars-here");
    expect(hash1).not.toEqual(hash2);
  });
});
