import { describe, expect, it, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn().mockResolvedValue({ address: "G" + "A".repeat(55) }),
  getNetwork: vi.fn().mockResolvedValue({
    network: "TESTNET",
    networkPassphrase: "Test SDF Network ; September 2015",
  }),
  isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
  requestAccess: vi.fn().mockResolvedValue({ success: true, addresses: [] }),
  signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "AQ" }),
}));

import { getNetwork } from "@stellar/freighter-api";
import { WalletError, ensureNetwork, shortAddress } from "../../../lib/stellar/freighter";

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
    expect(new WalletError("nope", "FREIGHTER_NOT_FOUND").code).toBe("FREIGHTER_NOT_FOUND");
    expect(new WalletError("bad", "INVALID_AMOUNT").code).toBe("INVALID_AMOUNT");
  });
});

describe("ensureNetwork", () => {
  const mockGetNetwork = vi.mocked(getNetwork);

  it("accepts a wallet whose passphrase matches the configured network", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "TESTNET",
      networkPassphrase: Networks.TESTNET,
    });

    await expect(ensureNetwork()).resolves.toBe("TESTNET");
  });

  it("rejects a wallet whose display name matches but passphrase does not", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "TESTNET",
      networkPassphrase: Networks.PUBLIC,
    });

    await expect(ensureNetwork()).rejects.toMatchObject({
      code: "WRONG_NETWORK",
      message: expect.stringContaining("TESTNET"),
    });
  });

  it("rejects an unexpected network instead of silently passing", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "STANDALONE",
      networkPassphrase: "Standalone Network ; February 2017",
    });

    await expect(ensureNetwork()).rejects.toMatchObject({
      code: "WRONG_NETWORK",
    });
  });

  it("rejects a wallet that reports no passphrase at all", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "FUTURENET",
      networkPassphrase: "",
    });

    await expect(ensureNetwork()).rejects.toMatchObject({
      code: "WRONG_NETWORK",
    });
  });

  it("accepts a non-testnet/mainnet label when its passphrase matches", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "CUSTOM",
      networkPassphrase: Networks.TESTNET,
    });

    await expect(ensureNetwork()).resolves.toBe("CUSTOM");
  });

  it("surfaces a Freighter network lookup error", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "",
      networkPassphrase: "",
      error: { message: "extension unavailable" } as never,
    });

    await expect(ensureNetwork()).rejects.toMatchObject({
      code: "FREIGHTER_NETWORK_ERROR",
    });
  });
});
