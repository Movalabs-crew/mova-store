import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "../../context/CartContext";

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const prod1 = { id: "p1", name: "Classic Runner", price: 50 };
const prod2 = { id: "p2", name: "Trail Trekker", price: 80 };

describe("CartProvider Transitions & Storage Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with zero count and empty cart when storage is empty", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("handles adding a product and updates localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });

    expect(result.current.cartItems).toEqual([prod1]);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);

    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([prod1]);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("50");
  });

  it("handles duplicate add of the same product", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });
    act(() => {
      result.current.addToCart(prod1);
    });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(100);

    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([prod1, prod1]);
    expect(localStorage.getItem("itemCount")).toBe("2");
    expect(localStorage.getItem("totalPrice")).toBe("100");
  });

  it("removes an existing product and updates localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
      result.current.addToCart(prod2);
    });

    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(130);

    act(() => {
      result.current.removeFromCart(prod1);
    });

    expect(result.current.cartItems).toEqual([prod2]);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(80);

    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([prod2]);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("80");
  });

  it("locks negative-itemCount bug: removing missing item is a no-op", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });

    const nonExistent = { id: "missing-item", price: 999 };

    act(() => {
      result.current.removeFromCart(nonExistent);
    });

    // cartItems, itemCount, and totalPrice must remain unchanged
    expect(result.current.cartItems).toEqual([prod1]);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("50");
  });

  it("locks negative-itemCount bug: repeat remove on empty cart never goes below zero", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });

    act(() => {
      result.current.removeFromCart(prod1);
    });

    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);

    // Double remove
    act(() => {
      result.current.removeFromCart(prod1);
    });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(Number(localStorage.getItem("itemCount"))).toBe(0);
    expect(Number(localStorage.getItem("totalPrice"))).toBe(0);
  });

  it("clears cart and removes keys from localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
      result.current.addToCart(prod2);
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);

    expect(localStorage.getItem("cartItems")).toBeNull();
    expect(localStorage.getItem("itemCount")).toBeNull();
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });

  it("safely hydrates from corrupt or invalid localStorage payloads", () => {
    localStorage.setItem("cartItems", "{bad-json[");
    localStorage.setItem("itemCount", "-99");
    localStorage.setItem("totalPrice", "invalid_number");

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("persists and restores cart across remount", () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
      result.current.addToCart(prod2);
    });

    unmount();

    // Re-mount fresh hook
    const { result: remounted } = renderHook(() => useCart(), { wrapper });

    expect(remounted.current.cartItems).toEqual([prod1, prod2]);
    expect(remounted.current.itemCount).toBe(2);
    expect(remounted.current.totalPrice).toBe(130);
  });
});
