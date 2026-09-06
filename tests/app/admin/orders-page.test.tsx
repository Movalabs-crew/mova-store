import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

const HEX64 =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const hoisted = vi.hoisted(() => {
  const state: {
    onEvent?: (e: unknown) => void;
    onStatus?: (s: unknown) => void;
  } = {};
  const dispatchOrder = vi.fn(async () => ({ success: true, txHash: "d".repeat(64) }));
  const refundOrder = vi.fn(async () => ({ success: true, txHash: "e".repeat(64) }));
  return { state, dispatchOrder, refundOrder };
});

vi.mock("../../../lib/stellar/indexer", () => ({
  PaymentEventIndexer: class {
    start(opts: { onEvent?: (e: unknown) => void; onStatus?: (s: unknown) => void }) {
      hoisted.state.onEvent = opts.onEvent;
      hoisted.state.onStatus = opts.onStatus;
    }
    stop() {}
  },
}));

vi.mock("../../../lib/stellar/orders", () => ({
  dispatchOrder: (...args: unknown[]) => hoisted.dispatchOrder(...(args as [])),
  refundOrder: (...args: unknown[]) => hoisted.refundOrder(...(args as [])),
  eventToOrder: (event: {
    fields: Record<string, string>;
    symbol: string;
    ledger: number;
    txHash: string;
  }) => ({
    orderId: event.fields.order_id || event.fields.topic1 || "",
    buyer: event.fields.buyer || event.fields.topic2 || "",
    amount: "10.00",
    amountRaw: 10000000n,
    token: event.fields.token || "",
    tokenSymbol: "USDC",
    status:
      event.symbol === "dispatch"
        ? "Shipped"
        : event.symbol === "refund"
          ? "Refunded"
          : "Paid",
    timestamp: 1700000000000,
    ledger: event.ledger,
    txHash: event.txHash,
  }),
}));

vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }: { children: unknown }) => <>{children}</>,
}));

vi.mock("../../../components/StellarWalletButton", () => ({
  default: () => <button type="button">wallet</button>,
}));

import OrdersManagement from "../../../app/admin/orders/page";

const payEvent = {
  id: 1,
  type: "contract",
  ledger: 100,
  ledgerClosedAt: "2024-01-01T00:00:00Z",
  txHash: "f".repeat(64),
  symbol: "pay",
  topics: [],
  fields: {
    order_id: HEX64,
    buyer: "GTESTBUYER",
    amount: "10000000",
    token: "CUSDC",
  },
};

function startIndexer() {
  act(() => {
    hoisted.state.onStatus?.({ running: true, eventsSeen: 1 });
  });
}

function deliverEvent() {
  act(() => {
    hoisted.state.onEvent?.(payEvent);
  });
}

describe("admin orders page - event-derived order id pass-through", () => {
  beforeEach(() => {
    hoisted.dispatchOrder.mockClear();
    hoisted.refundOrder.mockClear();
    hoisted.state.onEvent = undefined;
    hoisted.state.onStatus = undefined;
  });

  it("passes the event-derived hex id into dispatchOrder unmodified", async () => {
    render(<OrdersManagement />);
    startIndexer();
    deliverEvent();

    await screen.findByText(/GTESTBUYER/);
    fireEvent.click(screen.getByText("Ship"));

    await waitFor(() => expect(hoisted.dispatchOrder).toHaveBeenCalledTimes(1));
    expect(hoisted.dispatchOrder).toHaveBeenCalledWith(HEX64);
  });

  it("passes the event-derived hex id into refundOrder unmodified", async () => {
    render(<OrdersManagement />);
    startIndexer();
    deliverEvent();

    await screen.findByText(/GTESTBUYER/);
    fireEvent.click(screen.getByText("Refund"));

    await waitFor(() => expect(hoisted.refundOrder).toHaveBeenCalledTimes(1));
    expect(hoisted.refundOrder).toHaveBeenCalledWith(HEX64);
  });
});
