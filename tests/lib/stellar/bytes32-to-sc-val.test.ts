import { describe, expect, it } from "vitest";

import { bytes32ToScVal, hexToBytes } from "../../../lib/stellar/scval";

describe("bytes32ToScVal browser-safe conversion", () => {
  it("produces byte-identical XDR for a hex string and the same Uint8Array", () => {
    const hex = "4a5e1e5509952278b9b9b30b5b173b9d0d319ff42d3096c48e26fbc952796e37";
    const bytes = hexToBytes(hex);

    const fromHex = bytes32ToScVal(hex);
    const fromBytes = bytes32ToScVal(bytes);

    expect(fromHex.toXDR("base64")).toBe(fromBytes.toXDR("base64"));
    expect(fromHex.toXDR("hex")).toBe(fromBytes.toXDR("hex"));
    expect(fromHex.bytes()).toEqual(fromBytes.bytes());
  });

  it("preserves all 32 input bytes", () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index);
    const scVal = bytes32ToScVal(bytes);

    expect(Array.from(scVal.bytes())).toEqual(Array.from(bytes));
  });
});
