import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import StellarOrderWatch from "../../components/StellarOrderWatch";

// Mock the scval helpers
vi.mock("../../lib/stellar/scval", () => ({
  hashOrderId: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
  bytesToHex: vi.fn().mockReturnValue("01020304"),
}));

let mockIndexerInstance: any = null;

// Mock the indexer
vi.mock("../../lib/stellar/indexer", () => {
  return {
    PaymentEventIndexer: vi.fn().mockImplementation(() => {
      mockIndexerInstance = {
        start: vi.fn(),
        stop: vi.fn(),
      };
      return mockIndexerInstance;
    }),
  };
});

describe("StellarOrderWatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndexerInstance = null;
  });

  it("clears the error banner when onStatus receives lastError=undefined while running", async () => {
    let capturedCallbacks: any = null;

    const { unmount } = render(
      <StellarOrderWatch orderId="test-order-123" enabled={true} />
    );

    // Wait for async hashOrderId to resolve and indexer.start to be called
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockIndexerInstance).not.toBeNull();
    expect(mockIndexerInstance.start).toHaveBeenCalled();
    capturedCallbacks = mockIndexerInstance.start.mock.calls[0][0];

    // Trigger transient failure via onStatus
    act(() => {
      capturedCallbacks.onStatus({
        running: true,
        lastError: "Transient network timeout",
      });
    });

    expect(screen.getByText("Transient network timeout")).toBeInTheDocument();

    // Indexer recovers: onStatus called with running: true and no lastError
    act(() => {
      capturedCallbacks.onStatus({
        running: true,
        lastError: undefined,
      });
    });

    // Error banner should be gone
    expect(screen.queryByText("Transient network timeout")).not.toBeInTheDocument();

    unmount();
  });

  it("clears error banner when a matching payment event is received", async () => {
    let capturedCallbacks: any = null;

    render(<StellarOrderWatch orderId="test-order-123" enabled={true} />);

    await act(async () => {
      await Promise.resolve();
    });

    capturedCallbacks = mockIndexerInstance.start.mock.calls[0][0];

    // Set error
    act(() => {
      capturedCallbacks.onError(new Error("RPC hiccup"));
    });

    expect(screen.getByText("RPC hiccup")).toBeInTheDocument();

    // Match payment event
    act(() => {
      capturedCallbacks.onEvent({
        symbol: "pay",
        ledger: 100,
        txHash: "tx123",
        fields: {
          topic4: "01020304",
          amount: "10.0",
          topic1: "USDC",
        },
      });
    });

    // Error should be resolved and match banner shown
    expect(screen.queryByText("RPC hiccup")).not.toBeInTheDocument();
    expect(screen.getByText("Payment detected on-chain ✓")).toBeInTheDocument();
  });
});
