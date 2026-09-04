import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

import {
  WalletError,
  shortAddress,
  freighterAvailable,
  connectWallet,
  currentAddress,
  ensureNetwork,
  signWithFreighter,
} from "../../../lib/stellar/freighter";

const mockGetAddress = vi.mocked(getAddress);
const mockGetNetwork = vi.mocked(getNetwork);
const mockIsConnected = vi.mocked(isConnected);
const mockRequestAccess = vi.mocked(requestAccess);
const mockSignTransaction = vi.mocked(signTransaction);

const SAMPLE_STELLAR_ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("shortAddress", () => {
  it("returns empty string when input is null or empty", () => {
    expect(shortAddress(null as unknown as string)).toBe("");
    expect(shortAddress(undefined as unknown as string)).toBe("");
    expect(shortAddress("")).toBe("");
  });

  it("returns strings at or below the default ellipsis threshold unchanged", () => {
    expect(shortAddress("GABC123")).toBe("GABC123");
    const fifteenCharAddress = "123456789012345";
    expect(shortAddress(fifteenCharAddress)).toBe(fifteenCharAddress);
  });

  it("truncates 56-character Stellar address to first and last 6 characters", () => {
    expect(shortAddress(SAMPLE_STELLAR_ADDRESS)).toBe("GBBD47…LLFLA5");
  });

  it("honours custom chars argument", () => {
    expect(shortAddress(SAMPLE_STELLAR_ADDRESS, 4)).toBe("GBBD…FLA5");
    expect(shortAddress(SAMPLE_STELLAR_ADDRESS, 8)).toBe("GBBD47IF…3ZLLFLA5");
  });

  it("returns strings unchanged when at or below custom threshold", () => {
    const elevenCharAddress = "12345678901";
    expect(shortAddress(elevenCharAddress, 4)).toBe(elevenCharAddress);
  });

  it("truncates strings exceeding custom threshold", () => {
    const twelveCharAddress = "123456789012";
    expect(shortAddress(twelveCharAddress, 4)).toBe("1234…9012");
  });
});

describe("WalletError", () => {
  it("creates instance with correct prototype inheritance and default code", () => {
    const error = new WalletError("operation failed");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WalletError);
    expect(error.name).toBe("WalletError");
    expect(error.message).toBe("operation failed");
    expect(error.code).toBe("WALLET_ERROR");
  });

  it("preserves custom error codes", () => {
    const notFoundError = new WalletError("Freighter extension missing", "FREIGHTER_NOT_FOUND");
    expect(notFoundError.code).toBe("FREIGHTER_NOT_FOUND");
    expect(notFoundError.message).toBe("Freighter extension missing");

    const invalidAmountError = new WalletError("Amount out of bounds", "INVALID_AMOUNT");
    expect(invalidAmountError.code).toBe("INVALID_AMOUNT");
  });
});

describe("freighterAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when isConnected reports true", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: true });
    const available = await freighterAvailable();
    expect(available).toBe(true);
  });

  it("returns false when isConnected reports false", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: false });
    const available = await freighterAvailable();
    expect(available).toBe(false);
  });

  it("returns false when isConnected rejects with error", async () => {
    mockIsConnected.mockRejectedValueOnce(new Error("freighter extension missing"));
    const available = await freighterAvailable();
    expect(available).toBe(false);
  });
});

describe("connectWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws WalletError with FREIGHTER_NOT_FOUND when freighter is unavailable", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: false });
    await expect(connectWallet()).rejects.toMatchObject({
      name: "WalletError",
      code: "FREIGHTER_NOT_FOUND",
      message:
        "Freighter is not installed. Install the Freighter wallet extension to pay with USDC.",
    });
  });

  it("throws WalletError with FREIGHTER_REQUEST_DENIED when access request returns error", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: true });
    mockRequestAccess.mockResolvedValueOnce({
      address: "",
      error:
        "User rejected connection request" as unknown as import("@stellar/freighter-api").FreighterApiError,
    });
    await expect(connectWallet()).rejects.toMatchObject({
      name: "WalletError",
      code: "FREIGHTER_REQUEST_DENIED",
      message: "User rejected connection request",
    });
  });

  it("returns wallet address when connection succeeds", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: true });
    mockRequestAccess.mockResolvedValueOnce({
      address: SAMPLE_STELLAR_ADDRESS,
    });
    const address = await connectWallet();
    expect(address).toBe(SAMPLE_STELLAR_ADDRESS);
  });
});

describe("currentAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when freighter is unavailable", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: false });
    const address = await currentAddress();
    expect(address).toBeNull();
  });

  it("returns null when getAddress returns an error", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: true });
    mockGetAddress.mockResolvedValueOnce({
      address: "",
      error: "Wallet locked" as unknown as import("@stellar/freighter-api").FreighterApiError,
    });
    const address = await currentAddress();
    expect(address).toBeNull();
  });

  it("returns null when getAddress returns empty address string", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: true });
    mockGetAddress.mockResolvedValueOnce({
      address: "",
    });
    const address = await currentAddress();
    expect(address).toBeNull();
  });

  it("returns address when getAddress succeeds", async () => {
    mockIsConnected.mockResolvedValueOnce({ isConnected: true });
    mockGetAddress.mockResolvedValueOnce({
      address: SAMPLE_STELLAR_ADDRESS,
    });
    const address = await currentAddress();
    expect(address).toBe(SAMPLE_STELLAR_ADDRESS);
  });
});

describe("ensureNetwork", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws WalletError with FREIGHTER_NETWORK_ERROR when getNetwork returns error", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "",
      networkPassphrase: "",
      error:
        "Network query failure" as unknown as import("@stellar/freighter-api").FreighterApiError,
    });
    await expect(ensureNetwork()).rejects.toMatchObject({
      name: "WalletError",
      code: "FREIGHTER_NETWORK_ERROR",
      message: "Network query failure",
    });
  });

  it("throws WalletError with WRONG_NETWORK when detected network mismatches configured network", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
    await expect(ensureNetwork()).rejects.toMatchObject({
      name: "WalletError",
      code: "WRONG_NETWORK",
    });
  });

  it("returns detected network when matching configured network", async () => {
    mockGetNetwork.mockResolvedValueOnce({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    const detected = await ensureNetwork();
    expect(detected).toBe("TESTNET");
  });
});

describe("signWithFreighter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws WalletError with FREIGHTER_SIGN_ERROR when signTransaction returns error", async () => {
    mockSignTransaction.mockResolvedValueOnce({
      signedTxXdr: "",
      signerAddress: SAMPLE_STELLAR_ADDRESS,
      error:
        "User cancelled signing" as unknown as import("@stellar/freighter-api").FreighterApiError,
    });
    await expect(signWithFreighter("AAAA...", SAMPLE_STELLAR_ADDRESS)).rejects.toMatchObject({
      name: "WalletError",
      code: "FREIGHTER_SIGN_ERROR",
      message: "User cancelled signing",
    });
  });

  it("throws WalletError with FREIGHTER_SIGN_ERROR when signedTxXdr is missing", async () => {
    mockSignTransaction.mockResolvedValueOnce({
      signedTxXdr: "",
      signerAddress: SAMPLE_STELLAR_ADDRESS,
    });
    await expect(signWithFreighter("AAAA...", SAMPLE_STELLAR_ADDRESS)).rejects.toMatchObject({
      name: "WalletError",
      code: "FREIGHTER_SIGN_ERROR",
      message: "Freighter did not return a signed transaction.",
    });
  });

  it("returns signedTxXdr when signTransaction succeeds", async () => {
    const signedXdr = "AAAA_SIGNED_XDR_DATA";
    mockSignTransaction.mockResolvedValueOnce({
      signedTxXdr: signedXdr,
      signerAddress: SAMPLE_STELLAR_ADDRESS,
    });
    const result = await signWithFreighter("AAAA_UNSIGNED_XDR", SAMPLE_STELLAR_ADDRESS);
    expect(result).toBe(signedXdr);
    expect(mockSignTransaction).toHaveBeenCalledWith(
      "AAAA_UNSIGNED_XDR",
      expect.objectContaining({
        address: SAMPLE_STELLAR_ADDRESS,
      })
    );
  });
});
