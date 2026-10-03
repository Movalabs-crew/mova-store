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
    expect(JSON.parse(localStorage.getItem("cartItems") || "{}").items || []).toHaveLength(1);
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

  it("removes the second of two legacy rows identified only by lineId", () => {
    const legacyRows = [
      { id: "p1", lineId: "line-a", name: "Shoe 1", price: 50 },
      { id: "p1", lineId: "line-b", name: "Shoe 1", price: 50 },
    ];
    localStorage.setItem("cartItems", JSON.stringify(legacyRows));
    localStorage.setItem("itemCount", "2");
    localStorage.setItem("totalPrice", "100");

    const { result } = renderHook(() => useCart(), { wrapper });

    // Hydration assigns a cartItemId but keeps the legacy lineId. The caller
    // only has that legacy line identity, so the second row has to be matched
    // by lineId instead of falling back to the shared product id.
    act(() => {
      result.current.removeFromCart({ id: "p1", lineId: "line-b" });
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].lineId).toBe("line-a");
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
  });

  it("removes the middle of three identical rows and preserves the other two in order", () => {
    const product = { id: "p1", name: "Shoe 1", price: 50 };
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    const lineIds = result.current.cartItems.map((item) => item.cartItemId);
    expect(new Set(lineIds).size).toBe(3);

    act(() => {
      result.current.removeFromCart(lineIds[1]);
    });

    expect(result.current.cartItems.map((item) => item.cartItemId)).toEqual([
      lineIds[0],
      lineIds[2],
    ]);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(100);
  });

  it("ignores a cartItemId string that no longer exists without changing the cart", () => {
    const product = { id: "p1", name: "Shoe 1", price: 50 };
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    act(() => {
      result.current.removeFromCart("stale-cart-item-id");
    });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(100);
    expect(JSON.parse(localStorage.getItem("cartItems") || "{}").items || []).toHaveLength(2);
  });

  it("refuses a value-only match when several duplicates share the product id", () => {
    const product = { id: "p1", name: "Shoe 1", price: 50 };
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    // No line identity is supplied, so the two rows are indistinguishable by
    // value. Removing the first match would delete an arbitrary duplicate, so
    // the cart has to stay untouched.
    act(() => {
      result.current.removeFromCart({ id: "p1", name: "Shoe 1", price: 50 });
    });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(100);
  });

  it("still removes a bare product when it identifies exactly one line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ id: "p1", name: "Shoe 1", price: 100 });
      result.current.addToCart({ id: "p2", name: "Shoe 2", price: 50 });
    });

    act(() => {
      result.current.removeFromCart({ id: "p1", name: "Shoe 1", price: 100 });
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe("p2");
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(50);
  });
});
