import { beforeEach, describe, expect, it } from "vitest";
import { getCachedBuyerOrders, BuyerOrder } from "../../lib/buyer-orders";

/**
 * `getCachedBuyerOrders` reads localStorage, which is untrusted input: a cache
 * entry can be hand-edited, truncated by a partial write, or left behind by an
 * older schema. The container being a well-formed array says nothing about the
 * entries inside it, and every entry the function returns is rendered by
 * `components/OrderCard` — which calls `order.total.toFixed(2)`, maps over
 * `order.items` and reads `order.orderId`/`order.createdAt`/`order.status`
 * directly. A single malformed entry therefore crashes the orders page.
 *
 * These tests pin the element-level contract: malformed entries are dropped and
 * a valid cache is returned unchanged.
 */

const STORAGE_KEY = "mova_buyer_orders";

/** A complete, valid order — the shape `saveBuyerOrder` writes. */
function validOrder(overrides: Partial<BuyerOrder> = {}): BuyerOrder {
  return {
    id: "ord-1",
    orderId: "SS-101",
    userId: "user-123",
    userEmail: "buyer@example.com",
    createdAt: "2026-09-05T08:00:00.000Z",
    total: 89.99,
    status: "Paid",
    paymentMethod: "stellar",
    tokenSymbol: "XLM",
    tokenAmount: 750,
    txHash: "mock-stellar-tx-hash",
    ledger: 1234,
    items: [{ name: "Running Shoes", price: 89.99, quantity: 1 }],
    ...overrides,
  };
}

/** Write an arbitrary (possibly corrupt) payload straight into localStorage. */
function writeCache(payload: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

describe("getCachedBuyerOrders — untrusted localStorage payloads", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("non-array payloads", () => {
    it("returns an empty array when the key is absent", () => {
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("returns an empty array for corrupt JSON", () => {
      localStorage.setItem(STORAGE_KEY, "not json at all");
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("returns an empty array for a truncated JSON payload", () => {
      localStorage.setItem(STORAGE_KEY, '[{"orderId":"SS-101","total":');
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops a payload that is an object rather than an array", () => {
      writeCache({ orderId: "SS-101", total: 10 });
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops a payload that is a bare primitive", () => {
      writeCache("SS-101");
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache(42);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache(true);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache(null);
      expect(getCachedBuyerOrders()).toEqual([]);
    });
  });

  describe("malformed entries inside a valid array", () => {
    it("drops null and undefined entries", () => {
      writeCache([null, validOrder(), undefined]);
      const orders = getCachedBuyerOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe("SS-101");
    });

    it("drops primitive entries", () => {
      writeCache(["SS-101", 7, true, validOrder()]);
      const orders = getCachedBuyerOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe("SS-101");
    });

    it("drops a nested array entry", () => {
      writeCache([["not", "an", "order"], validOrder()]);
      expect(getCachedBuyerOrders()).toHaveLength(1);
    });
  });

  describe("required fields the orders card renders", () => {
    it("drops an entry with no orderId", () => {
      const { orderId: _omitted, ...rest } = validOrder();
      writeCache([rest]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose orderId is empty or blank", () => {
      writeCache([validOrder({ orderId: "" })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ orderId: "   " })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose orderId is not a string", () => {
      writeCache([validOrder({ orderId: 101 as unknown as string })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose total is not a finite number", () => {
      // `OrderCard` calls `order.total.toFixed(2)`, so a string total throws.
      writeCache([validOrder({ total: "89.99" as unknown as number })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ total: null as unknown as number })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ total: Number.NaN })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ total: Number.POSITIVE_INFINITY })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose createdAt is missing or not a string", () => {
      const { createdAt: _omitted, ...rest } = validOrder();
      writeCache([rest]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ createdAt: 1725523200 as unknown as string })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose status is missing or not a string", () => {
      const { status: _omitted, ...rest } = validOrder();
      writeCache([rest]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ status: 3 as unknown as BuyerOrder["status"] })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose paymentMethod is missing or not a string", () => {
      const { paymentMethod: _omitted, ...rest } = validOrder();
      writeCache([rest]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([
        validOrder({
          paymentMethod: { kind: "stellar" } as unknown as BuyerOrder["paymentMethod"],
        }),
      ]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });
  });

  describe("optional fields must be the right type when present", () => {
    it("drops an entry whose tokenAmount is a non-numeric truthy value", () => {
      // `order.tokenAmount ? order.tokenAmount.toFixed(2) : ""` throws on a string.
      writeCache([validOrder({ tokenAmount: "750" as unknown as number })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose ledger is not a finite number", () => {
      writeCache([validOrder({ ledger: "1234" as unknown as number })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose string fields are the wrong type", () => {
      writeCache([validOrder({ userEmail: 42 as unknown as string })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ userId: {} as unknown as string })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ txHash: [] as unknown as string })]);
      expect(getCachedBuyerOrders()).toEqual([]);
      writeCache([validOrder({ tokenSymbol: 7 as unknown as string })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("accepts an entry with the optional fields absent", () => {
      writeCache([
        {
          orderId: "SS-201",
          createdAt: "2026-09-05T08:00:00.000Z",
          total: 12.5,
          status: "Pending",
          paymentMethod: "card",
          items: [],
        },
      ]);
      const orders = getCachedBuyerOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].orderId).toBe("SS-201");
      expect(orders[0].total).toBe(12.5);
    });
  });

  describe("items array", () => {
    it("drops an entry whose items is a truthy non-array", () => {
      // `order.items && order.items.length > 0` is true for a non-empty string,
      // and the following `.map` then throws.
      writeCache([validOrder({ items: "Running Shoes" as unknown as BuyerOrder["items"] })]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry containing a null or primitive item", () => {
      writeCache([validOrder({ items: [null as unknown as BuyerOrder["items"][number]] })]);
      expect(getCachedBuyerOrders()).toEqual([]);

      writeCache([
        validOrder({ items: ["Running Shoes" as unknown as BuyerOrder["items"][number]] }),
      ]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose item is missing a renderable name or price", () => {
      writeCache([
        validOrder({
          items: [{ price: 10 } as unknown as BuyerOrder["items"][number]],
        }),
      ]);
      expect(getCachedBuyerOrders()).toEqual([]);

      writeCache([
        validOrder({
          items: [{ name: "Running Shoes" } as unknown as BuyerOrder["items"][number]],
        }),
      ]);
      expect(getCachedBuyerOrders()).toEqual([]);

      writeCache([
        validOrder({
          items: [{ name: 42, price: 10 } as unknown as BuyerOrder["items"][number]],
        }),
      ]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("drops an entry whose item has a non-numeric quantity", () => {
      writeCache([
        validOrder({
          items: [
            {
              name: "Running Shoes",
              price: 89.99,
              quantity: "1",
            } as unknown as BuyerOrder["items"][number],
          ],
        }),
      ]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("accepts an entry with items omitted entirely", () => {
      const { items: _omitted, ...rest } = validOrder();
      writeCache([rest]);
      const orders = getCachedBuyerOrders();
      expect(orders).toHaveLength(1);
      expect(orders[0].items).toBeUndefined();
    });
  });

  describe("valid caches and mixed payloads", () => {
    it("returns a valid cache entry unchanged", () => {
      const order = validOrder();
      writeCache([order]);
      const orders = getCachedBuyerOrders();
      // Passed straight through: identical values, no key dropped or rewritten.
      expect(orders).toEqual([order]);
      expect(orders).toHaveLength(1);
      expect(Object.keys(orders[0]).sort()).toEqual(Object.keys(order).sort());
    });

    it("keeps every valid entry when the array also holds malformed ones", () => {
      const first = validOrder({ orderId: "SS-1", id: "ord-1" });
      const second = validOrder({ orderId: "SS-2", id: "ord-2", total: 0 });
      writeCache([
        null,
        first,
        "garbage",
        { orderId: "SS-broken" },
        {
          orderId: "SS-3",
          total: "not a number",
          createdAt: "x",
          status: "Paid",
          paymentMethod: "card",
        },
        second,
        [],
      ]);

      const orders = getCachedBuyerOrders();
      expect(orders.map((o) => o.orderId)).toEqual(["SS-1", "SS-2"]);
      expect(orders[0]).toEqual(first);
      expect(orders[1]).toEqual(second);
    });

    it("returns an empty array when every entry is malformed", () => {
      writeCache([null, 1, "x", {}, [], { orderId: "SS-1" }]);
      expect(getCachedBuyerOrders()).toEqual([]);
    });

    it("preserves the stored order of the entries it keeps", () => {
      writeCache([
        validOrder({ orderId: "SS-1", createdAt: "2026-09-01T00:00:00.000Z" }),
        null,
        validOrder({ orderId: "SS-2", createdAt: "2026-09-02T00:00:00.000Z" }),
        validOrder({ orderId: "SS-3", createdAt: "2026-09-03T00:00:00.000Z" }),
      ]);
      expect(getCachedBuyerOrders().map((o) => o.orderId)).toEqual(["SS-1", "SS-2", "SS-3"]);
    });
  });
});
