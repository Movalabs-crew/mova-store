import { describe, it, expect, vi } from "vitest";
import {
  formatAmount,
  MIN_NATIVE_RESERVE,
  loadAccount,
  getNativeBalance,
  isAccountMissingError,
} from "../../../lib/stellar/account";

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

    fetchSpy.mockRestore();
  });
});

describe("getNativeBalance", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("returns balance when getAccountEntry succeeds", async () => {
    const stubServer = {
      getAccountEntry: vi.fn().mockResolvedValue({
        balance: () => "50000000",
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
