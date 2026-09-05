import { describe, it, expect, vi } from "vitest";
import { Account, rpc } from "@stellar/stellar-sdk";
import {
  formatAmount,
  loadAccount,
  fundTestnetAccount,
  getNativeBalance,
  getTrustline,
  assertPaymentReady,
  MIN_NATIVE_RESERVE,
} from "../../../lib/stellar/account";
import { TokenConfig } from "../../../lib/stellar/config";

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
    const huge = 1n << 80n;
    const formatted = formatAmount(huge, 7);
    const expectedInt = (huge / 10000000n).toString();
    const expectedFrac = (huge % 10000000n).toString().padStart(7, "0").replace(/0+$/, "");
    const expected = expectedFrac ? `${expectedInt}.${expectedFrac}` : expectedInt;
    expect(formatted).toBe(expected);
  });
});

describe("loadAccount", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const dummyAccount = new Account(dummyPublicKey, "100");

  it("returns account when getAccount succeeds", async () => {
    const mockServer = {
      getAccount: vi.fn().mockResolvedValue(dummyAccount),
    } as unknown as rpc.Server;

    const result = await loadAccount(mockServer, dummyPublicKey);
    expect(result).toEqual({ account: dummyAccount, funded: false });
    expect(mockServer.getAccount).toHaveBeenCalledWith(dummyPublicKey);
  });

  it("funds account on testnet when getAccount initially throws and fund is true", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const mockServer = {
      getAccount: vi
        .fn()
        .mockRejectedValueOnce(new Error("Account not found"))
        .mockResolvedValueOnce(dummyAccount),
    } as unknown as rpc.Server;

    const result = await loadAccount(mockServer, dummyPublicKey, { fund: true });
    expect(result).toEqual({ account: dummyAccount, funded: true });
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("throws ACCOUNT_NOT_FOUND when getAccount throws and fund is false", async () => {
    const mockServer = {
      getAccount: vi.fn().mockRejectedValue(new Error("Account not found")),
    } as unknown as rpc.Server;

    await expect(
      loadAccount(mockServer, dummyPublicKey, { fund: false })
    ).rejects.toMatchObject({
      code: "ACCOUNT_NOT_FOUND",
    });
  });
});

describe("fundTestnetAccount", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("resolves when friendbot returns 200 OK", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await expect(fundTestnetAccount(dummyPublicKey)).resolves.toBeUndefined();
    fetchSpy.mockRestore();
  });

  it("throws FRIENDBOT_ERROR when friendbot returns non-ok status", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fundTestnetAccount(dummyPublicKey)).rejects.toMatchObject({
      code: "FRIENDBOT_ERROR",
    });
    fetchSpy.mockRestore();
  });
});

describe("getNativeBalance", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("returns native balance in stroops when account entry exists", async () => {
    const mockServer = {
      getAccountEntry: vi.fn().mockResolvedValue({
        balance: () => ({ toString: () => "50000000" }),
      }),
    } as unknown as rpc.Server;

    const balance = await getNativeBalance(mockServer, dummyPublicKey);
    expect(balance).toBe(50000000n);
  });

  it("returns 0n when getAccountEntry throws", async () => {
    const mockServer = {
      getAccountEntry: vi.fn().mockRejectedValue(new Error("Not found")),
    } as unknown as rpc.Server;

    const balance = await getNativeBalance(mockServer, dummyPublicKey);
    expect(balance).toBe(0n);
  });
});

describe("getTrustline", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const usdcToken: TokenConfig = {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
    contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    assetCode: "USDC",
    assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  };
  const nativeToken: TokenConfig = {
    symbol: "XLM",
    name: "Stellar Lumens",
    decimals: 7,
    contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    isNative: true,
  };

  it("returns trustline true for native tokens without calling RPC", async () => {
    const mockServer = {
      getAssetBalance: vi.fn(),
    } as unknown as rpc.Server;

    const res = await getTrustline(mockServer, dummyPublicKey, nativeToken);
    expect(res).toEqual({ hasTrustline: true, balanceRaw: 0n, authorized: true });
    expect(mockServer.getAssetBalance).not.toHaveBeenCalled();
  });

  it("returns trustline details when balanceEntry exists", async () => {
    const mockServer = {
      getAssetBalance: vi.fn().mockResolvedValue({
        balanceEntry: { amount: "15000000", authorized: true },
      }),
    } as unknown as rpc.Server;

    const res = await getTrustline(mockServer, dummyPublicKey, usdcToken);
    expect(res).toEqual({ hasTrustline: true, balanceRaw: 15000000n, authorized: true });
  });

  it("returns hasTrustline false when balanceEntry is null", async () => {
    const mockServer = {
      getAssetBalance: vi.fn().mockResolvedValue({ balanceEntry: null }),
    } as unknown as rpc.Server;

    const res = await getTrustline(mockServer, dummyPublicKey, usdcToken);
    expect(res).toEqual({ hasTrustline: false, balanceRaw: 0n, authorized: false });
  });

  it("returns hasTrustline false when getAssetBalance throws", async () => {
    const mockServer = {
      getAssetBalance: vi.fn().mockRejectedValue(new Error("RPC error")),
    } as unknown as rpc.Server;

    const res = await getTrustline(mockServer, dummyPublicKey, usdcToken);
    expect(res).toEqual({ hasTrustline: false, balanceRaw: 0n, authorized: false });
  });
});

describe("assertPaymentReady", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const dummyAccount = new Account(dummyPublicKey, "100");
  const usdcToken: TokenConfig = {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
    contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    assetCode: "USDC",
    assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  };

  it("returns ready state when account has trustline and sufficient balances", async () => {
    const mockServer = {
      getAccount: vi.fn().mockResolvedValue(dummyAccount),
      getAccountEntry: vi.fn().mockResolvedValue({
        balance: () => ({ toString: () => "50000000" }), // 5 XLM > 1 XLM reserve
      }),
      getAssetBalance: vi.fn().mockResolvedValue({
        balanceEntry: { amount: "100000000", authorized: true }, // 10 USDC
      }),
      simulateTransaction: vi.fn().mockResolvedValue({
        result: { retval: null },
      }),
    } as unknown as rpc.Server;

    const res = await assertPaymentReady(mockServer, dummyPublicKey, {
      token: usdcToken,
      requiredRaw: 50000000n, // 5 USDC
      strict: true,
    });

    expect(res.sufficientBalance).toBe(true);
    expect(res.sufficientReserve).toBe(true);
    expect(res.hasTrustline).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it("throws PAYMENT_NOT_READY in strict mode when trustline is missing", async () => {
    const mockServer = {
      getAccount: vi.fn().mockResolvedValue(dummyAccount),
      getAccountEntry: vi.fn().mockResolvedValue({
        balance: () => ({ toString: () => "50000000" }),
      }),
      getAssetBalance: vi.fn().mockResolvedValue({ balanceEntry: null }),
      simulateTransaction: vi.fn().mockResolvedValue({
        result: { retval: null },
      }),
    } as unknown as rpc.Server;

    await expect(
      assertPaymentReady(mockServer, dummyPublicKey, {
        token: usdcToken,
        requiredRaw: 10000000n,
        strict: true,
      })
    ).rejects.toMatchObject({
      code: "PAYMENT_NOT_READY",
      message: expect.stringContaining("has no USDC trustline"),
    });
  });

  it("returns issues array in non-strict mode without throwing", async () => {
    const mockServer = {
      getAccount: vi.fn().mockResolvedValue(dummyAccount),
      getAccountEntry: vi.fn().mockResolvedValue({
        balance: () => ({ toString: () => "5000000" }), // 0.5 XLM < 1 XLM
      }),
      getAssetBalance: vi.fn().mockResolvedValue({ balanceEntry: null }),
      simulateTransaction: vi.fn().mockResolvedValue({
        result: { retval: null },
      }),
    } as unknown as rpc.Server;

    const res = await assertPaymentReady(mockServer, dummyPublicKey, {
      token: usdcToken,
      requiredRaw: 10000000n,
      strict: false,
    });

    expect(res.sufficientBalance).toBe(false);
    expect(res.sufficientReserve).toBe(false);
    expect(res.hasTrustline).toBe(false);
    expect(res.issues.length).toBeGreaterThan(0);
  });

  it("handles loadAccount failure in non-strict mode gracefully", async () => {
    const mockServer = {
      getAccount: vi.fn().mockRejectedValue(new Error("RPC unavailable")),
    } as unknown as rpc.Server;

    const res = await assertPaymentReady(mockServer, dummyPublicKey, {
      token: usdcToken,
      requiredRaw: 10000000n,
      fund: false,
      strict: false,
    });

    expect(res.account).toBeNull();
    expect(res.funded).toBe(false);
    expect(res.sufficientBalance).toBe(false);
    expect(res.issues).toHaveLength(1);
  });
});
