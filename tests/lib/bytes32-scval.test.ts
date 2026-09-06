import { describe, it, expect } from "vitest";
import { xdr, StrKey } from "@stellar/stellar-sdk";
import { bytes32ToScVal, toSdkBytes, hexToBytes, bytesToHex } from "../../lib/stellar/scval";

const HEX = "3f1a".repeat(16); // 64 hex chars = 32 bytes
const BYTES = hexToBytes(HEX);

describe("bytes32ToScVal", () => {
  it("produces byte-identical XDR from a hex string and from the same Uint8Array", () => {
    const fromHex = bytes32ToScVal(HEX);
    const fromBytes = bytes32ToScVal(BYTES);
    expect(fromHex.toXDR("base64")).toBe(fromBytes.toXDR("base64"));
  });

  it("round-trips the exact bytes into the ScVal", () => {
    const scVal = bytes32ToScVal(HEX);
    expect(scVal.switch()).toBe(xdr.ScValType.scvBytes());
    expect(bytesToHex(new Uint8Array(scVal.bytes()))).toBe(HEX);
  });

  it("accepts an 0x-prefixed hex string", () => {
    expect(bytes32ToScVal("0x" + HEX).toXDR("base64")).toBe(bytes32ToScVal(BYTES).toXDR("base64"));
  });

  it("rejects anything that is not exactly 32 bytes", () => {
    expect(() => bytes32ToScVal(new Uint8Array(31))).toThrow(/exactly 32 bytes \(got 31\)/);
    expect(() => bytes32ToScVal(new Uint8Array(33))).toThrow(/exactly 32 bytes \(got 33\)/);
    expect(() => bytes32ToScVal("ab")).toThrow(/exactly 32 bytes \(got 1\)/);
  });

  it("does not depend on a Node byte-buffer global being present", () => {
    // These modules are bundled for the browser. Nothing in the conversion path
    // may reach for a global that only exists under Node.
    const saved = (globalThis as Record<string, unknown>).Buffer;
    delete (globalThis as Record<string, unknown>).Buffer;
    try {
      expect(bytes32ToScVal(HEX).toXDR("base64")).toBe(bytes32ToScVal(BYTES).toXDR("base64"));
    } finally {
      (globalThis as Record<string, unknown>).Buffer = saved;
    }
  });
});

describe("toSdkBytes", () => {
  it("hands a plain Uint8Array to scvBytes unchanged", () => {
    const raw = new Uint8Array(32).fill(9);
    const scVal = xdr.ScVal.scvBytes(toSdkBytes(raw));
    expect(bytesToHex(new Uint8Array(scVal.bytes()))).toBe(bytesToHex(raw));
  });

  it("hands a plain Uint8Array to StrKey.encodeContract unchanged", () => {
    const contractId = new Uint8Array(32).fill(7);
    expect(StrKey.encodeContract(toSdkBytes(contractId))).toMatch(/^C[A-Z2-7]{55}$/);
  });

  it("returns the same reference it was given", () => {
    const raw = new Uint8Array(32);
    expect(toSdkBytes(raw)).toBe(raw);
  });
});
