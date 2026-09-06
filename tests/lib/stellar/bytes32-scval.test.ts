import { describe, it, expect } from "vitest";
import { bytes32ToScVal, hexToBytes } from "../../../lib/stellar/scval";

const HEX = "5b8f2c1d9a4e6073b1c8d2f45a6e7081c3d4e5f60718293a4b5c6d7e8f901a2b";

describe("bytes32ToScVal", () => {
  it("produces byte-identical XDR from a hex string and from the same bytes", () => {
    const fromHex = bytes32ToScVal(HEX);
    const fromBytes = bytes32ToScVal(hexToBytes(HEX));

    expect(fromHex.toXDR("base64")).toBe(fromBytes.toXDR("base64"));
  });

  it("carries the exact 32 bytes it was given", () => {
    const bytes = hexToBytes(HEX);

    expect(Uint8Array.from(bytes32ToScVal(bytes).bytes())).toEqual(bytes);
    expect(Uint8Array.from(bytes32ToScVal(HEX).bytes())).toEqual(bytes);
  });

  it("accepts a 0x-prefixed hex string", () => {
    expect(bytes32ToScVal(`0x${HEX}`).toXDR("base64")).toBe(bytes32ToScVal(HEX).toXDR("base64"));
  });

  it("does not alias the caller's array", () => {
    // The old implementation copied via Buffer.from; keep that guarantee so a
    // later mutation by the caller cannot reach inside the ScVal.
    const bytes = hexToBytes(HEX);
    const scVal = bytes32ToScVal(bytes);
    bytes[0] = (bytes[0]! ^ 0xff) & 0xff;

    expect(Uint8Array.from(scVal.bytes())).toEqual(hexToBytes(HEX));
  });

  it("rejects a value that is not exactly 32 bytes", () => {
    expect(() => bytes32ToScVal(HEX.slice(0, 62))).toThrow(/exactly 32 bytes/);
    expect(() => bytes32ToScVal(new Uint8Array(31))).toThrow(/exactly 32 bytes/);
  });
});
