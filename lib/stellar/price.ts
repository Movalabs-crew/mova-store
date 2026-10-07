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
 * Locale used when rendering token prices.
 *
 * Pinned explicitly rather than letting `toLocaleString` fall back to the host
 * default: with `undefined` the same amount renders as `"100.00 XLM"` on an
 * `en-US` machine but `"100,00 XLM"` under `LANG=de_DE`, so the storefront text
 * (and any test asserting it) drifts with the runtime it happens to execute on.
 * The rest of the app pins its display locale the same way, e.g.
 * `app/admin/orders/page.tsx`.
 */
export const TOKEN_PRICE_LOCALE = "en-US";

/**
 * Formats a token amount with human-readable decimals and symbol.
 *
 * Spec:
 * - Finite amounts are group-separated and rendered with a minimum of 2 and a
 *   maximum of 4 fraction digits: `100` -> `"100.00 XLM"`, `12.3456` ->
 *   `"12.3456 XLM"`, `1234.5` -> `"1,234.50 XLM"`, `1.23456` -> `"1.2346 XLM"`.
 * - Negative amounts keep their sign (`-5` -> `"-5.00 XLM"`), except when the
 *   amount rounds to zero, which is rendered unsigned (`-0.00001` -> `"0.00 XLM"`).
 * - `symbol` is appended verbatim after a single space and is not validated, so
 *   any display symbol (`"USDC"`) is passed through as-is.
 * - Non-finite amounts (`NaN`, `±Infinity`) have no price representation and
 *   throw a `RangeError` instead of rendering `"NaN XLM"` / `"∞ XLM"`.
 *
 * @param amount Token amount to render. Must be a finite number.
 * @param symbol Display symbol appended after the amount. Defaults to `"XLM"`.
 * @throws {RangeError} When `amount` is not a finite number.
 */
export function formatTokenPrice(amount: number, symbol = "XLM"): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`formatTokenPrice: amount must be a finite number, received ${amount}`);
  }
  const rendered = amount.toLocaleString(TOKEN_PRICE_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  // `Intl` renders `-0` and negative values that round to zero as `"-0.00"`;
  // a zero price must not display a negative sign.
  const digits = rendered.startsWith("-") && !/[1-9]/.test(rendered) ? rendered.slice(1) : rendered;
  return `${digits} ${symbol}`;
}
