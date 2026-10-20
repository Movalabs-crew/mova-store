import { render, screen, act } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import StellarOrderWatch from "../../components/StellarOrderWatch";
import { bytesToHex, hashOrderId } from "../../lib/stellar/scval";

// Create mock callbacks storage
let lastIndexerCallbacks = null;
const mockStart = vi.fn((callbacks) => {
  lastIndexerCallbacks = callbacks;
});
const mockStop = vi.fn();

vi.mock("../../lib/stellar/indexer", () => {
  return {
    // Must be a `function`, not an arrow: the component calls this with `new`,
    // and arrow functions are not constructible.
    PaymentEventIndexer: vi.fn().mockImplementation(function () {
      return {
        start: mockStart,
        stop: mockStop,
      };
    }),
  };
});

describe("StellarOrderWatch Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastIndexerCallbacks = null;
  });

  it("renders starting state on mount when orderId is provided", async () => {
    render(<StellarOrderWatch orderId="ord-123" />);

    expect(screen.getByText("Stellar order monitor")).toBeInTheDocument();
    expect(screen.getByText("Starting…")).toBeInTheDocument();
  });

  it("does not start indexer when disabled or orderId is empty", () => {
    const { rerender } = render(<StellarOrderWatch orderId="" />);
    expect(mockStart).not.toHaveBeenCalled();

    rerender(<StellarOrderWatch orderId="ord-123" enabled={false} />);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("updates UI on indexer status change and error callback", async () => {
    render(<StellarOrderWatch orderId="order-abc-456" />);

    // Wait for hashOrderId resolution and indexer.start call
    await vi.waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });

    // Simulate status callback from indexer (connected/running)
    act(() => {
      lastIndexerCallbacks.onStatus({ running: true });
    });

    expect(
      screen.getByText(/Listening for on-chain events for order order-abc-456…/i)
    ).toBeInTheDocument();

    // Simulate error callback
    act(() => {
      lastIndexerCallbacks.onError(new Error("RPC network failure"));
    });

    expect(screen.getByText("RPC network failure")).toBeInTheDocument();
  });

  it("ignores non-pay events and events for other order IDs", async () => {
    const onEvent = vi.fn();
    render(<StellarOrderWatch orderId="my-order-99" onEvent={onEvent} />);

    await vi.waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });

    // Event with wrong symbol
    act(() => {
      lastIndexerCallbacks.onEvent({
        symbol: "create_order",
        fields: { topic4: "some-hex" },
      });
    });

    expect(onEvent).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
    expect(screen.queryByText(/Payment detected on-chain/i)).not.toBeInTheDocument();

    // Event with symbol 'pay' but mismatched topic4
    act(() => {
      lastIndexerCallbacks.onEvent({
        symbol: "pay",
        fields: { topic4: "deadbeef00000000000000000000000000000000000000000000000000000000" },
      });
    });

    expect(onEvent).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
    expect(screen.queryByText(/Payment detected on-chain/i)).not.toBeInTheDocument();
  });

  it("matches correct order event, calls onEvent, stops indexer, and renders matched details", async () => {
    const orderId = "order-match-777";
    const onEvent = vi.fn();
    render(<StellarOrderWatch orderId={orderId} onEvent={onEvent} />);

    await vi.waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });

    const expectedHashBytes = await hashOrderId(orderId);
    const expectedHex = bytesToHex(expectedHashBytes).toLowerCase();

    const matchingEvent = {
      id: "ev-1",
      ledger: 1234567,
      ledgerClosedAt: "2026-09-04T12:00:00Z",
      txHash: "0xabc123txhash456789",
      symbol: "pay",
      topics: [],
      fields: {
        topic1: "CA7TOKENADDRESS",
        topic4: expectedHex,
        amount: "50.00 USDC",
      },
    };

    act(() => {
      lastIndexerCallbacks.onEvent(matchingEvent);
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(matchingEvent);
    expect(mockStop).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Payment detected on-chain ✓")).toBeInTheDocument();
    expect(screen.getByText("1234567")).toBeInTheDocument();
    expect(screen.getByText("50.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("CA7TOKENADDRESS")).toBeInTheDocument();
    expect(screen.getByText("0xabc123txhash456789")).toBeInTheDocument();
  });

  it("invokes the latest onEvent prop after it changes while listening (#717)", async () => {
    const orderId = "order-swap-717";
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<StellarOrderWatch orderId={orderId} onEvent={first} />);

    await vi.waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });
    expect(mockStart).toHaveBeenCalledTimes(1);

    // A new callback must not restart the running indexer…
    await act(async () => {
      rerender(<StellarOrderWatch orderId={orderId} onEvent={second} />);
    });
    expect(mockStart).toHaveBeenCalledTimes(1);

    const expectedHex = bytesToHex(await hashOrderId(orderId)).toLowerCase();
    act(() => {
      lastIndexerCallbacks.onEvent({
        id: "ev-717",
        ledger: 42,
        txHash: "0x717tx",
        symbol: "pay",
        fields: { topic1: "CTOKEN", topic4: expectedHex, amount: "1.00 USDC" },
      });
    });

    // …but the current one is the callback that fires.
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
