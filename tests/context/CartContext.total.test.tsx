import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { CartProvider, computeCartTotal, useCart } from "../../context/CartContext";

describe("computeCartTotal", () => {
  it("sums numeric prices and ignores non-array input", () => {
    expect(computeCartTotal([{ price: 1.5 }, { price: 2 }, { price: 0.25 }])).toBe(3.75);
    expect(computeCartTotal([])).toBe(0);
    expect(computeCartTotal(undefined)).toBe(0);
    expect(computeCartTotal({ not: "an array" })).toBe(0);
  });

  it("coerces string prices and treats missing/invalid prices as zero", () => {
    expect(computeCartTotal([{ price: "10" }, {}, { price: null }, { price: "abc" }])).toBe(10);
  });
});

describe("CartProvider derives the total from the items (Issue #619)", () => {
  beforeEach(() => localStorage.clear());

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(CartProvider, null, children);

  it("keeps the total equal to the sum of the items and persists no totalPrice key", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const a = { id: "a", name: "A", price: 25.5 };
    const b = { id: "b", name: "B", price: 10 };

    act(() => {
      result.current.addToCart(a);
      result.current.addToCart(b);
    });

    expect(result.current.totalPrice).toBe(35.5);
    expect(localStorage.getItem("totalPrice")).toBeNull();
    expect(localStorage.getItem("cartItems")).not.toBeNull();

    act(() => {
      result.current.removeFromCart(a);
    });

    expect(result.current.totalPrice).toBe(10);
    expect(localStorage.getItem("totalPrice")).toBeNull();
  });

  it("ignores a stale persisted totalPrice and derives the total from the stored items", async () => {
    localStorage.setItem("cartItems", JSON.stringify([{ id: "a", name: "A", price: 30 }]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "9999"); // drifted from the real cart

    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current.totalPrice).toBe(30);
    await waitFor(() => expect(localStorage.getItem("totalPrice")).toBeNull());
  });

  it("clears the legacy totalPrice key along with the cart", () => {
    localStorage.setItem("totalPrice", "42");

    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ id: "a", name: "A", price: 5 });
      result.current.clearCart();
    });

    expect(result.current.totalPrice).toBe(0);
    expect(localStorage.getItem("totalPrice")).toBeNull();
    expect(localStorage.getItem("cartItems")).toBeNull();
  });
});
