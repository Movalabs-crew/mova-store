import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { CartProvider, useCart } from "../../context/CartContext";

const shirt = { id: "p1", name: "Shirt", price: 25 };
const hat = { id: "p2", name: "Hat", price: 10 };

describe("CartContext referential stability (Issue #633)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CartProvider, null, children);

  it("keeps the context value identical across re-renders that do not change the cart", () => {
    const { result, rerender } = renderHook(() => useCart(), { wrapper });

    const firstValue = result.current;
    const firstAdd = result.current.addToCart;
    const firstClear = result.current.clearCart;

    rerender();
    rerender();

    expect(result.current).toBe(firstValue);
    expect(result.current.addToCart).toBe(firstAdd);
    expect(result.current.clearCart).toBe(firstClear);
  });

  it("produces a new value only when the cart actually changes", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const before = result.current;

    act(() => {
      result.current.addToCart(shirt);
    });

    expect(result.current).not.toBe(before);
    // addToCart generates a per-line cartItemId; this case is about the
    // identity of the context value, not the line id.
    expect(result.current.cartItems.map(({ cartItemId, ...rest }) => rest)).toEqual([shirt]);
    expect(result.current.totalPrice).toBe(25);
  });

  it("keeps the stable callbacks across an unrelated (no-op) update", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const addToCart = result.current.addToCart;

    act(() => {
      result.current.addToCart(shirt);
    });
    expect(result.current.addToCart).toBe(addToCart);

    act(() => {
      result.current.removeFromCart(hat); // not in the cart
    });
    expect(result.current.addToCart).toBe(addToCart);
  });
});
