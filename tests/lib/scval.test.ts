import { describe, it, expect } from "vitest";
import { hashOrderId, bytesToHex } from "@/lib/stellar/scval";

describe("hashOrderId", () => {
  it("produces a 32-byte Uint8Array digest", async () => {
    const digest = await hashOrderId("order_12345");
    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest.length).toBe(32);
  });

  it("is deterministic for identical inputs", async () => {
    const digestA = await hashOrderId("order_same_input");
    const digestB = await hashOrderId("order_same_input");
    expect(bytesToHex(digestA)).toBe(bytesToHex(digestB));
  });

  it("produces different hashes for inputs sharing the first 32 characters (input sensitivity for >32 chars)", async () => {
    const base40 = "a".repeat(40);
    const modified41 = base40 + "x";

    const digestBase = await hashOrderId(base40);
    const digestMod = await hashOrderId(modified41);

    expect(digestBase.length).toBe(32);
    expect(digestMod.length).toBe(32);
    expect(bytesToHex(digestBase)).not.toBe(bytesToHex(digestMod));
  });

  it("matches standard SHA-256 test vectors", async () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const emptyDigest = await hashOrderId("");
    expect(bytesToHex(emptyDigest)).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );

    // SHA-256("test") = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    const testDigest = await hashOrderId("test");
    expect(bytesToHex(testDigest)).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
  });
});
