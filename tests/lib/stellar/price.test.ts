import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PriceModule = typeof import("../../../lib/stellar/price");

const ORIGINAL_ENV = process.env;

async function loadPrice(overrides: Record<string, string | undefined>): Promise<PriceModule> {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_XLM_USD_PRICE;
  Object.assign(process.env, overrides);
  return import("../../../lib/stellar/price");
}

describe("Stellar Price Conversion Utilities", () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.resetModules();
  });

  it("resolves rate from explicit argument", async () => {
    const price = await loadPrice({});
    expect(price.resolveXlmUsdRate(0.15)).toEqual({ usdPerXlm: 0.15, source: "config" });
  });

  it("resolves rate from NEXT_PUBLIC_XLM_USD_PRICE", async () => {
    const price = await loadPrice({ NEXT_PUBLIC_XLM_USD_PRICE: "0.2" });
    expect(price.resolveXlmUsdRate()).toEqual({ usdPerXlm: 0.2, source: "config" });
  });

  it("returns null when rate is missing or invalid", async () => {
    const price = await loadPrice({});
    expect(price.resolveXlmUsdRate()).toBeNull();
    expect(price.resolveXlmUsdRate("abc")).toBeNull();
    expect(price.resolveXlmUsdRate(0)).toBeNull();
    expect(price.resolveXlmUsdRate(-1)).toBeNull();
    expect(price.resolveXlmUsdRate("")).toBeNull();
  });

  it("converts USD to XLM with an explicit rate", async () => {
    const price = await loadPrice({});
    expect(price.convertUsdToXlm(12, 0.12)).toBe(100);
    expect(price.convertUsdToXlm(10, 0.2)).toBe(50);
    expect(price.convertUsdToXlm(0, 0.12)).toBe(0);
    expect(price.convertUsdToXlm(-10, 0.12)).toBe(0);
  });

  it("throws XlmRateUnavailableError instead of silently defaulting", async () => {
    const price = await loadPrice({});
    expect(() => price.convertUsdToXlm(12, 0 as number)).toThrow(price.XlmRateUnavailableError);
    expect(() => price.convertUsdToXlm(12, -0.5)).toThrow(price.XlmRateUnavailableError);
  });

  it("converts XLM to USD with an explicit rate", async () => {
    const price = await loadPrice({});
    expect(price.convertXlmToUsd(100, 0.12)).toBe(12);
    expect(price.convertXlmToUsd(50, 0.2)).toBe(10);
    expect(price.convertXlmToUsd(0, 0.12)).toBe(0);
  });

  it("keeps testnet reference rate as documentation-only constant", async () => {
    const price = await loadPrice({});
    expect(price.TESTNET_REFERENCE_XLM_USD_PRICE).toBe(0.12);
  });

  it("formats token prices nicely", async () => {
    const price = await loadPrice({});
    expect(price.formatTokenPrice(100, "XLM")).toBe("100.00 XLM");
    expect(price.formatTokenPrice(12.3456, "XLM")).toBe("12.3456 XLM");
  });
});
