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
  connectWallet: (...args) => mockConnectWallet(...args),
  currentAddress: (...args) => mockCurrentAddress(...args),
  WalletError,
}));

vi.mock("../../lib/stellar/checkout", () => ({
  payWithStellar: (...args) => mockPayWithStellar(...args),
}));

const MOCK_PUBLIC_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const MOCK_TX_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Creates a mock PayResult object.
 * @param {number} amountUsd - Amount in USD.
 * @returns {object} Mock PayResult payload.
 */
function createSuccessResult(amountUsd = 19.99) {
  return {
    amountUsd,
    amountRaw: 199900000n,
    hash: MOCK_TX_HASH,
    receipt: { ledger: 48291, orderId: "d04a6e8b".repeat(8) },
    status: "SUCCESS",
    simulation: {
      instructions: 45000,
      minResourceFeeStroops: "100",
      recommendedInclusionFeeStroops: "1500",
    },
  };
}

/**
 * Helper to render StellarCheckoutButton with standard test props.
 * @param {object} props - Overrides for default props.
 * @returns {object} Render result.
 */
function renderButton(props = {}) {
  return render(<StellarCheckoutButton amountUsd={19.99} orderId="TEST-ORDER-1" {...props} />);
}

afterEach(() => {
  vi.resetAllMocks();
  mockCurrentAddress.mockResolvedValue(null);
});

describe("StellarCheckoutButton", () => {
  it("is disabled while the disabled prop is set", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    renderButton({ disabled: true });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled while payment is in flight and displays status updates", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    let resolvePayment;
    mockPayWithStellar.mockImplementation(
      ({ onStatus }) =>
        new Promise((resolve) => {
          resolvePayment = resolve;
          onStatus("Submitting transaction…");
        })
    );

    const { container } = renderButton();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
      await Promise.resolve();
    });

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(container.textContent).toContain("Submitting transaction…");

    await act(async () => {
      resolvePayment(createSuccessResult());
    });

    expect(button).toBeDisabled();
  });

  it("connects wallet when publicKey is missing and then proceeds to pay", async () => {
    mockCurrentAddress.mockResolvedValue(null);
    mockConnectWallet.mockResolvedValue(MOCK_PUBLIC_KEY);
    mockPayWithStellar.mockResolvedValue(createSuccessResult());

    renderButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockConnectWallet).toHaveBeenCalledTimes(1);
    expect(mockPayWithStellar).toHaveBeenCalledWith(
      expect.objectContaining({
        amountUsd: 19.99,
        orderId: "TEST-ORDER-1",
        publicKey: MOCK_PUBLIC_KEY,
      })
    );
  });

  it("skips connectWallet if publicKey is already resolved", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    mockPayWithStellar.mockResolvedValue(createSuccessResult());

    renderButton();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockConnectWallet).not.toHaveBeenCalled();
    expect(mockPayWithStellar).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: MOCK_PUBLIC_KEY,
      })
    );
  });

  it("surfaces WalletError from connectWallet in alert role span and aborts payment", async () => {
    mockCurrentAddress.mockResolvedValue(null);
    mockConnectWallet.mockRejectedValue(
      new WalletError("Freighter extension not found", "FREIGHTER_NOT_FOUND")
    );

    renderButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Freighter extension not found");
    expect(mockPayWithStellar).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("surfaces non-WalletError from connectWallet as fallback message in alert role span", async () => {
    mockCurrentAddress.mockResolvedValue(null);
    mockConnectWallet.mockRejectedValue(new Error("Failed without WalletError"));

    renderButton();

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Could not connect to Freighter.");
    expect(mockPayWithStellar).not.toHaveBeenCalled();
  });

  it("surfaces WalletError from payWithStellar in alert role span", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    mockPayWithStellar.mockRejectedValue(
      new WalletError("Transaction simulation failed", "TX_SIMULATION_ERROR")
    );

    renderButton();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Transaction simulation failed");
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("surfaces non-WalletError from payWithStellar in alert role span", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    mockPayWithStellar.mockRejectedValue(new Error("RPC endpoint unreachable"));

    renderButton();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("RPC endpoint unreachable");
  });

  it("renders confirmed state with tx link, ledger info, preflight details and invokes onSuccess", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    const successData = createSuccessResult();
    mockPayWithStellar.mockResolvedValue(successData);
    const onSuccess = vi.fn();

    const { container } = renderButton({ onSuccess });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByText("Payment confirmed ✓")).toBeInTheDocument();
    expect(screen.getByText("$19.99 USDC · order TEST-ORDER-1")).toBeInTheDocument();
    expect(container.textContent).toContain("Paid on ledger 48291");

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/tx/${MOCK_TX_HASH}`
    );
    expect(link).toHaveTextContent(`${MOCK_TX_HASH.slice(0, 12)}…`);
    expect(container.textContent).toContain("Preflight: 45,000 CPU instr");
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(successData);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("generates fallback orderId when orderId prop is not provided", async () => {
    mockCurrentAddress.mockResolvedValue(MOCK_PUBLIC_KEY);
    mockPayWithStellar.mockResolvedValue(createSuccessResult());

    render(<StellarCheckoutButton amountUsd={10} />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(mockPayWithStellar).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: expect.stringMatching(/^SS-\d+-\d+$/),
      })
    );
  });
});
