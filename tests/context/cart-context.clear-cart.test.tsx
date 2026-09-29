import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { CartProvider, useCart } from "../../context/CartContext";

describe("CartContext clearCart and cross-remount persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CartProvider, null, children);

  const item1 = { id: "p1", name: "Shoe 1", price: 100 };
  const item2 = { id: "p2", name: "Shoe 2", price: 50 };

  it("resets every cart total when the cart is cleared", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(item1);
      result.current.addToCart(item2);
    });

    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(150);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("removes the stored keys rather than writing zeroes", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(item1);
    });

    expect(localStorage.getItem("cartItems")).not.toBeNull();

    act(() => {
      result.current.clearCart();
    });

    // clearCart uses removeItem, so a later read sees an absent key rather than
    // a stored "0". Asserting absence keeps that distinction pinned: writing
    // zeroes instead would still pass a totals-only assertion.
    expect(localStorage.getItem("cartItems")).toBeNull();
    expect(localStorage.getItem("itemCount")).toBeNull();
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });

  it("is a safe no-op on an already empty cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(() => {
      act(() => {
        result.current.clearCart();
      });
    }).not.toThrow();

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("restores a stored cart when the provider is mounted again", () => {
    const first = renderHook(() => useCart(), { wrapper });

    act(() => {
      first.result.current.addToCart(item1);
      first.result.current.addToCart(item2);
    });
    first.unmount();

    const second = renderHook(() => useCart(), { wrapper });

    expect(second.result.current.itemCount).toBe(2);
    expect(second.result.current.totalPrice).toBe(150);
    expect(second.result.current.cartItems).toHaveLength(2);
  });

  it("stays empty after a remount once the cart has been cleared", () => {
    const first = renderHook(() => useCart(), { wrapper });

    act(() => {
      first.result.current.addToCart(item1);
    });
    act(() => {
      first.result.current.clearCart();
    });
    first.unmount();

    // The user-visible guarantee: clearing has to survive the next mount, not
    // just reset the totals held in memory.
    const second = renderHook(() => useCart(), { wrapper });

    expect(second.result.current.cartItems).toEqual([]);
    expect(second.result.current.itemCount).toBe(0);
    expect(second.result.current.totalPrice).toBe(0);
  });
});
