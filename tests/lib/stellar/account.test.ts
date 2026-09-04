import { describe, it, expect } from "vitest";
import { formatAmount, MIN_NATIVE_RESERVE } from "../../../lib/stellar/account";

describe("formatAmount", () => {
  it("formats MIN_NATIVE_RESERVE with 7 decimals correctly", () => {
    expect(formatAmount(MIN_NATIVE_RESERVE, 7)).toBe("1");
  });

  it("formats decimal amounts with fractional parts correctly", () => {
    expect(formatAmount(123400000n, 7)).toBe("12.34");
    expect(formatAmount(5n, 7)).toBe("0.0000005");
  });

  it("trims trailing zeros cleanly", () => {
    expect(formatAmount(10000000n, 7)).toBe("1");
    expect(formatAmount(10500000n, 7)).toBe("1.05");
    expect(formatAmount(10000001n, 7)).toBe("1.0000001");
  });

  it("handles negative values with a leading minus sign", () => {
    expect(formatAmount(-50000000n, 7)).toBe("-5");
    expect(formatAmount(-123400000n, 7)).toBe("-12.34");
    expect(formatAmount(-5n, 7)).toBe("-0.0000005");
  });

  it("handles zero correctly", () => {
    expect(formatAmount(0n, 7)).toBe("0");
    expect(formatAmount(0n, 0)).toBe("0");
  });

  it("handles decimals = 0 without error", () => {
    expect(formatAmount(42n, 0)).toBe("42");
    expect(formatAmount(100n, 0)).toBe("100");
    expect(formatAmount(-7n, 0)).toBe("-7");
  });

  it("handles integers exceeding Number.MAX_SAFE_INTEGER without precision loss", () => {
    const huge = 1n << 80n; // 1208925819614629174706176n
    const formatted = formatAmount(huge, 7);
    const expectedInt = (huge / 10000000n).toString();
    const expectedFrac = (huge % 10000000n).toString().padStart(7, "0").replace(/0+$/, "");
    const expected = expectedFrac ? `${expectedInt}.${expectedFrac}` : expectedInt;
    expect(formatted).toBe(expected);
  });
});
