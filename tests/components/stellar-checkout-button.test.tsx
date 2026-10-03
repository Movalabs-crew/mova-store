import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";

const {
  mockConnectWallet,
  mockCurrentAddress,
  mockPayWithStellar,
  mockWatchWalletChanges,
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
    mockPayWithStellar: vi.fn(),
    mockWatchWalletChanges: vi.fn(() => () => {}),
    WalletError,
  };
});

vi.mock("../../lib/stellar/freighter", () => ({
  connectWallet: (...args) => mockConnectWallet(...args),
  currentAddress: (...args) => mockCurrentAddress(...args),
  watchWalletChanges: (...args) => mockWatchWalletChanges(...args),
  shortAddress: (address) =>
    !address || address.length <= 15
      ? (address ?? "")
      : `${address.slice(0, 6)}…${address.slice(-6)}`,
  WalletError,
}));

vi.mock("../../lib/stellar/checkout", () => ({
  payWithStellar: (...args) => mockPayWithStellar(...args),
}));

vi.mock("../../lib/stellar/config", () => ({
  defaultToken: () => ({
    contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
  }),
}));

const ADDR = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const TX_HASH = "0123456789abcdef".repeat(4);

function successResult(amountUsd = 12.34) {
  return {
    amountUsd,
    hash: TX_HASH,
    receipt: { ledger: 4242, orderId: "abcd".repeat(8) },
    simulation: null,
  };
}

function renderButton(props = {}) {
  return render(<StellarCheckoutButton amountUsd={12.34} orderId="SS-TEST-1" {...props} />);
}

afterEach(() => {
  vi.resetAllMocks();
  mockCurrentAddress.mockResolvedValue(null);
  mockWatchWalletChanges.mockReturnValue(() => {});
});

describe("StellarCheckoutButton", () => {
  it("is disabled while the disabled prop is set", () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    renderButton({ disabled: true });
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled while a payment is in flight and shows the status message", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    let resolvePay;
    mockPayWithStellar.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePay = resolve;
        })
    );
    const { container } = renderButton();

    await act(async () => {
      // let the mount-time currentAddress() resolve and state settle
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(container.textContent).toContain("Connecting wallet…");
    expect(mockPayWithStellar).toHaveBeenCalledWith(
      expect.objectContaining({
        amountUsd: 12.34,
        orderId: "SS-TEST-1",
        publicKey: ADDR,
      })
    );

    await act(async () => {
      resolvePay(successResult());
    });
    expect(button).toBeDisabled(); // still disabled after success (result view)
  });

  it("connects a missing wallet before paying with the connected address", async () => {
    mockCurrentAddress.mockResolvedValue(null);
    mockConnectWallet.mockResolvedValue(ADDR);
    mockPayWithStellar.mockResolvedValue(successResult());

    renderButton();
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockConnectWallet).toHaveBeenCalledOnce();
    expect(mockPayWithStellar).toHaveBeenCalledWith(expect.objectContaining({ publicKey: ADDR }));
  });

  it("surfaces a WalletError from connectWallet in the alert span and does not pay", async () => {
    mockCurrentAddress.mockResolvedValue(null);
    mockConnectWallet.mockRejectedValue(
      new WalletError("Freighter extension not found", "FREIGHTER_NOT_FOUND")
    );

    renderButton();
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("alert").textContent).toBe("Freighter extension not found");
    expect(mockPayWithStellar).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("surfaces a WalletError from payWithStellar in the alert span", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    mockPayWithStellar.mockRejectedValue(new WalletError("Insufficient balance", "WALLET_ERROR"));

    renderButton();
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("alert").textContent).toBe("Insufficient balance");
  });

  it("renders the payment-confirmed state with the tx link and calls onSuccess", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    mockPayWithStellar.mockResolvedValue(successResult());
    const onSuccess = vi.fn();

    const { container } = renderButton({ onSuccess });
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByText("Payment confirmed ✓")).toBeTruthy();
    expect(container.textContent).toContain("Paid on ledger 4242");
    const link = screen.getByRole("link");
    expect(link.href).toBe(`https://stellar.expert/explorer/testnet/tx/${TX_HASH}`);
    expect(link.textContent).toBe(`${TX_HASH.slice(0, 12)}…`);
    expect(screen.getByText("$12.34 USDC · order SS-TEST-1")).toBeTruthy();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(successResult());
  });

  it("renders Pay with XLM and passes token to payWithStellar when XLM token is provided", async () => {
    mockCurrentAddress.mockResolvedValue(ADDR);
    const xlmToken = {
      contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      symbol: "XLM",
      name: "Stellar Lumens",
      decimals: 7,
      isNative: true,
    };
    mockPayWithStellar.mockResolvedValue({
      amountUsd: 12,
      tokenAmount: 100,
      tokenSymbol: "XLM",
      hash: TX_HASH,
      receipt: { ledger: 5000, orderId: "abcd".repeat(8) },
      simulation: null,
    });

    render(
      <StellarCheckoutButton
        amountUsd={12}
        orderId="SS-XLM-1"
        token={xlmToken}
        xlmUsdPrice={0.12}
      />
    );

    // 12 USD / 0.12 = 100 XLM
    expect(screen.getByText(/Pay with XLM/i)).toBeInTheDocument();
    expect(screen.getByText(/~100\.00 XLM/i)).toBeInTheDocument();

    await act(async () => {
      // let the mount-time currentAddress() resolve and state settle
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    expect(mockPayWithStellar).toHaveBeenCalledWith(
      expect.objectContaining({
        amountUsd: 12,
        orderId: "SS-XLM-1",
        publicKey: ADDR,
        token: xlmToken,
        tokenAmount: 100,
      })
    );

    expect(screen.getByText("Payment confirmed ✓")).toBeInTheDocument();
    expect(screen.getByText(/~100\.00 XLM/i)).toBeInTheDocument();
  });

  const ADDR2 = "GCKFBEIYTKP6RJKF6LO5C6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6";

  it("invalidates the cached address when Freighter reports an account change (#709)", async () => {
    let onChange;
    mockWatchWalletChanges.mockImplementation((cb) => {
      onChange = cb;
      return () => {};
    });
    mockCurrentAddress.mockResolvedValueOnce(ADDR).mockResolvedValue(ADDR2);
    mockPayWithStellar.mockResolvedValue(successResult());

    renderButton();
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      onChange({ address: ADDR2, network: "TESTNET" });
    });
    expect(screen.getByRole("alert").textContent).toContain("account changed");

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    expect(mockPayWithStellar).toHaveBeenCalledWith(expect.objectContaining({ publicKey: ADDR2 }));
  });

  it("aborts with a reconnect message when Freighter disconnects before paying (#709)", async () => {
    mockCurrentAddress.mockResolvedValueOnce(ADDR).mockResolvedValue(null);
    mockPayWithStellar.mockResolvedValue(successResult());

    renderButton();
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    expect(mockPayWithStellar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("disconnected");
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("re-reads the live address, resets the cache and pays with the new account (#709)", async () => {
    mockCurrentAddress.mockResolvedValueOnce(ADDR).mockResolvedValue(ADDR2);
    mockPayWithStellar.mockResolvedValue(successResult());

    renderButton();
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    expect(mockPayWithStellar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("account changed");

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    expect(mockPayWithStellar).toHaveBeenCalledWith(expect.objectContaining({ publicKey: ADDR2 }));
  });
});
