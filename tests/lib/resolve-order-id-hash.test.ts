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

// ---------------------------------------------------------------------------
// Issue #542 — the 64-hex ambiguity.
//
// `isOrderIdHashHex` is purely syntactic, so a *raw* human order id that
// happens to be 64 hex characters is indistinguishable from an event-derived
// hash. The chosen policy (documented in lib/stellar/scval.ts and README.md,
// "Order id encoding") is: raw ids are never 64 hex characters — the 64-hex
// form always means "already hashed". These tests pin that contract down.
// ---------------------------------------------------------------------------
describe("policy: a 64-hex raw id is ambiguous (issue #542)", () => {
  // A plausible human id that a caller could mint: 64 hex chars, no prefix.
  const AMBIGUOUS_HUMAN_ID = "5f3a9c1e7b2d4a6f8c0e2b4d6f8a0c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a";

  it("is accepted as an already-hashed id", () => {
    expect(AMBIGUOUS_HUMAN_ID).toHaveLength(64);
    expect(isOrderIdHashHex(AMBIGUOUS_HUMAN_ID)).toBe(true);
    // The ambiguity extends to the prefixed and uppercase spellings too.
    expect(isOrderIdHashHex("0x" + AMBIGUOUS_HUMAN_ID)).toBe(true);
    expect(isOrderIdHashHex(AMBIGUOUS_HUMAN_ID.toUpperCase())).toBe(true);
  });

  it("is passed to the contract UNHASHED — the documented behaviour", async () => {
    const resolved = await resolveOrderIdHash(AMBIGUOUS_HUMAN_ID);
    expect(resolved).toEqual(hexToBytes(AMBIGUOUS_HUMAN_ID));
    // It is NOT sha256(raw id): a caller that meant it as a pre-image gets the
    // wrong contract key and an OrderNotFound, and nothing detects it later.
    expect(resolved).not.toEqual(await hashOrderId(AMBIGUOUS_HUMAN_ID));
    expect(bytesToHex(resolved)).not.toBe(bytesToHex(await hashOrderId(AMBIGUOUS_HUMAN_ID)));
  });

  it("would need an explicit prefix to be distinguishable — so raw ids use SS-", async () => {
    // The prefix form the storefront actually mints always carries a hyphen,
    // so it can never be mistaken for a hash and is always hashed.
    const minted = "SS-1759012345678-123456";
    expect(isOrderIdHashHex(minted)).toBe(false);
    expect(await resolveOrderIdHash(minted)).toEqual(await hashOrderId(minted));
  });
});

describe("policy: ids the storefront mints are never 64 hex (issue #542)", () => {
  // Mirrors the generators in app/checkout/page.tsx and
  // components/StellarCheckoutButton.jsx:
  //   `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  const mint = (now: number, rand: number) => `SS-${now}-${rand}`;

  it("rejects the minted format across the range of its components", () => {
    const samples = [
      mint(0, 0),
      mint(1759012345678, 123456),
      mint(Date.now(), 999999),
      mint(Number.MAX_SAFE_INTEGER, 999999),
      // A hex-looking suffix is still safe: the `SS-` prefix is not hex.
      "SS-1759012345678-abcdef",
      "SS-" + "a".repeat(64),
    ];
    for (const id of samples) {
      expect(isOrderIdHashHex(id)).toBe(false);
    }
  });

  it("always hashes minted ids, so the policy holds end-to-end", async () => {
    const id = mint(1759012345678, 123456);
    expect(await resolveOrderIdHash(id)).toEqual(await hashOrderId(id));
  });
});
