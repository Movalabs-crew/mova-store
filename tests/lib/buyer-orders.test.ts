import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveBuyerOrder,
  getCachedBuyerOrders,
  fetchBuyerOrders,
  verifyOrderOnChain,
  BuyerOrderPersistenceError,
  BuyerOrder,
} from "../../lib/buyer-orders";
import * as stellarOrders from "../../lib/stellar/orders";

/**
 * Rows the mocked Supabase `select -> order -> eq` chain resolves with.
 * Tests reset this to `[]` to exercise the localStorage fallback.
 */
const db = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

// Shared so a test can make the insert resolve with an { error } (issue #561).
const insertMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: null, error: null }),
);

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertMock,
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

  const OWNER_ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const OTHER_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    db.rows = [{ ...DB_ROW }];
    insertMock.mockResolvedValue({ data: null, error: null });
  });

  it("saves an order and caches it in localStorage", async () => {
    const saved = await saveBuyerOrder(sampleOrder);
    expect(saved.orderId).toBe("SS-101");

    const cached = getCachedBuyerOrders();
    expect(cached.length).toBe(1);
    expect(cached[0].orderId).toBe("SS-101");
    expect(cached[0].tokenSymbol).toBe("XLM");
  });

  it("throws and stays cache-only when the insert resolves with an error (issue #561)", async () => {
    insertMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "orders_pkey"' },
    });

    await expect(saveBuyerOrder(sampleOrder)).rejects.toBeInstanceOf(
      BuyerOrderPersistenceError
    );

    // The order is still cached locally (continuity), but it is cache-only.
    const cached = getCachedBuyerOrders();
    expect(cached.map((o) => o.orderId)).toContain("SS-101");
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


    expect(verification.onChainStatus).toBe("Paid");
    expect(verification.buyer).toBe("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  });

  it("does not verify an order that belongs to another wallet", async () => {
    vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce({ ...ON_CHAIN_ORDER });

    const verification = await verifyOrderOnChain("SS-101", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");

    expect(verification.verified).toBe(false);
    // The on-chain buyer is still surfaced so the UI can explain the mismatch.
    expect(verification.buyer).toBe("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
    expect(verification.onChainStatus).toBe("Paid");
  });

  it("fails closed when the caller cannot supply a connected address", async () => {
    vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce({ ...ON_CHAIN_ORDER });

    const verification = await verifyOrderOnChain("SS-101", "");

    expect(verification.verified).toBe(false);
    expect(verification.onChainStatus).toBe("Paid");
  });

  it("does not verify an order marked Unknown even for the owning wallet", async () => {
    vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce({
      ...ON_CHAIN_ORDER,
      status: "Unknown",
    });

    const verification = await verifyOrderOnChain("SS-101", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

    expect(verification.verified).toBe(false);
    expect(verification.onChainStatus).toBe("Unknown");
  });

  it("returns verified false when on-chain order is not found", async () => {
    vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce(null);
    const verification = await verifyOrderOnChain("UNKNOWN-1", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
    expect(verification.verified).toBe(false);
  });

  describe("verifyOrderOnChain ownership", () => {
    it("reports a matching buyer as verified and returns their address", async () => {
      vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce({
        orderId: "SS-101",
        orderIdHash: "010203",
        buyer: OWNER_ADDRESS,
        amount: BigInt(899900000),
        amountDisplay: "89.99",
        token: "C...",
        tokenSymbol: "USDC",
        timestamp: 1725523200,
        status: "Paid",
      });

      const verification = await verifyOrderOnChain("SS-101", OWNER_ADDRESS);

      expect(verification.verified).toBe(true);
      expect(verification.buyer).toBe(OWNER_ADDRESS);
    });

    it("reports a mismatched buyer as not verified and returns the on-chain buyer", async () => {
      vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce({
        orderId: "SS-101",
        orderIdHash: "010203",
        buyer: OWNER_ADDRESS,
        amount: BigInt(899900000),
        amountDisplay: "89.99",
        token: "C...",
        tokenSymbol: "USDC",
        timestamp: 1725523200,
        status: "Paid",
      });

      const verification = await verifyOrderOnChain("SS-101", OTHER_ADDRESS);

      expect(verification.verified).toBe(false);
      expect(verification.buyer).toBe(OWNER_ADDRESS);
    });

    it("reports an absent order as not verified", async () => {
      vi.spyOn(stellarOrders, "readOrder").mockResolvedValueOnce(null);

      const verification = await verifyOrderOnChain("SS-MISSING", OWNER_ADDRESS);

      expect(verification.verified).toBe(false);
      expect(verification.buyer).toBeUndefined();
    });
  });
})
