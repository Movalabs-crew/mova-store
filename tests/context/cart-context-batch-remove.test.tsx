import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart, computeTotalPrice } from "../../context/CartContext";

/**
 * Issue #575: `removeFromCart` used to recompute the total from the captured
 * `cartItems` value. When two removals run inside one render window, the second
 * one still saw the pre-batch cart, so it computed the total from stale state.
 * These cases drive both removals in a single `act()` so the total can only be
 * right if it is derived from `prev` inside the state updater.
 */
describe("CartContext removeFromCart within a single tick (Issue #575)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CartProvider, null, children);

  const a = { id: "p1", name: "A", price: 30 };
  const b = { id: "p2", name: "B", price: 70 };
  const c = { id: "p3", name: "C", price: 19.5 };

  function readStored() {
    const raw = localStorage.getItem("cartItems");
    if (!raw) return { items: [] as Array<Record<string, unknown>> };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { items: parsed };
    return { items: Array.isArray(parsed?.items) ? parsed.items : [] };
  }

  it("empties the cart when both lines are removed in one act", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(a);
      result.current.addToCart(b);
    });

    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(100);

    const [lineA, lineB] = result.current.cartItems;

    act(() => {
      result.current.removeFromCart(lineA);
      result.current.removeFromCart(lineB);
    });

    expect(result.current.cartItems).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    // The persisted payload must describe the same (empty) cart.
    expect(readStored().items).toHaveLength(0);
    expect(localStorage.getItem("itemCount")).toBe("0");
    expect(localStorage.getItem("totalPrice")).toBe("0");
  });

  it("keeps the total equal to the sum of the surviving lines", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(a);
      result.current.addToCart(b);
      result.current.addToCart(c);
    });

    expect(result.current.totalPrice).toBe(119.5);

    const [lineA, lineB, lineC] = result.current.cartItems;

    act(() => {
      result.current.removeFromCart(lineA);
      result.current.removeFromCart(lineB);
    });

    // Only `c` survives; the total has to be derived from what is left, not
    // from the cart captured before the batch ran.
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe("p3");
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(19.5);
    expect(result.current.totalPrice).toBe(computeTotalPrice(result.current.cartItems));
    expect(readStored().items.map((item) => item.id)).toEqual(["p3"]);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("19.5");

    // `lineC` is unused only to keep the destructuring explicit about which
    // identities were captured; assert it so the intent is pinned.
    expect(lineC.id).toBe("p3");
  });
});
