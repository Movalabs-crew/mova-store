import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

// 64-char Stellar-style test address (G + 63 base32 chars)
const TEST_ADDRESS =
  "GB7XKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  signTransaction: vi.fn(),
}));

// Import after the mock is declared.
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";
import StellarWalletButton from "../../components/StellarWalletButton";

describe("StellarWalletButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Freighter extension is present; not yet connected, so the button shows.
    // currentAddress() returns null (getAddress -> null), so no auto-connect on mount.
    isConnected.mockResolvedValue({ isConnected: true });
    getAddress.mockResolvedValue({ address: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("connects on click instead of throwing ReferenceError for connectWallet", async () => {
    requestAccess.mockResolvedValue({ address: TEST_ADDRESS });
    const onConnect = vi.fn();
    render(<StellarWalletButton onConnect={onConnect} />);

    const button = screen.getByRole("button", { name: /connect freighter/i });
    // Regression: before the connectWallet import was added, this click
    // threw "ReferenceError: connectWallet is not defined" and requestAccess
    // was never reached.
    await fireEvent.click(button);

    await waitFor(() => expect(requestAccess).toHaveBeenCalledTimes(1));
    expect(onConnect).toHaveBeenCalledWith(TEST_ADDRESS);

    // After a successful connect the button is replaced by the short address.
    await waitFor(() =>
      expect(screen.getByText(new RegExp(TEST_ADDRESS.slice(0, 6)))).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("button", { name: /connect freighter/i })
    ).not.toBeInTheDocument();
  });

  it("shows the wallet error message when requestAccess is denied", async () => {
    requestAccess.mockResolvedValue({ error: new Error("User denied") });
    render(<StellarWalletButton />);

    const button = screen.getByRole("button", { name: /connect freighter/i });
    await fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(/user denied/i)).toBeInTheDocument());
    // Still in the not-connected state.
    expect(
      screen.getByRole("button", { name: /connect freighter/i })
    ).toBeInTheDocument();
  });
});
