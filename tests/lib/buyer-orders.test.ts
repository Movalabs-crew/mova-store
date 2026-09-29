import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveBuyerOrder,
  getCachedBuyerOrders,
  fetchBuyerOrders,
  verifyOrderOnChain,
  BuyerOrder,
} from "../../lib/buyer-orders";
import * as stellarOrders from "../../lib/stellar/orders";

/**
 * Rows the mocked Supabase `select -> order -> eq` chain resolves with.
 * Tests reset this to `[]` to exercise the localStorage fallback.
 */
const db = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn(() => Promise.resolve({ data: db.rows, error: null })),
    })),
  },
}));

const DB_ROW = {
  id: "db-1",
  order_id: "SS-DB-1",
  user_email: "buyer@example.com",
  total: 120,
  status: "Paid",
  payment_method: "stellar",
  token_symbol: "USDC",
  tx_hash: "abcd1234efgh5678",
  created_at: "2026-09-05T08:00:00.000Z",
  items: [{ name: "Nike Air Max", price: 120, quantity: 1 }],
};

describe("Buyer Orders Management", () => {
  const sampleOrder: BuyerOrder = {
    id: "ord-1",
    orderId: "SS-101",
    userEmail: "buyer@example.com",
    userId: "user-123",
    total: 89.99,
    status: "Paid",
    paymentMethod: "stellar",
    tokenSymbol: "XLM",
    tokenAmount: 750,
    txHash: "mock-stellar-tx-hash",
    createdAt: "2026-09-05T08:00:00.000Z",
    items: [{ name: "Running Shoes", price: 89.99, quantity: 1 }],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    db.rows = [{ ...DB_ROW }];
  });

  it("saves an order and caches it in localStorage", async () => {
    const saved = await saveBuyerOrder(sampleOrder);
    expect(saved.orderId).toBe("SS-101");

    const cached = getCachedBuyerOrders();
    expect(cached.length).toBe(1);
    expect(cached[0].orderId).toBe("SS-101");
    expect(cached[0].tokenSymbol).toBe("XLM");
  });

  it("updates an existing order when same orderId is saved again", async () => {
    await saveBuyerOrder(sampleOrder);
    const updated: BuyerOrder = { ...sampleOrder, status: "Shipped" };
    await saveBuyerOrder(updated);

    const cached = getCachedBuyerOrders();
    expect(cached.length).toBe(1);
    expect(cached[0].status).toBe("Shipped");
  });

  it("fetches orders from Supabase when available", async () => {
    const orders = await fetchBuyerOrders("buyer@example.com");
    expect(orders.length).toBe(1);
    expect(orders[0].orderId).toBe("SS-DB-1");
    expect(orders[0].total).toBe(120);
  });

  it("falls back to the local cache for the signed-in user when Supabase is empty", async () => {
    db.rows = [];
    await saveBuyerOrder(sampleOrder);

    const orders = await fetchBuyerOrders("buyer@example.com");

    expect(orders.length).toBe(1);
    expect(orders[0].orderId).toBe("SS-101");
  });

  it("matches a cached order by userId as well as by email", async () => {
    db.rows = [];
    await saveBuyerOrder(sampleOrder);

    const byEmail = await fetchBuyerOrders("buyer@example.com");
    const byId = await fetchBuyerOrders("user-123");

    expect(byEmail.map((o) => o.orderId)).toEqual(["SS-101"]);
    expect(byId.map((o) => o.orderId)).toEqual(["SS-101"]);
  });

  it("never returns another account's cached orders (cross-user leak)", async () => {
    db.rows = [];
    await saveBuyerOrder(sampleOrder);

    const intruder = await fetchBuyerOrders("someone-else@example.com");

    expect(intruder).toEqual([]);
  });

  it("does not surface an order that is missing one identifier", async () => {
    db.rows = [];
    // The old `||` filter matched this order for every caller because it had
    // no userId, so anyone could see it on a shared browser.
    const emailOnly: BuyerOrder = {
      ...sampleOrder,
      id: "ord-email-only",
      orderId: "SS-EMAIL-ONLY",
      userId: undefined,
    };
    await saveBuyerOrder(emailOnly);

    const unrelated = await fetchBuyerOrders("user-999");
    const owner = await fetchBuyerOrders("buyer@example.com");

    expect(unrelated).toEqual([]);
    expect(owner.map((o) => o.orderId)).toEqual(["SS-EMAIL-ONLY"]);
  });

  it("does not return attributed orders to an anonymous caller", async () => {
    db.rows = [];
    await saveBuyerOrder(sampleOrder);

    const anonymous = await fetchBuyerOrders(undefined);

    expect(anonymous).toEqual([]);
  });

  it("shows guest orders only to an anonymous caller", async () => {
    db.rows = [];
    const guestOrder: BuyerOrder = {
      ...sampleOrder,
      id: "ord-guest",
      orderId: "SS-GUEST",
      userId: undefined,
      userEmail: undefined,
    };
    await saveBuyerOrder(guestOrder);

    const signedIn = await fetchBuyerOrders("buyer@example.com");
    const anonymous = await fetchBuyerOrders(undefined);

    expect(signedIn).toEqual([]);
    expect(anonymous.map((o) => o.orderId)).toEqual(["SS-GUEST"]);
  });

  it("verifies order on-chain via readOrder", async () => {
    vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce({
      orderId: "SS-101",
      orderIdHash: "010203",
      buyer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      amount: BigInt(899900000),
      amountDisplay: "89.99",
      token: "C...",
      tokenSymbol: "USDC",
      timestamp: 1725523200,
      status: "Paid",
    });

    const verification = await verifyOrderOnChain("SS-101");
    expect(verification.verified).toBe(true);
    expect(verification.onChainStatus).toBe("Paid");
  });

  it("returns verified false when on-chain order is not found or Unknown", async () => {
    vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce(null);
    const verification = await verifyOrderOnChain("UNKNOWN-1");
    expect(verification.verified).toBe(false);
  });
});
