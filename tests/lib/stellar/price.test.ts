import { describe, expect, it } from "vitest";
import {
  DEFAULT_XLM_USD_PRICE,
  convertUsdToXlm,
  convertXlmToUsd,
  formatTokenPrice,
} from "../../../lib/stellar/price";

describe("Stellar Price Conversion Utilities", () => {
  it("uses default XLM price of 0.12 USD", () => {
    expect(DEFAULT_XLM_USD_PRICE).toBe(0.12);
  });

  it("converts USD to XLM correctly", () => {
    // 12 USD / 0.12 = 100 XLM
    expect(convertUsdToXlm(12)).toBe(100);
    // 0.12 USD / 0.12 = 1 XLM
    expect(convertUsdToXlm(0.12)).toBe(1);
    // Custom price: 10 USD at $0.20/XLM = 50 XLM
    expect(convertUsdToXlm(10, 0.2)).toBe(50);
  });

  it("handles non-positive or non-finite USD amounts gracefully", () => {
    expect(convertUsdToXlm(0)).toBe(0);
    expect(convertUsdToXlm(-10)).toBe(0);
    expect(convertUsdToXlm(NaN)).toBe(0);
    expect(convertUsdToXlm(Infinity)).toBe(0);
  });

  it("converts XLM to USD correctly", () => {
    // 100 XLM * 0.12 = 12 USD
    expect(convertXlmToUsd(100)).toBe(12);
    // 50 XLM at 0.20 = 10 USD
    expect(convertXlmToUsd(50, 0.2)).toBe(10);
    // 0 XLM = 0 USD
    expect(convertXlmToUsd(0)).toBe(0);
    expect(convertXlmToUsd(-5)).toBe(0);
  });

  it("formats token prices nicely", () => {
    expect(formatTokenPrice(100, "XLM")).toBe("100.00 XLM");
    expect(formatTokenPrice(12.3456, "XLM")).toBe("12.3456 XLM");
  });
});
