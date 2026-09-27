import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";

import Checkout from "../../app/checkout/page";
import BuyerOrdersPage from "../../app/orders/page";
import {
  fetchBuyerOrders,
  getCachedBuyerOrders,
  saveBuyerOrder,
  BuyerOrder,
} from "../../lib/buyer-orders";

const { mockPayResult, cartAtSave } = vi.hoisted(() => ({
  mockPayResult: {
    hash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    status: "SUCCESS",
    receipt: {
      txHash: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      ledger: 4242,
      orderId: "ab".repeat(32),
      amount: "123400000",
    },
    amountUsd: 123.4,
    tokenAmount: 123.4,
    tokenSymbol: "USDC",
    amountRaw: 1234000000n,
    simulation: null,
  },
  cartAtSave: { value: null as string | null },
}));

// The button is mocked to synchronously invoke onSuccess with a decoded
// PayResult-shaped receipt, exactly as the real component does after a
// confirmed on-chain payment.
vi.mock("../../components/StellarCheckoutButton", () => ({
  default: (props: any) => (
    <button
      data-testid="stellar-pay"
      data-order-id={props.orderId}
      onClick={() => props.onSuccess(mockPayResult)}
    >
      Pay with Stellar
    </button>
  ),
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => <div data-testid="stellar-wallet-button" />,
}));

vi.mock("../../components/StellarOrderWatch", () => ({
  default: () => <div data-testid="stellar-order-watch" />,
}));

vi.mock("../../lib/sendmail", () => ({
  default: vi.fn(),
}));

// No network: Supabase query returns no rows so fetchBuyerOrders falls back to
// the local cache, and inserts resolve as a no-op.
vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => ({ user: { email: "buyer@example.com", uid: "buyer-1" }, loading: false }),
}));

// Wrap saveBuyerOrder so the test can observe whether the cart still existed at
// the moment the order was persisted (i.e. persistence happens before clearing).
vi.mock("../../lib/buyer-orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/buyer-orders")>();
  return {
    ...actual,
    saveBuyerOrder: vi.fn(async (order: BuyerOrder) => {
      cartAtSave.value = localStorage.getItem("cartItems");
      return actual.saveBuyerOrder(order);
    }),
  };
});

const CART_ITEM = { id: "p1", name: "Mova Runner", price: 123.4, quantity: 1, img: "/shoe.png" };

describe("Stellar checkout persists the buyer order", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    cartAtSave.value = null;
  });

  it("saves a retrievable order after a successful payment, before clearing the cart", async () => {
    localStorage.setItem("cartItems", JSON.stringify([CART_ITEM]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "123.4");

    render(<Checkout />);

    const payButton = await screen.findByTestId("stellar-pay");
    const orderId = payButton.getAttribute("data-order-id");
    expect(orderId).toBeTruthy();

    await act(async () => {
      payButton.click();
    });

    await waitFor(() => {
      expect(getCachedBuyerOrders()).toHaveLength(1);
    });

    const [order] = getCachedBuyerOrders();
    expect(order.orderId).toBe(orderId);
    expect(order.status).toBe("Paid");
    expect(order.paymentMethod).toBe("stellar");
    expect(order.txHash).toBe(mockPayResult.receipt.txHash);
    expect(order.ledger).toBe(4242);
    expect(order.tokenSymbol).toBe("USDC");
    expect(order.tokenAmount).toBe(123.4);
    expect(order.total).toBe(123.4);
    expect(order.items).toEqual([CART_ITEM]);

    // The cart was still present when the order was written, so the write
    // always happens before localStorage is cleared.
    expect(cartAtSave.value).not.toBeNull();

    // The order is retrievable through the same API /orders uses.
    await expect(fetchBuyerOrders()).resolves.toEqual([order]);

    await waitFor(() => {
      expect(localStorage.getItem("cartItems")).toBeNull();
    });
  });

  it("shows the persisted order on the buyer's /orders page", async () => {
    const order: BuyerOrder = {
      id: "SS-ORDER-1",
      orderId: "SS-ORDER-1",
      userEmail: "buyer@example.com",
      createdAt: "2026-09-27T10:00:00.000Z",
      total: 123.4,
      status: "Paid",
      paymentMethod: "stellar",
      tokenSymbol: "USDC",
      tokenAmount: 123.4,
      txHash: mockPayResult.receipt.txHash,
      ledger: 4242,
      items: [{ name: "Mova Runner", price: 123.4, quantity: 1 }],
    };
    await saveBuyerOrder(order);

    render(<BuyerOrdersPage />);

    expect(await screen.findByText("SS-ORDER-1")).toBeInTheDocument();
  });
});
