import { Account, Asset, rpc } from "@stellar/stellar-sdk";

import { FRIENDBOT_URL, IS_MAINNET, TokenConfig } from "./config";
import { WalletError } from "./freighter";
import { readTokenBalance, readTokenDecimals } from "./simulate";

// ---------------------------------------------------------------------------
// Account readiness helpers.
//
// Before building a payment transaction we verify the buyer's account:
//   1. it exists (and fund it on testnet),
//   2. it holds a trustline for the payment asset (USDC),
//   3. its balance covers the amount,
//   4. it keeps the native XLM reserve (fees + footprint).
// ---------------------------------------------------------------------------

/** Classic account minimum reserve: 1 XLM (10,000,000 stroops). */
export const MIN_NATIVE_RESERVE = BigInt(10000000);

export interface LoadedAccount {
  account: Account;
  funded: boolean;
}

export interface TrustlineInfo {
  hasTrustline: boolean;
  balanceRaw: bigint;
  authorized: boolean;
}

export interface PaymentReadiness {
  account: Account | null;
  funded: boolean;
  nativeBalanceRaw: bigint;
  tokenBalanceRaw: bigint;
  decimals: number;
  hasTrustline: boolean;
  trustlineAuthorized: boolean;
  requiredRaw: bigint;
  sufficientBalance: boolean;
  sufficientReserve: boolean;
  issues: string[];
}

/**
 * Decides whether a rejection from the RPC layer means "this account does not
 * exist" (safe to fund / report as unfunded) versus an infrastructure failure
 * (dead RPC, timeout, auth) that must NOT be mistaken for an empty account.
 */
export function isAccountMissingError(err: unknown): boolean {
  if (err instanceof WalletError && err.code === "ACCOUNT_NOT_FOUND") {
    return true;
  }
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message);
  }
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string") {
    parts.push(code);
  }
  const text = parts.join(" ").toLowerCase();
  return (
    /account\s+(is\s+)?(not\s+found|missing|does\s+not\s+exist)/.test(text) ||
    /(not\s+found|missing)\s+account/.test(text) ||
    text.includes("account_not_found")
  );
}

/** Wrap any non-account-missing RPC failure in a distinct RPC_ERROR. */
function toRpcError(err: unknown): WalletError {
  const detail = err instanceof Error ? err.message : String(err);
  return new WalletError(
    `Stellar RPC request failed: ${detail}. The network may be down - ` +
      "check your connection or RPC endpoint and retry.",
    "RPC_ERROR"
  );
}

/**
 * Load a buyer account, funding it on testnet when it does not exist yet.
 * On mainnet a missing account is a hard error.
 * RPC/network failures are rethrown as RPC_ERROR and never trigger friendbot
 * funding, so a dead RPC is distinguishable from a truly unfunded account.
 */
export async function loadAccount(
  server: rpc.Server,
  publicKey: string,
  opts: { fund?: boolean } = {}
): Promise<LoadedAccount> {
  const fund = opts.fund ?? true;
  let account: Account;
  try {
    account = await server.getAccount(publicKey);
    return { account, funded: false };
  } catch (err) {
    if (!isAccountMissingError(err)) {
      throw toRpcError(err);
    }
    if (!IS_MAINNET && fund) {
      await fundTestnetAccount(publicKey);
      try {
        account = await server.getAccount(publicKey);
        return { account, funded: true };
      } catch (retryErr) {
        if (!isAccountMissingError(retryErr)) {
          throw toRpcError(retryErr);
        }
        throw new WalletError(
          "Your Stellar account has no sequence number on this network. " +
            "Fund it with XLM before paying.",
          "ACCOUNT_NOT_FOUND"
        );
      }
    }
    throw new WalletError(
      "Your Stellar account has no sequence number on this network. " +
        "Fund it with XLM before paying.",
      "ACCOUNT_NOT_FOUND"
    );
  }
}

export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    throw new WalletError(
      `Could not fund testnet account (friendbot HTTP ${res.status}).`,
      "FRIENDBOT_ERROR"
    );
  }
}

/** Native XLM balance of an account (0 when the account does not exist). */
export async function getNativeBalance(
  server: rpc.Server,
  publicKey: string
): Promise<bigint> {
  try {
    const entry = await server.getAccountEntry(publicKey);
    return BigInt(entry.balance().toString());
  } catch (err) {
    if (isAccountMissingError(err)) {
      return BigInt(0);
    }
    // Surface RPC/network failures instead of reporting a fake 0 balance,
    // so an outage is not mistaken for an empty wallet.
    throw toRpcError(err);
  }
}

/**
 * Trustline + balance for a classic asset (non-native). A missing trustline
 * is reported as `{ hasTrustline: false, balanceRaw: BigInt(0) }`, not an error.
 */
export async function getTrustline(
  server: rpc.Server,
  publicKey: string,
  token: TokenConfig
): Promise<TrustlineInfo> {
  if (token.isNative || !token.assetCode || !token.assetIssuer) {
    return { hasTrustline: true, balanceRaw: BigInt(0), authorized: true };
  }
  try {
    const res = await server.getAssetBalance(
      publicKey,
      new Asset(token.assetCode, token.assetIssuer)
    );
    if (!res.balanceEntry) {
      return { hasTrustline: false, balanceRaw: BigInt(0), authorized: false };
    }
    return {
      hasTrustline: true,
      balanceRaw: BigInt(res.balanceEntry.amount),
      authorized: res.balanceEntry.authorized,
    };
  } catch {
    return { hasTrustline: false, balanceRaw: BigInt(0), authorized: false };
  }
}

/**
 * One-shot readiness check for a payment. When `strict` (default), the first
 * blocking issue is thrown as a `WalletError` with a human-readable message;
 * otherwise the report with `issues` is returned for the UI to render.
 */
export async function assertPaymentReady(
  server: rpc.Server,
  publicKey: string,
  opts: {
    token: TokenConfig;
    requiredRaw: bigint;
    fund?: boolean;
    strict?: boolean;
  }
): Promise<PaymentReadiness> {
  const strict = opts.strict ?? true;
  const { token, requiredRaw } = opts;

  let loaded: LoadedAccount;
  try {
    loaded = await loadAccount(server, publicKey, { fund: opts.fund ?? true });
  } catch (err) {
    if (strict) throw err;
    return {
      account: null,
      funded: false,
      nativeBalanceRaw: BigInt(0),
      tokenBalanceRaw: BigInt(0),
      decimals: token.decimals,
      hasTrustline: false,
      trustlineAuthorized: false,
      requiredRaw,
      sufficientBalance: false,
      sufficientReserve: false,
      issues: [String(err instanceof Error ? err.message : err)],
    };
  }

  const [nativeBalanceRaw, trustline, decimals] = await Promise.all([
    getNativeBalance(server, publicKey),
    getTrustline(server, publicKey, token),
    readTokenDecimals(server, token.contractId).catch(() => token.decimals),
  ]);

  const tokenBalanceRaw =
    trustline.hasTrustline && trustline.balanceRaw !== BigInt(0)
      ? trustline.balanceRaw
      : await readTokenBalance(server, token.contractId, publicKey);

  const issues: string[] = [];

  if (!token.isNative && !trustline.hasTrustline) {
    issues.push(
      `Your wallet has no ${token.symbol} trustline. Add a ${token.symbol} trustline ` +
        `to your Stellar account before paying with ${token.symbol}.`
    );
  } else if (!token.isNative && !trustline.authorized) {
    issues.push(`Your ${token.symbol} trustline is not authorized for spending.`);
  }

  if (requiredRaw > BigInt(0) && tokenBalanceRaw < requiredRaw) {
    const decimals_ = decimals || token.decimals;
    const missing = formatAmount(requiredRaw - tokenBalanceRaw, decimals_);
    issues.push(
      `Insufficient ${token.symbol} balance (short ${missing}). Top up your wallet and try again.`
    );
  }

  if (nativeBalanceRaw < MIN_NATIVE_RESERVE) {
    issues.push(
      `Your account needs at least ${formatAmount(MIN_NATIVE_RESERVE, 7)} XLM to cover ` +
        `network fees and the contract footprint.`
    );
  }

  const readiness: PaymentReadiness = {
    account: loaded.account,
    funded: loaded.funded,
    nativeBalanceRaw,
    tokenBalanceRaw,
    decimals: decimals || token.decimals,
    hasTrustline: token.isNative || trustline.hasTrustline,
    trustlineAuthorized: token.isNative || trustline.authorized,
    requiredRaw,
    sufficientBalance: tokenBalanceRaw >= requiredRaw,
    sufficientReserve: nativeBalanceRaw >= MIN_NATIVE_RESERVE,
    issues,
  };

  if (strict && issues.length > 0) {
    throw new WalletError(issues[0], "PAYMENT_NOT_READY");
  }
  return readiness;
}

export function formatAmount(raw: bigint, decimals: number): string {
  const negative = raw < BigInt(0);
  const abs = negative ? -raw : raw;
  const str = abs.toString().padStart(decimals + 1, "0");
  const int = str.slice(0, str.length - decimals) || "0";
  const frac = str.slice(str.length - decimals);
  const trimmed = frac.replace(/0+$/, "");
  return `${negative ? "-" : ""}${int}${trimmed ? `.${trimmed}` : ""}`;
}
