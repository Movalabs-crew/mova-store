import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

// The indexer's order id topic is the already-hashed BytesN<32> as hex. The
// admin page must hand that value to dispatchOrder/refundOrder untouched -- no
// truncation, no re-hashing -- or the contract call cannot find the order.
//
// The real `decodeEvent` output for a `pay` event exposes the order id as the
// `topic1` key. There is no `fields.order_id` in the indexer payload.
const EVENT_DERIVED_ID = "3f".repeat(32); // 64 hex chars

const dispatchOrder = vi.fn(async (_orderId: string) => ({ success: true, txHash: "abc" }));
const refundOrder = vi.fn(async (_orderId: string) => ({ success: true, txHash: "def" }));

vi.mock("../../lib/stellar/orders", () => ({
  dispatchOrder: (id: string) => dispatchOrder(id),
  refundOrder: (id: string) => refundOrder(id),
  eventToOrder: (event: { fields: Record<string, string>; ledger: number; txHash: string }) => ({
    // Mirror the real decoder: the order id hash lives in topic1, not in
    // a non-existent `fields.order_id` key.
    orderId: event.fields.topic1,
    buyer: event.fields.topic2,
    amount: "10.0000000",
    tokenSymbol: "USDC",
    status: "Paid",
    ledger: event.ledger,
    txHash: event.txHash,
    timestamp: Date.now(),
  }),
}));

vi.mock("../../lib/stellar/indexer", () => ({
  PaymentEventIndexer: class {
    start({
      onEvent,
      onStatus,
    }: {
      onEvent: (e: unknown) => void;
      onStatus: (s: { running: boolean; eventsSeen: number }) => void;
    }) {
      // Real `pay` event layout from decodeEvent: the order id hash is topic1,
      // the buyer address is topic2, and the amount is topic3. There is no
      // `fields.order_id` in the indexer payload.
      onEvent({
        fields: { topic1: EVENT_DERIVED_ID, topic2: "GBUYER", topic3: "100000000" },
        symbol: "pay",
        ledger: 42,
        txHash: "tx-1",
      });
      onStatus({ running: true, eventsSeen: 1 });
    }
    stop() {}
  },
}));

vi.mock("../../lib/stellar/config", () => ({
  NETWORK: "testnet",
  CHECKOUT_CONTRACT_ID: "C".repeat(56),
  CHECKOUT_START_LEDGER: 0,
  ADMIN_ORDERS_CURSOR_STORAGE_KEY: "mova:admin-orders:cursor:v1",
}));

vi.mock("../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => null,
}));

import AdminOrdersPage from "../../app/admin/orders/page";

describe("admin orders page — order id passed to dispatch/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the event-derived hex order id to dispatchOrder unmodified", async () => {
    render(<AdminOrdersPage />);

    const ship = await screen.findByRole("button", { name: /ship/i });
    fireEvent.click(ship);

    // The dialog's confirm control is labelled by the action it performs
    // ("Release escrow"), not by a generic "Confirm".
    const confirm = await screen.findByRole("button", { name: /release escrow/i });
    // The dialog truncates the id for display (6...4); it is the value handed to
    // dispatchOrder, asserted below, that has to be the full 64 hex characters.
    // The order row also displays the id and the amount, so scope these to the
    // confirmation dialog to avoid matching both.
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(`${EVENT_DERIVED_ID.slice(0, 6)}...${EVENT_DERIVED_ID.slice(-4)}`)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/10(\.\d{1,7})?/)).toBeInTheDocument();
    fireEvent.click(confirm);

    await waitFor(() => expect(dispatchOrder).toHaveBeenCalledTimes(1));
    expect(dispatchOrder).toHaveBeenCalledWith(EVENT_DERIVED_ID);

    // Guard the specific regressions: a truncated display value, or a value
    // that has been hashed again on the way through.
    const passed = dispatchOrder.mock.calls[0][0];
    expect(passed).toHaveLength(64);
    expect(passed).not.toContain("...");
  });

  it("passes the event-derived hex order id to refundOrder unmodified", async () => {
    render(<AdminOrdersPage />);

    const refund = await screen.findByRole("button", { name: /refund/i });
    fireEvent.click(refund);

    const confirm = await screen.findByRole("button", { name: /refund buyer/i });
    // The dialog truncates the id for display (6...4); it is the value handed to
    // dispatchOrder, asserted below, that has to be the full 64 hex characters.
    // The order row also displays the id and the amount, so scope these to the
    // confirmation dialog to avoid matching both.
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(`${EVENT_DERIVED_ID.slice(0, 6)}...${EVENT_DERIVED_ID.slice(-4)}`)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/10(\.\d{1,7})?/)).toBeInTheDocument();
    fireEvent.click(confirm);

    await waitFor(() => expect(refundOrder).toHaveBeenCalledTimes(1));
    expect(refundOrder).toHaveBeenCalledWith(EVENT_DERIVED_ID);
  });

  it("does not submit dispatch when confirmation is declined", async () => {
    render(<AdminOrdersPage />);

    const ship = await screen.findByRole("button", { name: /ship/i });
    fireEvent.click(ship);

    const cancel = await screen.findByRole("button", { name: /cancel/i });
    fireEvent.click(cancel);

    await waitFor(() => expect(screen.queryByText(/confirm/i)).toBeNull());
    expect(dispatchOrder).not.toHaveBeenCalled();
  });

  it("does not submit refund when confirmation is declined", async () => {
    render(<AdminOrdersPage />);

    const refund = await screen.findByRole("button", { name: /refund/i });
    fireEvent.click(refund);

    const cancel = await screen.findByRole("button", { name: /cancel/i });
    fireEvent.click(cancel);

    await waitFor(() => expect(screen.queryByText(/confirm/i)).toBeNull());
    expect(refundOrder).not.toHaveBeenCalled();
  });
});
