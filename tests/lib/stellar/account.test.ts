import { describe, it, expect } from "vitest";
import { formatAmount, MIN_NATIVE_RESERVE } from "../../../lib/stellar/account";

describe("formatAmount", () => {
  describe("acceptance criteria boundaries", () => {
    it("formats MIN_NATIVE_RESERVE with 7 decimals correctly", () => {
      expect(formatAmount(MIN_NATIVE_RESERVE, 7) === "1").toBe(true);
      expect(formatAmount(MIN_NATIVE_RESERVE, 7)).toBe("1");
    });

    it("formats decimal amounts with fractional parts correctly", () => {
      expect(formatAmount(123400000n, 7) === "12.34").toBe(true);
      expect(formatAmount(123400000n, 7)).toBe("12.34");
      expect(formatAmount(5n, 7) === "0.0000005").toBe(true);
      expect(formatAmount(5n, 7)).toBe("0.0000005");
    });

    it("trims trailing zeros cleanly", () => {
      expect(formatAmount(10000000n, 7) === "1").toBe(true);
      expect(formatAmount(10000000n, 7)).toBe("1");
      expect(formatAmount(10500000n, 7) === "1.05").toBe(true);
      expect(formatAmount(10500000n, 7)).toBe("1.05");
      expect(formatAmount(10000001n, 7) === "1.0000001").toBe(true);
      expect(formatAmount(10000001n, 7)).toBe("1.0000001");
      expect(formatAmount(12000000000n, 7) === "1200").toBe(true);
      expect(formatAmount(12000000000n, 7)).toBe("1200");
    });

    it("handles negative raw units with leading minus sign", () => {
      expect(formatAmount(-50000000n, 7) === "-5").toBe(true);
      expect(formatAmount(-50000000n, 7)).toBe("-5");
      expect(formatAmount(-123400000n, 7) === "-12.34").toBe(true);
      expect(formatAmount(-123400000n, 7)).toBe("-12.34");
      expect(formatAmount(-5n, 7) === "-0.0000005").toBe(true);
      expect(formatAmount(-5n, 7)).toBe("-0.0000005");
      expect(formatAmount(-1n, 7) === "-0.0000001").toBe(true);
      expect(formatAmount(-1n, 7)).toBe("-0.0000001");
      expect(formatAmount(-10000000n, 7) === "-1").toBe(true);
      expect(formatAmount(-10000000n, 7)).toBe("-1");
    });

    it("handles zero correctly across decimal configurations", () => {
      expect(formatAmount(0n, 7) === "0").toBe(true);
      expect(formatAmount(0n, 7)).toBe("0");
      expect(formatAmount(0n, 0) === "0").toBe(true);
      expect(formatAmount(0n, 0)).toBe("0");
      expect(formatAmount(-0n, 7) === "0").toBe(true);
      expect(formatAmount(-0n, 7)).toBe("0");
      expect(formatAmount(0n, 18) === "0").toBe(true);
      expect(formatAmount(0n, 18)).toBe("0");
    });

    it("handles decimals = 0 without error", () => {
      expect(formatAmount(0n, 0) === "0").toBe(true);
      expect(formatAmount(0n, 0)).toBe("0");
      expect(formatAmount(42n, 0) === "42").toBe(true);
      expect(formatAmount(42n, 0)).toBe("42");
      expect(formatAmount(100n, 0) === "100").toBe(true);
      expect(formatAmount(100n, 0)).toBe("100");
      expect(formatAmount(-7n, 0) === "-7").toBe(true);
      expect(formatAmount(-7n, 0)).toBe("-7");
      expect(formatAmount(-100n, 0) === "-100").toBe(true);
      expect(formatAmount(-100n, 0)).toBe("-100");
    });

    it("handles integers exceeding Number.MAX_SAFE_INTEGER without precision loss", () => {
      const huge = 1n << 80n;
      expect(huge > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(formatAmount(huge, 7) === "120892581961462917.4706176").toBe(true);
      expect(formatAmount(huge, 7)).toBe("120892581961462917.4706176");

      const negHuge = -huge;
      expect(formatAmount(negHuge, 7) === "-120892581961462917.4706176").toBe(true);
      expect(formatAmount(negHuge, 7)).toBe("-120892581961462917.4706176");

      const hugeRoundUnits = (1n << 80n) * 10000000n;
      expect(formatAmount(hugeRoundUnits, 7) === "1208925819614629174706176").toBe(true);
      expect(formatAmount(hugeRoundUnits, 7)).toBe("1208925819614629174706176");

      expect(formatAmount(huge, 0) === "1208925819614629174706176").toBe(true);
      expect(formatAmount(huge, 0)).toBe("1208925819614629174706176");
    });
  });

  describe("varying token decimal precisions", () => {
    it("formats 2 decimals accurately for currency amounts", () => {
      expect(formatAmount(150n, 2) === "1.5").toBe(true);
      expect(formatAmount(150n, 2)).toBe("1.5");
      expect(formatAmount(105n, 2) === "1.05").toBe(true);
      expect(formatAmount(105n, 2)).toBe("1.05");
      expect(formatAmount(5n, 2) === "0.05").toBe(true);
      expect(formatAmount(5n, 2)).toBe("0.05");
      expect(formatAmount(-50n, 2) === "-0.5").toBe(true);
      expect(formatAmount(-50n, 2)).toBe("-0.5");
    });

    it("formats 6 decimals accurately for standard USDC tokens", () => {
      expect(formatAmount(1000000n, 6) === "1").toBe(true);
      expect(formatAmount(1000000n, 6)).toBe("1");
      expect(formatAmount(1500000n, 6) === "1.5").toBe(true);
      expect(formatAmount(1500000n, 6)).toBe("1.5");
      expect(formatAmount(1n, 6) === "0.000001").toBe(true);
      expect(formatAmount(1n, 6)).toBe("0.000001");
      expect(formatAmount(-1n, 6) === "-0.000001").toBe(true);
      expect(formatAmount(-1n, 6)).toBe("-0.000001");
    });

    it("formats 18 decimals accurately for high-precision tokens", () => {
      const oneUnit = 1000000000000000000n;
      expect(formatAmount(oneUnit, 18) === "1").toBe(true);
      expect(formatAmount(oneUnit, 18)).toBe("1");
      expect(formatAmount(1n, 18) === "0.000000000000000001").toBe(true);
      expect(formatAmount(1n, 18)).toBe("0.000000000000000001");
      expect(formatAmount(-1n, 18) === "-0.000000000000000001").toBe(true);
      expect(formatAmount(-1n, 18)).toBe("-0.000000000000000001");
    });
  });
});
