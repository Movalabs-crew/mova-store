import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  CartProvider,
  useCart,
  computeTotalPrice,
  createCartItemId,
  ensureCartItemIds,
  readStoredCart,
} from "../../context/CartContext";

const shirt = { id: "p1", name: "Shirt", price: 25.5 };
const hat = { id: "p2", name: "Hat", price: 10 };
const socks = { id: "p3", name: "Socks", price: 4.5 };

/**
 * Issue #619: the cart total must be derived from the items, not kept as a
 * second piece of state (and a second localStorage key) that can drift.
 */
describe("CartContext derived total (Issue #619)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CartProvider, null, children);

  function readStoredItems(): Array<Record<string, unknown>> {
    const raw = localStorage.getItem("cartItems");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed?.items) ? parsed.items : [];
  }

  it("derives the total from the items after a removal", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
      result.current.addToCart(hat);
    });
    expect(result.current.totalPrice).toBe(35.5);

    const firstLine = result.current.cartItems[0];
    act(() => {
      result.current.removeFromCart(firstLine);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.totalPrice).toBe(10);
    expect(result.current.totalPrice).toBe(computeTotalPrice(result.current.cartItems));
    expect(readStoredItems()).toHaveLength(1);
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });

  it("ignores a legacy stored totalPrice on read and does not keep it", () => {
    localStorage.setItem("cartItems", JSON.stringify([shirt, hat]));
    localStorage.setItem("itemCount", "2");
    // A stale/forged total that describes a cart that does not exist.
    localStorage.setItem("totalPrice", "9999");

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.totalPrice).toBe(35.5);
    expect(result.current.totalPrice).toBe(computeTotalPrice(result.current.cartItems));
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });

  it("reports a zero total for an empty cart and after clear", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.totalPrice).toBe(0);

    act(() => {
      result.current.addToCart(shirt);
    });
    expect(result.current.totalPrice).toBe(25.5);

    act(() => {
      result.current.clearCart();
    });
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.totalPrice).toBe(0);
  });

  it("never persists a separate totalPrice key through any mutation", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
      result.current.addToCart(hat);
    });
    expect(localStorage.getItem("totalPrice")).toBeNull();

    act(() => {
      result.current.removeFromCart(result.current.cartItems[0]);
    });
    expect(localStorage.getItem("totalPrice")).toBeNull();

    act(() => {
      result.current.clearCart();
    });
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });

  it("matches computeTotalPrice for every cart state", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const assertDerived = () => {
      expect(result.current.totalPrice).toBe(computeTotalPrice(result.current.cartItems));
    };

    assertDerived();

    act(() => {
      result.current.addToCart(shirt);
    });
    expect(result.current.totalPrice).toBe(25.5);
    assertDerived();

    act(() => {
      result.current.addToCart(hat);
      result.current.addToCart(socks);
    });
    expect(result.current.totalPrice).toBe(40);
    assertDerived();

    act(() => {
      result.current.removeFromCart(result.current.cartItems[1]);
    });
    expect(result.current.totalPrice).toBe(30);
    assertDerived();

    act(() => {
      result.current.removeFromCart(result.current.cartItems[0]);
    });
    expect(result.current.totalPrice).toBe(4.5);
    assertDerived();

    act(() => {
      result.current.clearCart();
    });
    expect(result.current.totalPrice).toBe(0);
    assertDerived();
  });

  it("keeps the four exported helpers present and behaving as before", () => {
    expect(typeof computeTotalPrice).toBe("function");
    expect(typeof createCartItemId).toBe("function");
    expect(typeof ensureCartItemIds).toBe("function");
    expect(typeof readStoredCart).toBe("function");

    expect(computeTotalPrice([shirt, hat])).toBe(35.5);
    expect(computeTotalPrice([])).toBe(0);
    expect(computeTotalPrice(null)).toBe(0);

    const firstId = createCartItemId();
    const secondId = createCartItemId();
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);

    const legacy = ensureCartItemIds([{ id: "x", name: "X", price: 5 }]);
    expect(legacy.changed).toBe(true);
    expect(legacy.items[0].cartItemId).toBeTruthy();
    const normalised = ensureCartItemIds(legacy.items);
    expect(normalised.changed).toBe(false);

    // readStoredCart still returns the count and total derived from the items,
    // even when a legacy standalone total is present.
    localStorage.setItem("cartItems", JSON.stringify([shirt]));
    localStorage.setItem("totalPrice", "12345");
    const stored = readStoredCart();
    expect(stored.storedCartItems).toHaveLength(1);
    expect(stored.storedItemCount).toBe(1);
    expect(stored.storedTotalPrice).toBe(25.5);
  });
});
