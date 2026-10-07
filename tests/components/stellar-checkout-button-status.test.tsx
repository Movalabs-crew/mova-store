import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";

const { mockConnectWallet, mockCurrentAddress, mockPayWithStellar, WalletError } = vi.hoisted(
  () => {
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
      mockPayWithStellar: vi.fn(),
      WalletError,
    };
  }
);

vi.mock("../../lib/stellar/freighter", () => ({
  connectWallet: (...args: any[]) => mockConnectWallet(...args),
  currentAddress: (...args: any[]) => mockCurrentAddress(...args),
  // The button subscribes to wallet changes on mount (#864); the mock has to
  // expose the subscribe call and hand back its unsubscribe.
  watchWalletChanges: () => () => {},
  WalletError,
}));

vi.mock("../../lib/stellar/checkout", () => ({
  payWithStellar: (...args: any[]) => mockPayWithStellar(...args),
}));

vi.mock("../../lib/stellar/config", () => ({
  // The receipt's explorer link is derived from the configured network (#707),
  // so the partial mock has to expose it.
  NETWORK: "testnet",
  defaultToken: () => ({ contractId: "CBIEL", symbol: "USDC", name: "USD Coin", decimals: 7 }),
}));

const ADDR = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const TX_HASH = "0123456789abcdef".repeat(4);

afterEach(() => {
  vi.resetAllMocks();
  mockCurrentAddress.mockResolvedValue(null);
});

describe("StellarCheckoutButton payment progress announcements (#604)", () => {
  it("announces the in-flight status in a polite live region", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    let resolvePay: (value: unknown) => void = () => {};
    let status: (value: string) => void = () => {};
    mockPayWithStellar.mockImplementation(
      (args: { onStatus: (value: string) => void }) =>
        new Promise((resolve) => {
          status = args.onStatus;
          resolvePay = resolve;
        })
    );

    render(<StellarCheckoutButton amountUsd={12.34} orderId="SS-TEST-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    await act(async () => {
      status("Signing transaction…");
    });

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Signing transaction…");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");

    await act(async () => {
      resolvePay({
        amountUsd: 12.34,
        hash: TX_HASH,
        receipt: { ledger: 4242, orderId: "abcd".repeat(8) },
        simulation: null,
      });
    });
  });

  it("gives the success banner a status role", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    mockPayWithStellar.mockResolvedValue({
      amountUsd: 12.34,
      hash: TX_HASH,
      receipt: { ledger: 4242, orderId: "abcd".repeat(8) },
      simulation: null,
    });

    render(<StellarCheckoutButton amountUsd={12.34} orderId="SS-TEST-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const banner = screen.getByText(/Paid on ledger 4242/).closest("[role='status']");
    expect(banner).not.toBeNull();
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("keeps failures assertive on the alert path", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    mockPayWithStellar.mockRejectedValue(new WalletError("Insufficient balance"));

    render(<StellarCheckoutButton amountUsd={12.34} orderId="SS-TEST-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Insufficient balance");
  });
});
