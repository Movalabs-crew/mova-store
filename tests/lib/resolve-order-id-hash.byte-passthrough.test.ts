import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { xdr } from "@stellar/stellar-sdk";

import {
  bytes32ToScVal,
  bytesToHex,
  hashOrderId,
  isOrderIdHashHex,
  resolveOrderIdHash,
} from "../../lib/stellar/scval";

// Issue #541 — pin `resolveOrderIdHash` byte-for-byte.
//
// tests/lib/resolve-order-id-hash.test.ts and tests/lib/stellar/orders.test.ts
// already cover the passthrough through *hex round-trips* (`bytesToHex(resolved)`
// equals the input), uppercase/0x spellings, malformed-hex rejection (also in
// tests/lib/bytes32-scval.test.ts) and plain "not hashed twice". What was still
// unpinned, and is pinned here:
//   * the returned bytes against an independent oracle (a published SHA-256
//     vector / node:crypto) instead of against the helpers under test;
//   * a digest whose first byte is 0x00, plus the degenerate all-zero digest;
//   * the double-hash `sha256(hex(sha256(id)))` it must never equal, over a table
//     of ids, and the idempotence of hex -> bytes that follows from it;
//   * near-miss spellings (trailing newline, 63/65 chars, `0x` + wrong length)
//     where the syntactic decision and the byte path have to agree;
//   * the resolved bytes as the contract argument, which is the dispatch/refund
//     mismatch the issue warns about.

const ASCENDING_HEX = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";
const ASCENDING_BYTES = Uint8Array.from({ length: 32 }, (_, index) => index);
const PRE_IMAGE_ID = "SS-1042";

const sha256 = (value: string): Uint8Array =>
  new Uint8Array(createHash("sha256").update(value, "utf8").digest());

describe("resolveOrderIdHash — the pre-image path is a single SHA-256", () => {
  it('returns the published SHA-256 vector for "test", byte for byte', async () => {
    // FIPS-180 vector for "test", spelled out as bytes so the expectation cannot
    // be re-derived from `hashOrderId` — a bug shared with that helper would hide.
    const expected = Uint8Array.from([
      0x9f, 0x86, 0xd0, 0x81, 0x88, 0x4c, 0x7d, 0x65, 0x9a, 0x2f, 0xea, 0xa0, 0xc5, 0x5a, 0xd0,
      0x15, 0xa3, 0xbf, 0x4f, 0x1b, 0x2b, 0x0b, 0x82, 0x2c, 0xd1, 0x5d, 0x6c, 0x15, 0xb0, 0xf0,
      0x0a, 0x08,
    ]);

    expect(await resolveOrderIdHash("test")).toEqual(expected);
    expect(bytesToHex(await resolveOrderIdHash("test"))).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
  });

  it("hashes each pre-image exactly once, never the double-hash", async () => {
    const ids = [PRE_IMAGE_ID, "SS-1759012345678-123456", "order-abc-123", "mova_shoe_purchase_99"];

    for (const id of ids) {
      // Independent oracle: node:crypto, not the WebCrypto path the module uses.
      const once = sha256(id);
      expect(await resolveOrderIdHash(id)).toEqual(once);

      // Re-hashing the hex spelling (an admin view hashing an indexer-derived id)
      // yields a different 32-byte key the contract can never find again.
      const twice = await hashOrderId(bytesToHex(once));
      expect(await resolveOrderIdHash(id)).not.toEqual(twice);

      // And because the hex spelling is a passthrough, the value is stable as it
      // crosses from the checkout path to the dispatch/refund path.
      expect(await resolveOrderIdHash(bytesToHex(once))).toEqual(once);
    }
  });
});

describe("resolveOrderIdHash — 64-hex passthrough is byte-for-byte", () => {
  it("decodes every spelling of a digest to the same raw bytes, leading zero included", async () => {
    expect(await resolveOrderIdHash(ASCENDING_HEX)).toEqual(ASCENDING_BYTES);
    // The first byte is 0x00 — a number/BigInt round-trip would drop it.
    expect((await resolveOrderIdHash(ASCENDING_HEX))[0]).toBe(0);

    const spellings = [
      ASCENDING_HEX.toUpperCase(),
      "0x" + ASCENDING_HEX,
      "0X" + ASCENDING_HEX,
      "0x" + ASCENDING_HEX.toUpperCase(),
      "0X" + ASCENDING_HEX.toUpperCase(),
    ];
    for (const spelling of spellings) {
      expect(isOrderIdHashHex(spelling)).toBe(true);
      expect(await resolveOrderIdHash(spelling)).toEqual(ASCENDING_BYTES);
    }
  });

  it("passes the degenerate digests through unchanged", async () => {
    const zeroHex = "0".repeat(64);
    expect(isOrderIdHashHex(zeroHex)).toBe(true);
    expect(await resolveOrderIdHash(zeroHex)).toEqual(new Uint8Array(32));
    expect(bytesToHex(await resolveOrderIdHash(zeroHex))).toBe(zeroHex);

    const onesHex = "f".repeat(64);
    expect(isOrderIdHashHex(onesHex)).toBe(true);
    expect(await resolveOrderIdHash(onesHex)).toEqual(new Uint8Array(32).fill(255));
  });

  it("keeps the checkout key and the dispatch key identical for the same order", async () => {
    const stored = await hashOrderId(PRE_IMAGE_ID);
    const storedHex = bytesToHex(stored);

    const fromCheckout = await resolveOrderIdHash(PRE_IMAGE_ID);
    const fromAdmin = await resolveOrderIdHash(storedHex);

    expect(fromCheckout).toEqual(stored);
    expect(fromAdmin).toEqual(stored);
    expect(bytesToHex(fromAdmin)).toBe(bytesToHex(fromCheckout));

    const reHashed = await hashOrderId(storedHex);
    expect(fromAdmin).not.toEqual(reHashed);
    // Hex -> bytes is lossless, so resolving any digest's spelling is stable.
    expect(await resolveOrderIdHash(bytesToHex(reHashed))).toEqual(reHashed);
  });

  it("agrees with isOrderIdHashHex on near-miss spellings", async () => {
    const cases: Array<[string, boolean]> = [
      [ASCENDING_HEX, true],
      ["0x" + ASCENDING_HEX, true],
      ["0X" + ASCENDING_HEX, true],
      [ASCENDING_HEX.toUpperCase(), true],
      [ASCENDING_HEX + "\n", false],
      [" " + ASCENDING_HEX, false],
      [ASCENDING_HEX + "0", false],
      [ASCENDING_HEX.slice(0, 63), false],
      ["0x" + ASCENDING_HEX.slice(0, 63), false],
      ["g".repeat(64), false],
      ["SS-" + "a".repeat(64), false],
    ];

    for (const [value, isHexDigest] of cases) {
      expect(isOrderIdHashHex(value)).toBe(isHexDigest);

      const resolved = await resolveOrderIdHash(value);
      expect(resolved.length).toBe(32);
      if (isHexDigest) {
        expect(resolved).toEqual(ASCENDING_BYTES);
      } else {
        // Anything that is not exactly 32 bytes of hex is a pre-image: a trailing
        // newline or a stray space silently changes the key, so the spelling of an
        // already-hashed id matters.
        expect(resolved).toEqual(await hashOrderId(value));
      }
    }
  });

  it("hands the resolved bytes to the contract argument unchanged", async () => {
    const stored = sha256(PRE_IMAGE_ID);

    const viaPassthrough = await resolveOrderIdHash(bytesToHex(stored));
    const viaHash = await resolveOrderIdHash(PRE_IMAGE_ID);

    for (const bytes of [viaPassthrough, viaHash]) {
      const scVal = bytes32ToScVal(bytes);
      expect(scVal.type).toBe("scvBytes");
      expect(Array.from(scVal.bytes.toBytes())).toEqual(Array.from(stored));
      // Same ABI encoding as building the argument straight from the oracle bytes.
      expect(scVal.toXDR("base64")).toBe(bytes32ToScVal(stored).toXDR("base64"));
    }
  });
});
