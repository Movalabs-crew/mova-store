import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { CartProvider, useCart } from "../../context/CartContext";

describe("CartContext removeFromCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CartProvider, null, children);

  it("adds and removes items correctly", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const item1 = { id: "p1", name: "Shoe 1", price: 100 };
    const item2 = { id: "p2", name: "Shoe 2", price: 50 };

    act(() => {
      result.current.addToCart(item1);
      result.current.addToCart(item2);
    });

    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(150);
    expect(result.current.cartItems).toHaveLength(2);

    act(() => {
      result.current.removeFromCart(item1);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe("p2");

    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("50");
    expect(JSON.parse(localStorage.getItem("cartItems") || "[]")).toHaveLength(1);
  });

  it("leaves itemCount and totalPrice unchanged when removing an item not in the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const item1 = { id: "p1", name: "Shoe 1", price: 100 };
    const nonExistentItem = { id: "p999", name: "Ghost", price: 999 };

    act(() => {
      result.current.addToCart(item1);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(100);

    // Attempt to remove non-existent item
    act(() => {
      result.current.removeFromCart(nonExistentItem);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(100);
    expect(result.current.cartItems).toHaveLength(1);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("100");
  });

  it("repeated remove calls can never produce a negative itemCount or totalPrice", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const item1 = { id: "p1", name: "Shoe 1", price: 100 };

    // Cart is empty initially
    act(() => {
      result.current.removeFromCart(item1);
      result.current.removeFromCart(item1);
    });

    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.cartItems).toEqual([]);
  });
});
