/**
 * XLM / USD Price Conversion Utilities
 *
 * Provides exchange rate conversions between USD and native XLM (Stellar Lumens)
 * for the Mova Store storefront checkout.
 */

/**
 * Standard reference price for testnet / fallback: 1 XLM = $0.12 USD.
 * (Equivalent to ~8.333333 XLM per $1.00 USD).
 */
export const DEFAULT_XLM_USD_PRICE = 0.12;

/**
 * Converts a USD amount to native XLM based on the given XLM price.
 *
 * @param amountUsd Amount in United States Dollars.
 * @param xlmPriceUsd Price of 1 XLM in USD (defaults to DEFAULT_XLM_USD_PRICE).
 * @returns Amount in XLM rounded to 4 decimal places.
 */
export function convertUsdToXlm(
  amountUsd: number,
  xlmPriceUsd = DEFAULT_XLM_USD_PRICE
): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return 0;
  }
  const price = xlmPriceUsd > 0 ? xlmPriceUsd : DEFAULT_XLM_USD_PRICE;
  const xlm = amountUsd / price;
  return Number(xlm.toFixed(4));
}

/**
 * Converts a native XLM amount to USD based on the given XLM price.
 *
 * @param amountXlm Amount in Stellar Lumens (XLM).
 * @param xlmPriceUsd Price of 1 XLM in USD (defaults to DEFAULT_XLM_USD_PRICE).
 * @returns Amount in USD rounded to 2 decimal places.
 */
export function convertXlmToUsd(
  amountXlm: number,
  xlmPriceUsd = DEFAULT_XLM_USD_PRICE
): number {
  if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
    return 0;
  }
  const price = xlmPriceUsd > 0 ? xlmPriceUsd : DEFAULT_XLM_USD_PRICE;
  return Number((amountXlm * price).toFixed(2));
}

/**
 * Formats a token amount with human-readable decimals and symbol.
 */
export function formatTokenPrice(amount: number, symbol = "XLM"): string {
  const decimals = symbol === "XLM" ? 2 : 2;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 4,
  })} ${symbol}`;
}
