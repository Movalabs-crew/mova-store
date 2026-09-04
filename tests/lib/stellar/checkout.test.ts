import { describe, expect, it, vi } from "vitest";
import { usdToRawUnits } from "../../../lib/stellar/checkout";
import { WalletError } from "../../../lib/stellar/freighter";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

describe("usdToRawUnits", () => {
  describe("conversion to 7-decimal bigint units", () => {
    it("converts standard decimal price 12.34 to 123400000n", () => {
      const converted = usdToRawUnits(12.34);
      expect(converted === 123400000n).toBe(true);
      expect(converted).toBe(123400000n);
    });

    it("safely handles floating-point precision for 0.29 to 2900000n", () => {
      const converted = usdToRawUnits(0.29);
      expect(converted === 2900000n).toBe(true);
      expect(converted).toBe(2900000n);
    });

    it("converts minimum single unit 0.0000001 to 1n", () => {
      const converted = usdToRawUnits(0.0000001);
      expect(converted === 1n).toBe(true);
      expect(converted).toBe(1n);
    });

    it("converts whole dollar amount 1 to 10000000n", () => {
      const converted = usdToRawUnits(1);
      expect(converted === 10000000n).toBe(true);
      expect(converted).toBe(10000000n);
    });

    it("converts larger values accurately", () => {
      const converted = usdToRawUnits(99.99);
      expect(converted === 999900000n).toBe(true);
      expect(converted).toBe(999900000n);
    });
  });

  describe("error handling for invalid inputs", () => {
    it("throws WalletError with INVALID_AMOUNT when amount is 0", () => {
      let thrown: unknown;
      try {
        usdToRawUnits(0);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(WalletError);
      expect((thrown as WalletError).code).toBe("INVALID_AMOUNT");
    });

    it("throws WalletError with INVALID_AMOUNT when amount is negative (-5)", () => {
      let thrown: unknown;
      try {
        usdToRawUnits(-5);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(WalletError);
      expect((thrown as WalletError).code).toBe("INVALID_AMOUNT");
    });

    it("throws WalletError with INVALID_AMOUNT when amount is NaN", () => {
      let thrown: unknown;
      try {
        usdToRawUnits(Number.NaN);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(WalletError);
      expect((thrown as WalletError).code).toBe("INVALID_AMOUNT");
    });

    it("throws WalletError with INVALID_AMOUNT when amount is Infinity", () => {
      let thrown: unknown;
      try {
        usdToRawUnits(Number.POSITIVE_INFINITY);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(WalletError);
      expect((thrown as WalletError).code).toBe("INVALID_AMOUNT");
    });

    it("throws WalletError with INVALID_AMOUNT when amount is negative Infinity", () => {
      let thrown: unknown;
      try {
        usdToRawUnits(Number.NEGATIVE_INFINITY);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(WalletError);
      expect((thrown as WalletError).code).toBe("INVALID_AMOUNT");
    });
  });
});
