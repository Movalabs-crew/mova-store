import { describe, expect, it } from "vitest";
import { xdr } from "@stellar/stellar-sdk";

import { bytes32ToScVal, hexToBytes } from "../../../lib/stellar/scval";

const HEX_32 =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("bytes32ToScVal", () => {
  it("produces byte-identical XDR from a hex string and the same Uint8Array", () => {
    const fromHex = bytes32ToScVal(HEX_32);
    // plain Uint8Array, no Buffer involved (browser-safe input)
    const fromBytes = bytes32ToScVal(new Uint8Array(hexToBytes(HEX_32)));

    expect(fromHex.toXDR("hex")).toBe(fromBytes.toXDR("hex"));
  });

  it("wraps the 32 raw bytes in an scvBytes ScVal", () => {
    const scv = bytes32ToScVal(new Uint8Array(32).fill(7));
    expect(scv.switch()).toBe(xdr.ScValType.scvBytes());
    const bytes = scv.bytes();
    expect(Array.from(bytes)).toHaveLength(32);
    expect(Array.from(bytes).every((b) => b === 7)).toBe(true);
  });

  it("accepts a fresh crypto-grade Uint8Array (e.g. digest output)", async () => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("order-123")
    );
    const scv = bytes32ToScVal(new Uint8Array(digest));
    expect(scv.switch()).toBe(xdr.ScValType.scvBytes());
    expect(Array.from(scv.bytes())).toHaveLength(32);
  });
});
