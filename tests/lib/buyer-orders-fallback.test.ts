import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchBuyerOrders,
  saveBuyerOrder,
  type BuyerOrder,
} from "../../lib/buyer-orders";

/**
 * `fetchBuyerOrders` reads Supabase first and falls back to the local cache.
 * These tests drive the three branches directly by controlling what the mocked
 * Supabase query resolves (or rejects) with, and assert the shape handed back
 * to the orders page for each.
 */
const supabaseState = vi.hoisted(() => ({
  result: { data: [] as unknown[], error: null as unknown },
  reject: false,
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn(() => {
        if (supabaseState.reject) {
          return Promise.reject(new Error("supabase unavailable"));
        }
        return Promise.resolve(supabaseState.result);
      }),
    })),
  },
}));

const DB_ROW = {
  id: "db-1",
  order_id: "SS-DB-1",
  user_id: "user-123",
  user_email: "buyer@example.com",
  total: "120.50",
  status: "Paid",
  payment_method: "stellar",
  token_symbol: "USDC",
  token_amount: "12.25",
  tx_hash: "abcd1234efgh5678",
  ledger: 4242,
  created_at: "2026-09-05T08:00:00.000Z",
  items: [{ name: "Nike Air Max", price: 120.5, quantity: 1 }],
};

const cachedOrder: BuyerOrder = {
  id: "ord-cached",
  orderId: "SS-CACHED",
  userId: "user-123",
  userEmail: "buyer@example.com",
  createdAt: "2026-09-06T08:00:00.000Z",
  total: 55,
  status: "Paid",
  paymentMethod: "stellar",
  tokenSymbol: "XLM",
  tokenAmount: 300,
  txHash: "cached-tx-hash",
  items: [{ name: "Trail Runner", price: 55, quantity: 1 }],
};

describe("fetchBuyerOrders fallback paths", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    supabaseState.result = { data: [], error: null };
    supabaseState.reject = false;
  });

  it("returns the mapped rows when Supabase has a hit", async () => {
    supabaseState.result = { data: [{ ...DB_ROW }], error: null };

    const result = await fetchBuyerOrders("buyer@example.com");

    // Rows came from the server, so this is current state, not a fallback.
    expect(result.source).toBe("server");
    expect(result.stale).toBe(false);
    expect(result.error).toBeNull();
    expect(result.orders).toHaveLength(1);
    const [order] = result.orders;
    expect(order).toMatchObject({
      id: "db-1",
      orderId: "SS-DB-1",
      userId: "user-123",
      userEmail: "buyer@example.com",
      createdAt: "2026-09-05T08:00:00.000Z",
      status: "Paid",
      paymentMethod: "stellar",
      tokenSymbol: "USDC",
      txHash: "abcd1234efgh5678",
      ledger: 4242,
    });
    // Numeric columns are coerced out of PostgREST's string representation.
    expect(order.total).toBe(120.5);
    expect(order.tokenAmount).toBe(12.25);
    expect(order.items).toEqual([{ name: "Nike Air Max", price: 120.5, quantity: 1 }]);
  });

  it("falls back to the local cache when the Supabase query fails, flagged stale", async () => {
    await saveBuyerOrder(cachedOrder);
    supabaseState.reject = true;

    const result = await fetchBuyerOrders("buyer@example.com");

    expect(result.source).toBe("cache");
    expect(result.stale).toBe(true);
    expect(result.error).toBeTruthy();
    expect(result.orders.map((order) => order.orderId)).toEqual(["SS-CACHED"]);
    expect(result.orders[0]).toMatchObject({
      id: "ord-cached",
      orderId: "SS-CACHED",
      userEmail: "buyer@example.com",
      total: 55,
      status: "Paid",
      paymentMethod: "stellar",
      tokenSymbol: "XLM",
    });
    expect(result.orders[0].items).toEqual([{ name: "Trail Runner", price: 55, quantity: 1 }]);
  });

  it("does not fall back across accounts when Supabase fails", async () => {
    await saveBuyerOrder(cachedOrder);
    supabaseState.reject = true;

    const result = await fetchBuyerOrders("someone-else@example.com");

    expect(result.orders).toEqual([]);
    // Still a failure — the empty list is "no cache for this account", not
    // "this account has no orders".
    expect(result.stale).toBe(true);
  });

  it("reports no orders and nothing stale when Supabase is empty and nothing is cached", async () => {
    const result = await fetchBuyerOrders("buyer@example.com");

    expect(result.orders).toEqual([]);
    // The server answered, so the empty history is confirmed rather than a
    // degraded read.
    expect(result.stale).toBe(false);
    expect(result.error).toBeNull();
  });
});
