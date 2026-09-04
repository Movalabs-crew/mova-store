import { describe, expect, it, vi } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

import { WalletError } from "../../../lib/stellar/freighter";
import { usdToRawUnits } from "../../../lib/stellar/checkout";

describe("usdToRawUnits", () => {
  it("converts a typical USD price to 7-decimal raw units", () => {
    expect(usdToRawUnits(12.34)).toBe(123_400_000n);
  });

  it("is floating-point safe for prices like 0.29", () => {
    expect(usdToRawUnits(0.29)).toBe(2_900_000n);
  });

  it("handles the smallest unit and whole dollars", () => {
    expect(usdToRawUnits(0.0000001)).toBe(1n);
    expect(usdToRawUnits(1)).toBe(10_000_000n);
  });

  const cases: Array<[string, number]> = [
    ["zero", 0],
    ["negative", -5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ];

  it.each(cases)(
    "throws WalletError with code INVALID_AMOUNT for %s",
    (_label, value) => {
      let caught: unknown;
      try {
        usdToRawUnits(value);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(WalletError);
      expect((caught as WalletError).code).toBe("INVALID_AMOUNT");
    }
  );
});
