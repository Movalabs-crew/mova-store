import { describe, it, expect } from "vitest";
import { usdToRawUnits } from "../../../lib/stellar/checkout";
import { WalletError } from "../../../lib/stellar/freighter";

function expectInvalidAmount(amountUsd: number): void {
  try {
    usdToRawUnits(amountUsd);
    expect.fail(`expected usdToRawUnits(${String(amountUsd)}) to throw`);
  } catch (err) {
    expect(err).toBeInstanceOf(WalletError);
    expect((err as WalletError).code).toBe("INVALID_AMOUNT");
  }
}

describe("usdToRawUnits", () => {
  it("converts 12.34 USD to 123400000n (floating-point safe)", () => {
    expect(usdToRawUnits(12.34)).toBe(123400000n);
  });

  it("converts 0.29 USD to 2900000n (floating-point safe)", () => {
    expect(usdToRawUnits(0.29)).toBe(2900000n);
  });

  it("converts 0.0000001 USD to 1n", () => {
    expect(usdToRawUnits(0.0000001)).toBe(1n);
  });

  it("converts 1 USD to 10000000n", () => {
    expect(usdToRawUnits(1)).toBe(10000000n);
  });

  it("throws WalletError with code INVALID_AMOUNT for zero", () => {
    expectInvalidAmount(0);
  });

  it("throws WalletError with code INVALID_AMOUNT for a negative amount", () => {
    expectInvalidAmount(-5);
  });

  it("throws WalletError with code INVALID_AMOUNT for NaN", () => {
    expectInvalidAmount(Number.NaN);
  });

  it("throws WalletError with code INVALID_AMOUNT for Infinity", () => {
    expectInvalidAmount(Number.POSITIVE_INFINITY);
  });
});
