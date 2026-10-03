import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// The admin orders view is an operations table: it must scan from a durable
// start ledger (not the ~8-minute rolling backfill window) and persist its
// resume cursor so a reload continues instead of restarting the window.
const constructorArgs: unknown[] = [];

vi.mock("../../lib/stellar/indexer", () => ({
  PaymentEventIndexer: class {
    constructor(opts: unknown) {
      constructorArgs.push(opts);
    }
    start() {}
    stop() {}
  },
}));

vi.mock("../../lib/stellar/orders", () => ({
  dispatchOrder: vi.fn(),
  refundOrder: vi.fn(),
  eventToOrder: vi.fn(),
  mergeOrderEvents: vi.fn(),
}));

vi.mock("../../lib/stellar/config", () => ({
  NETWORK: "testnet",
  CHECKOUT_CONTRACT_ID: "C".repeat(56),
  CHECKOUT_START_LEDGER: 12_345,
  ADMIN_ORDERS_CURSOR_STORAGE_KEY: "mova:admin-orders:cursor:v1",
}));

vi.mock("../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => null,
}));

import AdminOrdersPage from "../../app/admin/orders/page";

describe("admin orders page — durable scan (Issue #715)", () => {
  beforeEach(() => {
    constructorArgs.length = 0;
  });

  it("indexes from the configured durable start ledger and persists the resume cursor", () => {
    render(<AdminOrdersPage />);

    expect(constructorArgs[0]).toMatchObject({
      startLedger: 12_345,
      cursorStorageKey: "mova:admin-orders:cursor:v1",
    });
  });
});
