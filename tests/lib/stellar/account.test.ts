import { describe, it, expect, vi } from "vitest";
import {
  formatAmount,
  MIN_NATIVE_RESERVE,
  loadAccount,
  getNativeBalance,
  getTrustline,
  isAccountMissingError,
} from "../../../lib/stellar/account";
import { FRIENDBOT_URL } from "../../../lib/stellar/config";
import { WalletError } from "../../../lib/stellar/freighter";
import { parseError } from "../../../lib/errors";

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

  it("preserves exact precision above 2^53 (Number.MAX_SAFE_INTEGER boundary) where Number() loses precision", () => {
    // 2^53 + 1 = 9007199254740993n. In IEEE-754 double, Number(9007199254740993n) rounds down to 9007199254740992.
    const aboveSafe = 9007199254740993n;
    expect(formatAmount(aboveSafe, 0)).toBe("9007199254740993");
    expect(formatAmount(aboveSafe, 7)).toBe("900719925.4740993");
    expect(formatAmount(-aboveSafe, 7)).toBe("-900719925.4740993");

    // 2^53 + 3 = 9007199254740995n
    const aboveSafe2 = 9007199254740995n;
    expect(formatAmount(aboveSafe2, 7)).toBe("900719925.4740995");
  });

  it("formats exact values across each decimal boundary for numbers above 2^53", () => {
    const raw = 9007199254740993n;
    expect(formatAmount(raw, 0)).toBe("9007199254740993");
    expect(formatAmount(raw, 1)).toBe("900719925474099.3");
    expect(formatAmount(raw, 2)).toBe("90071992547409.93");
    expect(formatAmount(raw, 4)).toBe("900719925474.0993");
    expect(formatAmount(raw, 7)).toBe("900719925.4740993");
    expect(formatAmount(raw, 15)).toBe("9.007199254740993");
    expect(formatAmount(raw, 16)).toBe("0.9007199254740993");
    expect(formatAmount(raw, 18)).toBe("0.009007199254740993");
  });

  it("formats large Stellar i128 boundary amounts accurately without precision degradation", () => {
    const I128_MAX = (1n << 127n) - 1n; // 170141183460469231731687303715884105727n
    const I128_MIN = -(1n << 127n); // -170141183460469231731687303715884105728n

    expect(formatAmount(I128_MAX, 7)).toBe("17014118346046923173168730371588.4105727");
    expect(formatAmount(I128_MIN, 7)).toBe("-17014118346046923173168730371588.4105728");
    expect(formatAmount(I128_MAX, 0)).toBe("170141183460469231731687303715884105727");
    expect(formatAmount(I128_MIN, 0)).toBe("-170141183460469231731687303715884105728");
  });
});

describe("isAccountMissingError", () => {
  it("identifies 404 status and account not found messages", () => {
    expect(isAccountMissingError({ status: 404 })).toBe(true);
    expect(isAccountMissingError({ response: { status: 404 } })).toBe(true);
    expect(isAccountMissingError(new Error("Account not found"))).toBe(true);
    expect(isAccountMissingError(new Error("Resource not found"))).toBe(true);
    expect(isAccountMissingError(new Error("Account does not exist"))).toBe(true);
    expect(isAccountMissingError(new Error("Error code: 404"))).toBe(true);
  });

  it("identifies network and RPC outages as NOT account-missing", () => {
    expect(isAccountMissingError(new Error("Network error"))).toBe(false);
    expect(isAccountMissingError(new Error("fetch failed"))).toBe(false);
    expect(isAccountMissingError(new Error("connect ECONNREFUSED"))).toBe(false);
    expect(isAccountMissingError(new Error("request timeout"))).toBe(false);
    expect(isAccountMissingError(new Error("500 Internal Server Error"))).toBe(false);
    expect(isAccountMissingError(new Error("503 Service Unavailable"))).toBe(false);
    expect(isAccountMissingError(null)).toBe(false);
  });
});

describe("loadAccount", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("never calls friendbot and rejects when getAccount fails with a network error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const stubServer = {
      getAccount: vi.fn().mockRejectedValue(new Error("fetch failed: connection refused")),
    };

    await expect(loadAccount(stubServer as never, dummyPublicKey, { fund: true })).rejects.toThrow(
      /RPC error loading account/
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("triggers friendbot funding and re-loads account when getAccount fails with account-missing error", async () => {
    const dummyAccount = { id: dummyPublicKey, sequence: "1" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const stubServer = {
      getAccount: vi
        .fn()
        .mockRejectedValueOnce(new Error("Account not found (404)"))
        .mockResolvedValueOnce(dummyAccount),
    };

    const result = await loadAccount(stubServer as never, dummyPublicKey, { fund: true });
    expect(result.funded).toBe(true);
    expect(result.account).toBe(dummyAccount);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Friendbot is asked for this exact public key (URL-encoded)…
    expect(fetchSpy).toHaveBeenCalledWith(
      `${FRIENDBOT_URL}?addr=${encodeURIComponent(dummyPublicKey)}`
    );
    // …exactly once, and it runs between the failed lookup and the re-load:
    // a second getAccount without funding would just miss again.
    expect(stubServer.getAccount).toHaveBeenCalledTimes(2);
    expect(stubServer.getAccount).toHaveBeenNthCalledWith(1, dummyPublicKey);
    expect(stubServer.getAccount).toHaveBeenNthCalledWith(2, dummyPublicKey);
    expect(fetchSpy.mock.invocationCallOrder[0]).toBeLessThan(
      stubServer.getAccount.mock.invocationCallOrder[1]
    );

    fetchSpy.mockRestore();
  });

  it("never funds an account that already exists", async () => {
    const dummyAccount = { id: dummyPublicKey, sequence: "7" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const stubServer = { getAccount: vi.fn().mockResolvedValue(dummyAccount) };

    const result = await loadAccount(stubServer as never, dummyPublicKey, { fund: true });

    expect(result).toEqual({ account: dummyAccount, funded: false });
    expect(stubServer.getAccount).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("skips friendbot and throws ACCOUNT_NOT_FOUND when fund is false", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const stubServer = {
      getAccount: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("Account not found"), { status: 404 })),
    };

    await expect(
      loadAccount(stubServer as never, dummyPublicKey, { fund: false })
    ).rejects.toMatchObject({
      name: "WalletError",
      code: "ACCOUNT_NOT_FOUND",
      message: expect.stringContaining("Fund it with XLM before paying"),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stubServer.getAccount).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
  });

  it("surfaces an HTTP failure from friendbot as FRIENDBOT_ERROR and never re-loads", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
    } as Response);

    const stubServer = {
      getAccount: vi.fn().mockRejectedValue(new Error("Account not found (404)")),
    };

    const err = await loadAccount(stubServer as never, dummyPublicKey, { fund: true }).catch(
      (e) => e
    );

    expect(err).toBeInstanceOf(WalletError);
    expect(err).toMatchObject({ code: "FRIENDBOT_ERROR" });
    expect(err.message).toBe("Could not fund testnet account (friendbot HTTP 400).");
    // The funding attempt failed, so the account is never re-loaded a second time.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(stubServer.getAccount).toHaveBeenCalledTimes(1);
    // And the failure maps to the user-facing friendbot error, not a generic one.
    expect(parseError(err)).toMatchObject({
      code: "FRIENDBOT_FUNDING_FAILED",
      userMessage: expect.stringContaining("Friendbot"),
      action: "Retry",
    });

    fetchSpy.mockRestore();
  });

  it("surfaces a friendbot network failure as FRIENDBOT_ERROR instead of a raw fetch error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const stubServer = {
      getAccount: vi.fn().mockRejectedValue(new Error("Account not found (404)")),
    };

    const err = await loadAccount(stubServer as never, dummyPublicKey, { fund: true }).catch(
      (e) => e
    );

    expect(err).toBeInstanceOf(WalletError);
    expect(err).toMatchObject({ code: "FRIENDBOT_ERROR" });
    expect(err.message).toBe(
      "Could not fund testnet account (friendbot unreachable: fetch failed)."
    );
    expect(stubServer.getAccount).toHaveBeenCalledTimes(1);
    expect(parseError(err).code).toBe("FRIENDBOT_FUNDING_FAILED");

    fetchSpy.mockRestore();
  });
});

describe("getNativeBalance", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("returns balance when getAccountEntry succeeds", async () => {
    const stubServer = {
      getAccountEntry: vi.fn().mockResolvedValue({
        balance: 50000000n,
      }),
    };

    const balance = await getNativeBalance(stubServer as never, dummyPublicKey);
    expect(balance).toBe(50000000n);
  });

  it("surfaces RPC / network rejections rather than returning 0n", async () => {
    const stubServer = {
      getAccountEntry: vi.fn().mockRejectedValue(new Error("503 Service Unavailable: RPC timeout")),
    };

    await expect(getNativeBalance(stubServer as never, dummyPublicKey)).rejects.toThrow(
      /RPC error retrieving native balance/
    );
  });

  it("returns 0n when getAccountEntry indicates account does not exist (not found)", async () => {
    const stubServer = {
      getAccountEntry: vi.fn().mockRejectedValue(new Error("Account not found")),
    };

    const balance = await getNativeBalance(stubServer as never, dummyPublicKey);
    expect(balance).toBe(0n);
  });
});

describe("getTrustline", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const usdc = {
    isNative: false,
    assetCode: "USDC",
    assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  } as never;

  it("reports hasTrustline: false for a confirmed missing balance entry", async () => {
    const stubServer = {
      getAssetBalance: vi.fn().mockResolvedValue({ balanceEntry: null }),
    };

    const info = await getTrustline(stubServer as never, dummyPublicKey, usdc);

    expect(info).toEqual({ hasTrustline: false, balanceRaw: 0n, authorized: false });
  });

  it("returns the balance and authorization for an existing trustline", async () => {
    const stubServer = {
      getAssetBalance: vi.fn().mockResolvedValue({
        balanceEntry: { amount: "250000000", authorized: true },
      }),
    };

    const info = await getTrustline(stubServer as never, dummyPublicKey, usdc);

    expect(info).toEqual({ hasTrustline: true, balanceRaw: 250000000n, authorized: true });
  });

  it("throws an RPC_ERROR instead of reporting no trustline when the RPC call fails", async () => {
    const stubServer = {
      getAssetBalance: vi.fn().mockRejectedValue(new Error("503 Service Unavailable: RPC timeout")),
    };

    await expect(getTrustline(stubServer as never, dummyPublicKey, usdc)).rejects.toMatchObject({
      name: "WalletError",
      code: "RPC_ERROR",
    });
  });

  it("still treats a confirmed missing account as an absent trustline", async () => {
    const stubServer = {
      getAssetBalance: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("Account not found"), { status: 404 })),
    };

    const info = await getTrustline(stubServer as never, dummyPublicKey, usdc);

    expect(info).toEqual({ hasTrustline: false, balanceRaw: 0n, authorized: false });
  });

  it("returns the native trustline trivially for the native asset without an RPC call", async () => {
    const stubServer = { getAssetBalance: vi.fn() };

    const info = await getTrustline(stubServer as never, dummyPublicKey, {
      isNative: true,
    } as never);

    expect(info).toEqual({ hasTrustline: true, balanceRaw: 0n, authorized: true });
    expect(stubServer.getAssetBalance).not.toHaveBeenCalled();
  });
});
