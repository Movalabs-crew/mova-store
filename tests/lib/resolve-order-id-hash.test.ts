import { describe, it, expect } from "vitest";
import {
  resolveOrderIdHash,
  isOrderIdHashHex,
  hashOrderId,
  hexToBytes,
  bytesToHex,
} from "../../lib/stellar/scval";

// The admin order table is built from indexer events, whose `order_id` topic is
// the already-hashed BytesN<32> rendered as hex. Hashing that a second time can
// never reproduce the stored value, so dispatch/refund must pass it through.
const EVENT_DERIVED_ID = "a".repeat(64);
const PRE_IMAGE_ID = "SS-1042";

describe("isOrderIdHashHex", () => {
  it("accepts 64 hex characters, with or without an 0x prefix", () => {
    expect(isOrderIdHashHex(EVENT_DERIVED_ID)).toBe(true);
    expect(isOrderIdHashHex("0x" + EVENT_DERIVED_ID)).toBe(true);
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

  it("does NOT re-hash an already-hashed id — the bug this guards", async () => {
    const resolved = await resolveOrderIdHash(EVENT_DERIVED_ID);
    const reHashed = await hashOrderId(EVENT_DERIVED_ID);
    expect(resolved).not.toEqual(reHashed);
  });

  it("hashes a short pre-image id", async () => {
    const resolved = await resolveOrderIdHash(PRE_IMAGE_ID);
    expect(resolved).toEqual(await hashOrderId(PRE_IMAGE_ID));
    expect(resolved.length).toBe(32);
  });

  it("returns 32 bytes on both paths", async () => {
    expect((await resolveOrderIdHash(EVENT_DERIVED_ID)).length).toBe(32);
    expect((await resolveOrderIdHash(PRE_IMAGE_ID)).length).toBe(32);
  });

  it("round-trips a real digest: hash a pre-image, then resolve its hex", async () => {
    const digest = await hashOrderId(PRE_IMAGE_ID);
    const asHex = bytesToHex(digest);
    expect(isOrderIdHashHex(asHex)).toBe(true);
    // What the admin page holds is exactly this hex; resolving it must give
    // back the same bytes the contract stored.
    expect(await resolveOrderIdHash(asHex)).toEqual(digest);
  });

  it("tolerates the 0x-prefixed form", async () => {
    const resolved = await resolveOrderIdHash("0x" + EVENT_DERIVED_ID);
    expect(bytesToHex(resolved)).toBe(EVENT_DERIVED_ID);
  });
});
