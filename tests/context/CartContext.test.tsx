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

  it("assigns unique cartItemId to duplicate items and removes specific instance (lower row)", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const product = { id: "p1", name: "Shoe 1", price: 50 };

    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(100);
    expect(result.current.cartItems).toHaveLength(2);

    const [firstInstance, secondInstance] = result.current.cartItems;
    expect(firstInstance.cartItemId).toBeDefined();
    expect(secondInstance.cartItemId).toBeDefined();
    expect(firstInstance.cartItemId).not.toBe(secondInstance.cartItemId);

    // Remove the lower/second instance
    act(() => {
      result.current.removeFromCart(secondInstance);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].cartItemId).toBe(firstInstance.cartItemId);
  });

  it("removes upper duplicate row and leaves lower row intact", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const product = { id: "p1", name: "Shoe 1", price: 50 };

    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    const [firstInstance, secondInstance] = result.current.cartItems;

    // Remove the upper/first instance
    act(() => {
      result.current.removeFromCart(firstInstance);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].cartItemId).toBe(secondInstance.cartItemId);
  });

  it("supports removal by cartItemId string directly", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    const product = { id: "p1", name: "Shoe 1", price: 50 };

    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    const secondInstanceId = result.current.cartItems[1].cartItemId;

    act(() => {
      result.current.removeFromCart(secondInstanceId);
    });

    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
    expect(result.current.cartItems[0].cartItemId).not.toBe(secondInstanceId);
  });

  it("ensures legacy items loaded from localStorage without cartItemId are assigned unique cartItemIds", () => {
    const legacyItems = [
      { id: "legacy1", name: "Legacy A", price: 30 },
      { id: "legacy1", name: "Legacy A (Duplicate)", price: 30 },
    ];
    localStorage.setItem("cartItems", JSON.stringify(legacyItems));
    localStorage.setItem("itemCount", "2");
    localStorage.setItem("totalPrice", "60");

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.cartItems[0].cartItemId).toBeDefined();
    expect(result.current.cartItems[1].cartItemId).toBeDefined();
    expect(result.current.cartItems[0].cartItemId).not.toBe(result.current.cartItems[1].cartItemId);

    // Can remove second instance independently
    act(() => {
      result.current.removeFromCart(result.current.cartItems[1]);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(30);
  });
});
