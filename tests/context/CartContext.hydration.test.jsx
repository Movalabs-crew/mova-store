import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useEffect } from "react";

import { CartProvider, useCart } from "../../context/CartContext";

const A = { id: "a", name: "Item A", price: 10 };
const B = { id: "b", name: "Item B", price: 5 };

describe("CartProvider hydration race (#71)", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
  });

  it("keeps stored items when an add lands before the hydration effect", () => {
    localStorage.setItem("cartItems", JSON.stringify([A]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "10");

    let cart = null;
    function Child() {
      const c = useCart();
      cart = c;
      // Child passive effects flush before the provider's hydration effect,
      // so this add lands while the provider still holds the empty initial
      // state -- exactly the race from the issue.
      useEffect(() => {
        c.addToCart(B);
      }, []);
      return null;
    }

    render(
      <CartProvider>
        <Child />
      </CartProvider>
    );

    expect(cart.cartItems).toEqual([A, B]);
    expect(cart.itemCount).toBe(2);
    expect(cart.totalPrice).toBe(15);
    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([A, B]);
    expect(localStorage.getItem("itemCount")).toBe("2");
    expect(localStorage.getItem("totalPrice")).toBe("15");
  });

  it("queues multiple pre-hydration adds and merges them all", () => {
    localStorage.setItem("cartItems", JSON.stringify([A]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "10");

    const C = { id: "c", name: "Item C", price: 1 };
    let cart = null;
    function Child() {
      const c = useCart();
      cart = c;
      useEffect(() => {
        c.addToCart(B);
        c.addToCart(C);
      }, []);
      return null;
    }

    render(
      <CartProvider>
        <Child />
      </CartProvider>
    );

    expect(cart.cartItems).toEqual([A, B, C]);
    expect(cart.itemCount).toBe(3);
    expect(cart.totalPrice).toBe(16);
  });

  it("leaves post-hydration behaviour unchanged", () => {
    localStorage.setItem("cartItems", JSON.stringify([A]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "10");

    let cart = null;
    function Child() {
      const c = useCart();
      cart = c;
      return null;
    }

    render(
      <CartProvider>
        <Child />
      </CartProvider>
    );

    expect(cart.hydrated).toBe(true);
    act(() => {
      cart.addToCart(B);
    });
    expect(cart.cartItems).toEqual([A, B]);
    expect(cart.itemCount).toBe(2);
    expect(cart.totalPrice).toBe(15);
    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([A, B]);
  });
});
