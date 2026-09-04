import { describe, it, expect, vi } from "vitest";
import {
  formatAmount,
  MIN_NATIVE_RESERVE,
  loadAccount,
  getNativeBalance,
  isAccountNotFoundError,
} from "../../../lib/stellar/account";
import { WalletError } from "../../../lib/stellar/freighter";

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


describe("isAccountNotFoundError", () => {
  it("matches the SDK account-missing message", () => {
    expect(isAccountNotFoundError(new Error("Account not found: GTEST"))).toBe(true);
    expect(isAccountNotFoundError(new Error("account not found"))).toBe(true);
  });

  it("does not match network or RPC failures", () => {
    expect(isAccountNotFoundError(new TypeError("fetch failed"))).toBe(false);
    expect(isAccountNotFoundError(new Error("502 Bad Gateway"))).toBe(false);
    expect(isAccountNotFoundError("Account not found: GTEST")).toBe(true);
  });
});

describe("loadAccount error classification", () => {
  const PUB = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

  it("surfaces RPC/network failures without calling friendbot (testnet)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const server = {
      getAccount: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    };
    await expect(loadAccount(server, PUB, { fund: true })).rejects.toMatchObject({
      name: "WalletError",
      code: "RPC_ERROR",
    });
    expect(server.getAccount).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("still funds a genuinely missing account on testnet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const account = { sequence: "42" };
    const server = {
      getAccount: vi
        .fn()
        .mockRejectedValueOnce(new Error("Account not found: " + PUB))
        .mockResolvedValueOnce(account),
    };
    const loaded = await loadAccount(server, PUB, { fund: true });
    expect(loaded.funded).toBe(true);
    expect(loaded.account).toBe(account);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(server.getAccount).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("rejects with ACCOUNT_NOT_FOUND when funding is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const server = {
      getAccount: vi
        .fn()
        .mockRejectedValue(new Error("Account not found: " + PUB)),
    };
    await expect(loadAccount(server, PUB, { fund: false })).rejects.toMatchObject({
      name: "WalletError",
      code: "ACCOUNT_NOT_FOUND",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rejects a missing account on mainnet without funding", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.resetModules();
    const { loadAccount: loadAccountMainnet } = await import(
      "../../../lib/stellar/account"
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const server = {
      getAccount: vi
        .fn()
        .mockRejectedValue(new Error("Account not found: " + PUB)),
    };
    await expect(
      loadAccountMainnet(server, PUB, { fund: true })
    ).rejects.toMatchObject({
      name: "WalletError",
      code: "ACCOUNT_NOT_FOUND",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

describe("getNativeBalance error classification", () => {
  it("returns 0n only for a genuinely missing account", async () => {
    const server = {
      getAccountEntry: vi
        .fn()
        .mockRejectedValue(new Error("Account not found: GTEST")),
    };
    await expect(getNativeBalance(server, "GTEST")).resolves.toBe(BigInt(0));
  });

  it("surfaces RPC failures instead of returning 0n", async () => {
    const server = {
      getAccountEntry: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    };
    await expect(getNativeBalance(server, "GTEST")).rejects.toMatchObject({
      name: "WalletError",
      code: "RPC_ERROR",
    });
  });

  it("reads the balance from a resolved entry", async () => {
    const server = {
      getAccountEntry: vi
        .fn()
        .mockResolvedValue({ balance: () => ({ toString: () => "12345678" }) }),
    };
    await expect(getNativeBalance(server, "GTEST")).resolves.toBe(
      BigInt("12345678")
    );
  });
});
