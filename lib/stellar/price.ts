/**
 * XLM / USD Price Conversion Utilities
 *
 * Provides exchange rate conversions between USD and native XLM (Stellar Lumens)
 * for the Mova Store storefront checkout.
 *
 * A price is external, time-varying data (#704). Callers must supply an
 * explicit rate; there is no silent fallback to a hardcoded constant.
 */

/**
 * Testnet reference rate only — never used as a payment-path default.
 * Mainnet pricing must come from an explicit configuration or live oracle.
 */
export const TESTNET_REFERENCE_XLM_USD_PRICE = 0.12;

/**
 * Resolved XLM/USD rate used for both display and transaction construction.
 */
export interface XlmUsdRate {
  /** USD per 1 XLM. */
  usdPerXlm: number;
  /** Where the rate came from. */
  source: "config";
}

/**
 * Resolves the XLM/USD rate from an explicit value or environment config.
 * Returns null when no valid rate is available — callers must refuse to
 * quote rather than invent a number.
 */
export function resolveXlmUsdRate(raw?: string | number | null): XlmUsdRate | null {
  const candidate =
    raw !== undefined && raw !== null && String(raw).trim() !== ""
      ? raw
      : process.env.NEXT_PUBLIC_XLM_USD_PRICE;
  if (candidate === undefined || candidate === null || String(candidate).trim() === "") {
    return null;
  }
  const n = typeof candidate === "number" ? candidate : Number(String(candidate).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return { usdPerXlm: n, source: "config" };
}

/**
 * Thrown when an XLM conversion is attempted without a valid rate.
 */
export class XlmRateUnavailableError extends Error {
  code = "XLM_RATE_UNAVAILABLE";
  constructor(message?: string) {
    super(
      message ??
        "XLM rate is not configured or invalid. Set NEXT_PUBLIC_XLM_USD_PRICE to the USD price of 1 XLM."
    );
    this.name = "XlmRateUnavailableError";
  }
}

/**
 * Converts a USD amount to native XLM based on the given XLM price.
 *
 * @param amountUsd Amount in United States Dollars.
 * @param xlmPriceUsd Price of 1 XLM in USD (required — no silent fallback).
 * @returns Amount in XLM rounded to 4 decimal places.
 */
export function convertUsdToXlm(amountUsd: number, xlmPriceUsd: number): number {
  if (!Number.isFinite(xlmPriceUsd) || xlmPriceUsd <= 0) {
    throw new XlmRateUnavailableError();
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return 0;
  }
  const xlm = amountUsd / xlmPriceUsd;
  return Number(xlm.toFixed(4));
}

/**
 * Converts a native XLM amount to USD based on the given XLM price.
 *
 * @param amountXlm Amount in Stellar Lumens (XLM).
 * @param xlmPriceUsd Price of 1 XLM in USD (required — no silent fallback).
 * @returns Amount in USD rounded to 2 decimal places.
 */
export function convertXlmToUsd(amountXlm: number, xlmPriceUsd: number): number {
  if (!Number.isFinite(xlmPriceUsd) || xlmPriceUsd <= 0) {
    throw new XlmRateUnavailableError();
  }
  if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
    return 0;
  }
  return Number((amountXlm * xlmPriceUsd).toFixed(2));
}

/**
 * Formats a token amount with human-readable decimals and symbol.
 */
export function formatTokenPrice(amount: number, symbol = "XLM"): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${symbol}`;
}
