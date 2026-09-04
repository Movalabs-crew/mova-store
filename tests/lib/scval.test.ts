import { describe, it, expect } from "vitest";
import { bytes32ToScVal, hexToBytes } from "../../lib/stellar/scval";
import { xdr } from "@stellar/stellar-sdk";

describe("bytes32ToScVal Uint8Array vs hex equivalence without Buffer global", () => {
  it("produces byte-identical XDR for hex string and Uint8Array", () => {
    const hex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const bytes = hexToBytes(hex);

    const scValFromHex = bytes32ToScVal(hex);
    const scValFromBytes = bytes32ToScVal(bytes);

    const xdrHex = scValFromHex.toXDR("base64");
    const xdrBytes = scValFromBytes.toXDR("base64");

    expect(xdrHex).toBe(xdrBytes);
    expect(scValFromHex.switch()).toBe(xdr.ScValType.scvBytes());
    expect(scValFromHex.bytes().length).toBe(32);
  });

  it("throws error for invalid byte lengths", () => {
    expect(() => bytes32ToScVal("0123")).toThrow("order_id must be exactly 32 bytes");
    expect(() => bytes32ToScVal(new Uint8Array(10))).toThrow("order_id must be exactly 32 bytes");
  });
});
