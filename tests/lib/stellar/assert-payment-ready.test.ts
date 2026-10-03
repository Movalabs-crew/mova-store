import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Account } from "@stellar/stellar-sdk";

import { assertPaymentReady, MIN_NATIVE_RESERVE } from "../../../lib/stellar/account";
import { FRIENDBOT_URL, SUPPORTED_TOKENS, TokenConfig } from "../../../lib/stellar/config";
import { WalletError } from "../../../lib/stellar/freighter";
import * as simulateMod from "../../../lib/stellar/simulate";

// `assertPaymentReady` had no direct coverage at all: tests/lib/stellar/account.test.ts
// only exercises formatAmount / isAccountMissingError / loadAccount / getNativeBalance,
// and tests/lib/stellar/checkout.test.ts stubs the function out. These tests drive the
// real readiness check through every blocking dimension (issue #547).

const PUBLIC_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ACCOUNT = new Account(PUBLIC_KEY, "42");
/** 1 token unit in raw units — both supported tokens use 7 decimals. */
const ONE_UNIT = BigInt(10000000);

function registryToken(isNative: boolean): TokenConfig {
  const found = SUPPORTED_TOKENS.find((token) => Boolean(token.isNative) === isNative);
  if (!found) {
    throw new Error(`token registry is missing its ${isNative ? "native" : "non-native"} entry`);
  }
  return found;
}

const USDC = registryToken(false);
const XLM = registryToken(true);

interface TrustlineStub {
  amount: bigint;
  authorized: boolean;
}

/** Account exists; native balance and classic trustline are scripted. */
function stubServer(opts: { nativeBalanceRaw: bigint; trustline?: TrustlineStub | null }) {
  return {
    getAccount: vi.fn().mockResolvedValue(ACCOUNT),
    getAccountEntry: vi.fn().mockResolvedValue({
      balance: opts.nativeBalanceRaw,
    }),
    getAssetBalance: vi.fn().mockResolvedValue({
      balanceEntry: opts.trustline
        ? {
            amount: opts.trustline.amount.toString(),
            authorized: opts.trustline.authorized,
          }
        : null,
    }),
  };
}

/** Account does not exist on the ledger. */
function missingAccountServer() {
  return {
    getAccount: vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("Account not found"), { status: 404 })),
    getAccountEntry: vi.fn(),
    getAssetBalance: vi.fn(),
  };
}

beforeEach(() => {
  // SAC reads are simulated over the network; script them so readiness is decided
  // by the account/trustline stubs alone. `readTokenDecimals` is called for every
  // token and falls back to the registry value when the simulation fails.
  vi.spyOn(simulateMod, "readTokenDecimals").mockResolvedValue(USDC.decimals);
  vi.spyOn(simulateMod, "readTokenBalance").mockResolvedValue(BigInt(0));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assertPaymentReady — strict mode (issue #547)", () => {
  it("throws PAYMENT_NOT_READY naming the missing trustline", async () => {
    const server = stubServer({ nativeBalanceRaw: 2n * ONE_UNIT, trustline: null });

    const err = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: true,
    }).catch((e) => e);

    expect(err).toBeInstanceOf(WalletError);
    expect(err).toMatchObject({ name: "WalletError", code: "PAYMENT_NOT_READY" });
    expect(err.message).toBe(
      `Your wallet has no ${USDC.symbol} trustline. Add a ${USDC.symbol} trustline ` +
        `to your Stellar account before paying with ${USDC.symbol}.`
    );
  });

  it("throws PAYMENT_NOT_READY when the trustline exists but is not authorized", async () => {
    const server = stubServer({
      nativeBalanceRaw: 2n * ONE_UNIT,
      trustline: { amount: 50n * ONE_UNIT, authorized: false },
    });

    const err = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: true,
    }).catch((e) => e);

    expect(err).toMatchObject({ name: "WalletError", code: "PAYMENT_NOT_READY" });
    expect(err.message).toBe(`Your ${USDC.symbol} trustline is not authorized for spending.`);
  });

  it("throws PAYMENT_NOT_READY when the authorized balance is short, naming the shortfall", async () => {
    const server = stubServer({
      nativeBalanceRaw: 2n * ONE_UNIT,
      trustline: { amount: 3_000_000n, authorized: true },
    });

    // 0.3 USDC held against a 1 USDC payment → 0.7 short.
    const err = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: true,
    }).catch((e) => e);

    expect(err).toMatchObject({ name: "WalletError", code: "PAYMENT_NOT_READY" });
    expect(err.message).toBe(
      "Insufficient USDC balance (short 0.7). Top up your wallet and try again."
    );
  });

  it("throws PAYMENT_NOT_READY when the native balance cannot cover the fixed reserve", async () => {
    const server = stubServer({
      nativeBalanceRaw: 5_000_000n, // 0.5 XLM, below MIN_NATIVE_RESERVE
      trustline: { amount: 50n * ONE_UNIT, authorized: true },
    });

    const err = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: true,
    }).catch((e) => e);

    expect(err).toMatchObject({ name: "WalletError", code: "PAYMENT_NOT_READY" });
    expect(err.message).toBe(
      "Your account needs at least 1 XLM to cover network fees and the contract footprint."
    );
  });

  it("native token: a balance covering the payment but not payment + reserve is not ready", async () => {
    const server = stubServer({ nativeBalanceRaw: 12_000_000n, trustline: null });

    // 1.2 XLM held, 0.5 XLM payment, 1 XLM reserve → 1.5 XLM required.
    const err = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: XLM,
      requiredRaw: 5_000_000n,
      strict: true,
    }).catch((e) => e);

    expect(err).toMatchObject({ name: "WalletError", code: "PAYMENT_NOT_READY" });
    expect(err.message).toBe(
      "Your account needs at least 1.5 XLM to cover payment and network fees and the contract footprint."
    );
    // Native XLM has no trustline to look up.
    expect(server.getAssetBalance).not.toHaveBeenCalled();
  });

  it("rethrows the account-loading error instead of a PAYMENT_NOT_READY when the account is missing", async () => {
    const server = missingAccountServer();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const err = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      fund: false,
      strict: true,
    }).catch((e) => e);

    // The unfunded-account dimension originates inside loadAccount, so strict mode
    // surfaces that error unchanged — it is not rewrapped as PAYMENT_NOT_READY.
    expect(err).toBeInstanceOf(WalletError);
    expect(err).toMatchObject({ name: "WalletError", code: "ACCOUNT_NOT_FOUND" });
    expect(err.message).toContain("Fund it with XLM before paying");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(server.getAccountEntry).not.toHaveBeenCalled();
  });

  it("defaults to strict when the option is omitted", async () => {
    const server = stubServer({ nativeBalanceRaw: 2n * ONE_UNIT, trustline: null });

    await expect(
      assertPaymentReady(server as never, PUBLIC_KEY, { token: USDC, requiredRaw: ONE_UNIT })
    ).rejects.toMatchObject({ code: "PAYMENT_NOT_READY" });
  });
});

describe("assertPaymentReady — non-strict report (issue #547)", () => {
  it("returns a null-account report instead of throwing when the account cannot be loaded", async () => {
    const server = missingAccountServer();

    const report = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      // Required amount is zero so the false flags below can only come from the
      // missing account, not from a balance comparison.
      requiredRaw: BigInt(0),
      fund: false,
      strict: false,
    });

    expect(report.account).toBeNull();
    expect(report.funded).toBe(false);
    expect(report.nativeBalanceRaw).toBe(BigInt(0));
    expect(report.tokenBalanceRaw).toBe(BigInt(0));
    expect(report.decimals).toBe(USDC.decimals);
    expect(report.hasTrustline).toBe(false);
    expect(report.trustlineAuthorized).toBe(false);
    expect(report.requiredRaw).toBe(BigInt(0));
    expect(report.sufficientBalance).toBe(false);
    expect(report.sufficientReserve).toBe(false);
    expect(report.issues).toEqual([
      "Your Stellar account has no sequence number on this network. Fund it with XLM before paying.",
    ]);
  });

  it("reports every blocking issue for a non-native token, in evaluation order", async () => {
    const server = stubServer({ nativeBalanceRaw: 5_000_000n, trustline: null });

    const report = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: false,
    });

    // Trustline first, then the token balance, then the native reserve. The
    // missing trustline does not also produce a "not authorized" entry.
    expect(report.issues).toEqual([
      `Your wallet has no ${USDC.symbol} trustline. Add a ${USDC.symbol} trustline ` +
        `to your Stellar account before paying with ${USDC.symbol}.`,
      "Insufficient USDC balance (short 1). Top up your wallet and try again.",
      "Your account needs at least 1 XLM to cover network fees and the contract footprint.",
    ]);
    expect(report.account).toBe(ACCOUNT);
    expect(report.funded).toBe(false);
    expect(report.hasTrustline).toBe(false);
    expect(report.trustlineAuthorized).toBe(false);
    expect(report.sufficientBalance).toBe(false);
    expect(report.sufficientReserve).toBe(false);
  });

  it("returns a clean report and skips the SAC balance read when the trustline already covers the amount", async () => {
    const server = stubServer({
      nativeBalanceRaw: 2n * ONE_UNIT,
      trustline: { amount: 50n * ONE_UNIT, authorized: true },
    });

    const report = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: false,
    });

    expect(report).toEqual({
      account: ACCOUNT,
      funded: false,
      nativeBalanceRaw: 20_000_000n,
      tokenBalanceRaw: 500_000_000n,
      decimals: 7,
      hasTrustline: true,
      trustlineAuthorized: true,
      requiredRaw: 10_000_000n,
      sufficientBalance: true,
      sufficientReserve: true,
      issues: [],
    });
    // The classic trustline balance is authoritative, so no contract read is made.
    expect(simulateMod.readTokenBalance).not.toHaveBeenCalled();
  });

  it("native token: mirrors the native balance into tokenBalanceRaw and enforces payment + reserve", async () => {
    const server = stubServer({ nativeBalanceRaw: 20n * ONE_UNIT, trustline: null });

    const report = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: XLM,
      requiredRaw: 5n * ONE_UNIT,
      strict: false,
    });

    expect(report.tokenBalanceRaw).toBe(report.nativeBalanceRaw);
    expect(report.tokenBalanceRaw).toBe(200_000_000n);
    expect(report.hasTrustline).toBe(true);
    expect(report.trustlineAuthorized).toBe(true);
    expect(report.sufficientBalance).toBe(true);
    expect(report.sufficientReserve).toBe(true);
    expect(report.issues).toEqual([]);
    expect(server.getAssetBalance).not.toHaveBeenCalled();
    expect(simulateMod.readTokenBalance).not.toHaveBeenCalled();
  });

  it("treats an exactly sufficient balance as sufficient (>= boundary)", async () => {
    const server = stubServer({
      nativeBalanceRaw: MIN_NATIVE_RESERVE,
      trustline: { amount: ONE_UNIT, authorized: true },
    });

    const report = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
      strict: false,
    });

    expect(report.issues).toEqual([]);
    expect(report.sufficientBalance).toBe(true);
    expect(report.sufficientReserve).toBe(true);
  });

  it("funds a missing account through friendbot on testnet and reports funded: true", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    const server = {
      getAccount: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("Account not found"), { status: 404 }))
        .mockResolvedValueOnce(ACCOUNT),
      getAccountEntry: vi.fn().mockResolvedValue({ balance: 20000000n }),
      getAssetBalance: vi.fn().mockResolvedValue({
        balanceEntry: { amount: "500000000", authorized: true },
      }),
    };

    const report = await assertPaymentReady(server as never, PUBLIC_KEY, {
      token: USDC,
      requiredRaw: ONE_UNIT,
    });

    expect(report.funded).toBe(true);
    expect(report.account).toBe(ACCOUNT);
    expect(report.issues).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${FRIENDBOT_URL}?addr=${encodeURIComponent(PUBLIC_KEY)}`
    );
    expect(server.getAccount).toHaveBeenCalledTimes(2);
  });
});
