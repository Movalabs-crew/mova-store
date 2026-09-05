import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    const huge = 1n << 80n; // 1208925819614629174706176n
    const formatted = formatAmount(huge, 7);
    const expectedInt = (huge / 10000000n).toString();
    const expectedFrac = (huge % 10000000n).toString().padStart(7, "0").replace(/0+$/, "");
    const expected = expectedFrac ? `${expectedInt}.${expectedFrac}` : expectedInt;
    expect(formatted).toBe(expected);
  });
});

describe("loadAccount / getNativeBalance RPC error distinction", () => {
  const publicKey = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"; // valid StrKey-checksummed address
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function makeServer(accountErr?: unknown, account?: unknown, entryErr?: unknown, entry?: unknown) {
    return {
      getAccount: vi.fn().mockImplementation(() => {
        if (accountErr) return Promise.reject(accountErr);
        return Promise.resolve(account);
      }),
      getAccountEntry: vi.fn().mockImplementation(() => {
        if (entryErr) return Promise.reject(entryErr);
        return Promise.resolve(entry);
      }),
    } as unknown as Parameters<typeof loadAccount>[0];
  }

  it("does not call friendbot and rejects with RPC_ERROR when getAccount fails with a network error", async () => {
    const server = makeServer(new Error("fetch failed: ECONNREFUSED"));
    await expect(loadAccount(server, publicKey, { fund: true })).rejects.toMatchObject({
      name: "WalletError",
      code: "RPC_ERROR",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still funds via friendbot when the rejection is an account-missing error", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const account = { accountId: () => publicKey, sequenceNumber: () => "1" };
    const server = makeServer(undefined, account);
    server.getAccount
      .mockRejectedValueOnce(new Error("account not found"))
      .mockResolvedValueOnce(account);
    const result = await loadAccount(server, publicKey, { fund: true });
    expect(result.funded).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("friendbot");
  });

  it("surfaces an RPC failure from getNativeBalance instead of returning BigInt(0)", async () => {
    const server = makeServer(undefined, undefined, new Error("502 Bad Gateway"));
    await expect(getNativeBalance(server, publicKey)).rejects.toMatchObject({
      code: "RPC_ERROR",
    });
  });

  it("returns BigInt(0) only for a genuine account-missing error", async () => {
    const server = makeServer(undefined, undefined, new Error("account not found"));
    await expect(getNativeBalance(server, publicKey)).resolves.toBe(BigInt(0));
  });
});

describe("isAccountMissingError status detection", () => {
  it("detects a numeric 404 status from err.status or err.response.status", () => {
    expect(isAccountMissingError({ status: 404 })).toBe(true);
    expect(isAccountMissingError({ response: { status: 404 } })).toBe(true);
  });

  it("treats other statuses as NOT account-missing", () => {
    expect(isAccountMissingError({ status: 500 })).toBe(false);
    expect(isAccountMissingError({ status: 503 })).toBe(false);
    expect(isAccountMissingError({ response: { status: 403 } })).toBe(false);
    expect(isAccountMissingError(null)).toBe(false);
  });

  it("keeps account-context requirement for text matches", () => {
    // "not found" alone (e.g. a wrong endpoint path) must not read as a
    // missing account; only account-specific phrasing does.
    expect(isAccountMissingError(new Error("Resource not found"))).toBe(false);
    expect(isAccountMissingError(new Error("account not found"))).toBe(true);
  });
});
