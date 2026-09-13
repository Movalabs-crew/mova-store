import { describe, expect, it, vi } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn().mockResolvedValue({ address: "G" + "A".repeat(55) }),
  getNetwork: vi.fn().mockResolvedValue({ passphrase: "Test SDF" }),
  isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
  requestAccess: vi.fn().mockResolvedValue({ success: true, addresses: [] }),
  signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "AQ" }),
}));

import { WalletError, shortAddress } from "../../../lib/stellar/freighter";

const ADDRESS56 = "G" + "A".repeat(55);

describe("shortAddress", () => {
  it("returns an empty string for null or empty input", () => {
    expect(shortAddress(null as unknown as string)).toBe("");
    expect(shortAddress("")).toBe("");
  });

  it("returns addresses at or below the threshold unchanged", () => {
    expect(shortAddress("GABC123")).toBe("GABC123");
    // default chars = 6 -> threshold is chars * 2 + 3 = 15
    const exactlyAtThreshold = "G" + "A".repeat(14);
    expect(shortAddress(exactlyAtThreshold)).toBe(exactlyAtThreshold);
  });

  it("truncates a 56-char Stellar address to the first and last 6 chars", () => {
    expect(shortAddress(ADDRESS56)).toBe("GAAAAA…AAAAAA");
  });

  it("honours a custom chars argument", () => {
    expect(shortAddress(ADDRESS56, 4)).toBe("GAAA…AAAA");
  });
});

describe("WalletError", () => {
  it("is an Error named WalletError with the default code", () => {
    const err = new WalletError("wallet not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WalletError);
    expect(err.name).toBe("WalletError");
    expect(err.message).toBe("wallet not found");
    expect(err.code).toBe("WALLET_ERROR");
  });

  it("preserves custom codes used by the UI", () => {
    expect(
      new WalletError("nope", "FREIGHTER_NOT_FOUND").code
    ).toBe("FREIGHTER_NOT_FOUND");
    expect(new WalletError("bad", "INVALID_AMOUNT").code).toBe(
      "INVALID_AMOUNT"
    );
  });
});
