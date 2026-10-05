import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

// The order id the contract emits is the already-hashed 32-byte id, as hex. The
// admin page must hand that value to dispatchOrder/refundOrder untouched — no
// truncation, no re-hashing — or the contract call cannot find the order.
const EVENT_DERIVED_ID = "3f".repeat(32); // 64 hex chars

// The token contract the buyer paid with, and the merchant the order belongs
// to: `pay` is (pay, token, buyer, merchant, order_id), so both appear as
// topics and the indexer exposes them as `topic1` and `topic3`.
const TOKEN_ADDRESS = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const BUYER_ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const MERCHANT_ADDRESS = "GCMERCHANT7BZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQ";
const INDEXER_EVENT = {
  symbol: "pay",
  ledger: 42,
  txHash: "tx-1",
  // Exactly what the indexer's decodeEvent emits for a `pay` event: the topics
  // after the symbol as `topic1..topic4`, plus the data map's `amount`. There is
  // no `order_id` key - the real producer never emits one for `pay`.
  fields: {
    topic1: TOKEN_ADDRESS,
    topic2: BUYER_ADDRESS,
    topic3: MERCHANT_ADDRESS,
    topic4: EVENT_DERIVED_ID,
    amount: "100000000",
  },
};

const emittedEvents: Array<typeof INDEXER_EVENT> = [];

const dispatchOrder = vi.fn(async (_orderId: string) => ({ success: true, txHash: "abc" }));
const refundOrder = vi.fn(async (_orderId: string) => ({ success: true, txHash: "def" }));

vi.mock("../../lib/stellar/orders", () => ({
  dispatchOrder: (id: string) => dispatchOrder(id),
  refundOrder: (id: string) => refundOrder(id),
  // Stands in for the real decoder, reading the same positions
  // `lib/stellar/orders.ts` documents: for `pay` the order id is `topic4` and
  // the buyer is `topic2`.
  eventToOrder: (event: typeof INDEXER_EVENT) => ({
    orderId: event.fields.topic4,
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
      emittedEvents.push(INDEXER_EVENT);
      onEvent(INDEXER_EVENT);
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
    emittedEvents.length = 0;
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

  it("emits a fixture in the shape the indexer actually produces (#534)", async () => {
    render(<AdminOrdersPage />);
    await screen.findByRole("button", { name: /ship/i });

    expect(emittedEvents).toHaveLength(1);
    const event = emittedEvents[0];

    // The fixture may only carry what `decodeEvent` emits: the topics after the
    // symbol, plus the data map's keys. An `order_id` key here would be a
    // fixture that cannot occur in production, which is how #513 stayed hidden.
    expect(event.symbol).toBe("pay");
    expect(Object.keys(event.fields).sort()).toEqual(
      ["amount", "topic1", "topic2", "topic3", "topic4"].sort()
    );

    // The order id is not at topic1 - that is the token contract address, and
    // reading it as the order id is the defect from #513.
    expect(event.fields.topic1).toMatch(/^C[A-Z2-7]{55}$/);
    expect(event.fields.topic4).toBe(EVENT_DERIVED_ID);
    expect(event.fields.topic1).not.toBe(EVENT_DERIVED_ID);
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
