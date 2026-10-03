import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "../../lib/auth";
import { getCachedBuyerOrders } from "../../lib/buyer-orders";
import { supabase } from "../../lib/supabase";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}));

const STORAGE_KEY = "mova_buyer_orders";

function cachedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderId: "SS-1",
    userId: "user-a",
    userEmail: "first@example.com",
    createdAt: "2026-01-01T00:00:00.000Z",
    total: 42,
    status: "Paid",
    paymentMethod: "stellar",
    items: [{ name: "Shoe", price: 42 }],
    ...overrides,
  };
}

describe("logout clears the cached buyer orders (#555)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("drops mova_buyer_orders on sign-out so the next account cannot read them", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([cachedOrder()]));
    expect(getCachedBuyerOrders()).toHaveLength(1);

    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getCachedBuyerOrders()).toEqual([]);
  });

  it("preserves unrelated localStorage keys while clearing the order cache", async () => {
    localStorage.setItem("cartItems", JSON.stringify([{ id: 1, name: "Shoe" }]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify([cachedOrder()]));

    await logout();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("cartItems")).not.toBeNull();
  });

  it("keeps the cache when signOut fails so a still-signed-in user is unaffected", async () => {
    supabase.auth.signOut.mockResolvedValue({ error: { message: "Could not sign out" } });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([cachedOrder()]));

    await expect(logout()).rejects.toThrow("Error logging out: Could not sign out");

    expect(getCachedBuyerOrders()).toHaveLength(1);
  });
});
