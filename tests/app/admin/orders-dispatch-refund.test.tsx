import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrdersManagement from "../../../app/admin/orders/page";
import * as ordersModule from "../../../lib/stellar/orders";
import { IndexedEvent } from "../../../lib/stellar/indexer";

// Mock dependencies
vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../components/StellarWalletButton", () => ({
  default: () => <button>Wallet Connected</button>,
}));

const mockIndexedEvent: IndexedEvent = {
  id: "evt-1",
  contractId: "CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR",
  symbol: "pay",
  fields: {
    order_id: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
    buyer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    amount: "500000000",
    token: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    timestamp: "1741112400",
  },
  ledger: 12345,
  txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  timestamp: 1741112400000,
};

vi.mock("../../../lib/stellar/indexer", () => {
  return {
    PaymentEventIndexer: class {
      async start(callbacks: {
        onEvent?: (event: IndexedEvent) => void;
        onStatus?: (status: { running: boolean; eventsSeen: number }) => void;
      } = {}) {
        if (callbacks.onEvent) {
          callbacks.onEvent(mockIndexedEvent);
        }
        if (callbacks.onStatus) {
          callbacks.onStatus({ running: true, eventsSeen: 1 });
        }
      }
      stop() {}
    },
  };
});

describe("Admin Orders Page - Event-derived hex order ID dispatch & refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the event-derived hex order id directly into dispatchOrder unmodified", async () => {
    const dispatchSpy = vi
      .spyOn(ordersModule, "dispatchOrder")
      .mockResolvedValue({ success: true, txHash: "tx123" });

    render(<OrdersManagement />);

    const shipButton = await screen.findByRole("button", { name: /Ship/i });
    expect(shipButton).toBeInTheDocument();

    fireEvent.click(shipButton);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
      );
    });
  });

  it("passes the event-derived hex order id directly into refundOrder unmodified", async () => {
    const refundSpy = vi
      .spyOn(ordersModule, "refundOrder")
      .mockResolvedValue({ success: true, txHash: "tx456" });

    render(<OrdersManagement />);

    const refundButton = await screen.findByRole("button", { name: /Refund/i });
    expect(refundButton).toBeInTheDocument();

    fireEvent.click(refundButton);

    await waitFor(() => {
      expect(refundSpy).toHaveBeenCalledTimes(1);
      expect(refundSpy).toHaveBeenCalledWith(
        "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
      );
    });
  });
});
