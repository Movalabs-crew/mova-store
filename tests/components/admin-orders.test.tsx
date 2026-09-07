import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const SAMPLE_64_HEX =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

const mockDispatchOrder = vi.fn().mockResolvedValue({ success: true });
const mockRefundOrder = vi.fn().mockResolvedValue({ success: true });

vi.mock("../../lib/stellar/orders", async () => {
  const actual = await vi.importActual<typeof import("../../lib/stellar/orders")>(
    "../../lib/stellar/orders"
  );
  return {
    ...actual,
    dispatchOrder: (...args: unknown[]) => mockDispatchOrder(...args),
    refundOrder: (...args: unknown[]) => mockRefundOrder(...args),
  };
});

vi.mock("../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => <button>Mock Wallet</button>,
}));

vi.mock("../../lib/stellar/indexer", () => {
  return {
    PaymentEventIndexer: class {
      start({
        onEvent,
        onStatus,
      }: {
        onEvent: (event: unknown) => void;
        onStatus?: (status: unknown) => void;
      }) {
        onEvent({
          symbol: "pay",
          ledger: 1000,
          txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          fields: {
            order_id: SAMPLE_64_HEX,
            topic1: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
            topic2: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            amount: "100000000",
            token: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
          },
        });
        onStatus?.({ running: true, eventsSeen: 1 });
      }
      stop() {}
    },
  };
});

import OrdersManagement from "../../app/admin/orders/page";

describe("Admin Orders Page (Issue #67)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the event-derived 64-hex order id into dispatchOrder unmodified when clicking Ship", async () => {
    render(<OrdersManagement />);

    const shipBtn = await screen.findByRole("button", { name: /Ship/i });
    expect(shipBtn).toBeInTheDocument();

    fireEvent.click(shipBtn);

    await waitFor(() => {
      expect(mockDispatchOrder).toHaveBeenCalledTimes(1);
    });

    // Acceptance criterion: asserts the admin page passes the event-derived hex id unmodified
    expect(mockDispatchOrder).toHaveBeenCalledWith(SAMPLE_64_HEX);
  });

  it("passes the event-derived 64-hex order id into refundOrder unmodified when clicking Refund", async () => {
    render(<OrdersManagement />);

    const refundBtn = await screen.findByRole("button", { name: /Refund/i });
    expect(refundBtn).toBeInTheDocument();

    fireEvent.click(refundBtn);

    await waitFor(() => {
      expect(mockRefundOrder).toHaveBeenCalledTimes(1);
    });

    // Acceptance criterion: asserts the admin page passes the event-derived hex id unmodified
    expect(mockRefundOrder).toHaveBeenCalledWith(SAMPLE_64_HEX);
  });
});
