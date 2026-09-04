import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const {
  mockConnectWallet,
  mockCurrentAddress,
  mockFreighterAvailable,
  mockShortAddress,
  WalletError,
} = vi.hoisted(() => {
  class WalletError extends Error {
    constructor(message, code = "WALLET_ERROR") {
      super(message);
      this.name = "WalletError";
      this.code = code;
    }
  }
  return {
    mockConnectWallet: vi.fn(),
    mockCurrentAddress: vi.fn(),
    mockFreighterAvailable: vi.fn(),
    mockShortAddress: vi.fn((addr) => (addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "")),
    WalletError,
  };
});

vi.mock("../../lib/stellar/freighter", () => ({
  connectWallet: (...args) => mockConnectWallet(...args),
  currentAddress: (...args) => mockCurrentAddress(...args),
  freighterAvailable: (...args) => mockFreighterAvailable(...args),
  shortAddress: (...args) => mockShortAddress(...args),
  WalletError,
}));

import StellarWalletButton from "../../components/StellarWalletButton";

const TEST_ADDR = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

describe("StellarWalletButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFreighterAvailable.mockResolvedValue(false);
    mockCurrentAddress.mockResolvedValue(null);
  });

  it("renders connect button by default when wallet is disconnected", async () => {
    render(<StellarWalletButton />);

    const button = screen.getByRole("button", { name: /connect freighter/i });
    expect(button).toBeInTheDocument();
  });

  it("invokes connectWallet and displays short address on successful connection", async () => {
    const onConnect = vi.fn();
    mockConnectWallet.mockResolvedValue(TEST_ADDR);

    render(<StellarWalletButton onConnect={onConnect} />);

    const button = screen.getByRole("button", { name: /connect freighter/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockConnectWallet).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith(TEST_ADDR);
      expect(screen.getByText("GBBD…FLA5")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  it("displays WalletError message when connectWallet throws WalletError", async () => {
    mockConnectWallet.mockRejectedValue(new WalletError("User rejected Freighter connection"));

    render(<StellarWalletButton />);

    const button = screen.getByRole("button", { name: /connect freighter/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("User rejected Freighter connection")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /connect freighter/i })).toBeInTheDocument();
    });
  });

  it("displays fallback error message when connectWallet throws unknown error", async () => {
    mockConnectWallet.mockRejectedValue(new Error("RPC socket crashed"));

    render(<StellarWalletButton />);

    const button = screen.getByRole("button", { name: /connect freighter/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Could not connect to Freighter.")).toBeInTheDocument();
    });
  });

  it("resets state when Disconnect is clicked", async () => {
    mockConnectWallet.mockResolvedValue(TEST_ADDR);

    render(<StellarWalletButton />);

    fireEvent.click(screen.getByRole("button", { name: /connect freighter/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    expect(screen.getByRole("button", { name: /connect freighter/i })).toBeInTheDocument();
    expect(screen.queryByText("GBBD…FLA5")).not.toBeInTheDocument();
  });

  it("auto-detects already connected wallet on mount", async () => {
    mockFreighterAvailable.mockResolvedValue(true);
    mockCurrentAddress.mockResolvedValue(TEST_ADDR);
    const onConnect = vi.fn();

    render(<StellarWalletButton onConnect={onConnect} />);

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledWith(TEST_ADDR);
      expect(screen.getByText("GBBD…FLA5")).toBeInTheDocument();
    });
  });
});
