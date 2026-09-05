import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const HEX64_ORDER_ID = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

const hoisted = vi.hoisted(() => {
  let startCallback: ((event: any) => void) | null = null;

  class MockPaymentEventIndexer {
    start(handlers: {
      onEvent: (event: any) => void;
      onStatus: (status: any) => void;
      onError: (err: any) => void;
    }) {
      startCallback = handlers.onEvent;
      handlers.onStatus({ running: true, eventsSeen: 1 });
    }
    stop() {}
  }

  const mockDispatchOrder = vi.fn().mockResolvedValue({ success: true });
  const mockRefundOrder = vi.fn().mockResolvedValue({ success: true });

  return {
    MockPaymentEventIndexer,
    mockDispatchOrder,
    mockRefundOrder,
    getStartCallback: () => startCallback,
  };
});

vi.mock("../../../lib/stellar/indexer", () => ({
  PaymentEventIndexer: hoisted.MockPaymentEventIndexer,
}));

vi.mock("../../../lib/stellar/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/stellar/orders")>();
  return {
    ...actual,
    dispatchOrder: hoisted.mockDispatchOrder,
    refundOrder: hoisted.mockRefundOrder,
  };
});

vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../components/StellarWalletButton", () => ({
  default: () => <button>Wallet</button>,
}));

import OrdersManagement from "../../../app/admin/orders/page";

describe("Admin Orders Page - Event ID dispatch and refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the event-derived hex order id into dispatchOrder unmodified when Ship is clicked", async () => {
    render(<OrdersManagement />);

    const emitEvent = hoisted.getStartCallback();
    expect(emitEvent).toBeTruthy();

    await act(async () => {
      emitEvent!({
        symbol: "pay",
        fields: {
          order_id: HEX64_ORDER_ID,
          buyer: "GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          amount: "50000000",
          token: "USDC",
        },
        ledger: 123456,
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      });
    });

    const shipBtn = await screen.findByRole("button", { name: /ship/i });
    expect(shipBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(shipBtn);
    });

    await waitFor(() => {
      expect(hoisted.mockDispatchOrder).toHaveBeenCalledTimes(1);
    });

    expect(hoisted.mockDispatchOrder).toHaveBeenCalledWith(HEX64_ORDER_ID);
  });

  it("passes the event-derived hex order id into refundOrder unmodified when Refund is clicked", async () => {
    render(<OrdersManagement />);

    const emitEvent = hoisted.getStartCallback();
    expect(emitEvent).toBeTruthy();

    await act(async () => {
      emitEvent!({
        symbol: "pay",
        fields: {
          order_id: HEX64_ORDER_ID,
          buyer: "GBUYER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
          amount: "50000000",
          token: "USDC",
        },
        ledger: 123456,
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      });
    });

    const refundBtn = await screen.findByRole("button", { name: /refund/i });
    expect(refundBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(refundBtn);
    });

    await waitFor(() => {
      expect(hoisted.mockRefundOrder).toHaveBeenCalledTimes(1);
    });

    expect(hoisted.mockRefundOrder).toHaveBeenCalledWith(HEX64_ORDER_ID);
  });
});
