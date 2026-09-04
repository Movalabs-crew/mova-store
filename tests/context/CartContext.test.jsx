import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act, renderHook } from "@testing-library/react";
import { CartProvider, useCart } from "../../context/CartContext";

function TestConsumer() {
  const { cartItems, itemCount, totalPrice } = useCart();
  return (
    <div>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="total">{totalPrice}</span>
      <span data-testid="items-length">{cartItems.length}</span>
    </div>
  );
}

describe("CartProvider hydration error handling", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mounts without throwing and falls back to empty cart when cartItems is corrupt JSON", async () => {
    localStorage.setItem("cartItems", "{broken");
    localStorage.setItem("itemCount", "invalid");
    localStorage.setItem("totalPrice", "NaN");

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
      expect(screen.getByTestId("total").textContent).toBe("0");
      expect(screen.getByTestId("items-length").textContent).toBe("0");
    });
  });

  it("safely ignores non-array JSON stored in cartItems", async () => {
    localStorage.setItem("cartItems", JSON.stringify({ not: "an array" }));

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("items-length").textContent).toBe("0");
    });
  });

  it("hydrates valid cart items and totals cleanly", async () => {
    const sampleItems = [{ id: "prod_1", name: "Shirt", price: 25.5 }];
    localStorage.setItem("cartItems", JSON.stringify(sampleItems));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "25.5");

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
      expect(screen.getByTestId("total").textContent).toBe("25.5");
      expect(screen.getByTestId("items-length").textContent).toBe("1");
    });
  });
});

const product = { id: "p1", name: "Sneaker", price: 10 };
const other = { id: "p2", name: "Boot", price: 25 };

function wrapper({ children }) {
  return <CartProvider>{children}</CartProvider>;
}

function renderCart() {
  return renderHook(() => useCart(), { wrapper });
}

beforeEach(() => {
  localStorage.clear();
});

describe("CartProvider", () => {
  it("addToCart adds the product and writes localStorage", () => {
    const { result } = renderCart();
    act(() => {
      result.current.addToCart(product);
    });

    expect(result.current.cartItems).toEqual([product]);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(10);

    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([product]);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("10");
  });

  it("addToCart called twice adds the same product twice", () => {
    const { result } = renderCart();
    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(product);
    });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBe(20);
    expect(localStorage.getItem("itemCount")).toBe("2");
    expect(localStorage.getItem("totalPrice")).toBe("20");
  });

  it("removeFromCart removes an existing item and updates localStorage", () => {
    const { result } = renderCart();
    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(other);
    });
    act(() => {
      result.current.removeFromCart(product);
    });

    expect(result.current.cartItems).toEqual([other]);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(25);
    expect(JSON.parse(localStorage.getItem("cartItems"))).toEqual([other]);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("25");
  });

  it("removeFromCart for a missing item does not change count or total", () => {
    const { result } = renderCart();
    act(() => {
      result.current.addToCart(product);
    });

    act(() => {
      result.current.removeFromCart({ id: "ghost", price: 5 });
    });

    // the negative-itemCount regression: count must NOT drop to 0 here
    expect(result.current.cartItems).toEqual([product]);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(10);
    expect(localStorage.getItem("itemCount")).toBe("1");
    expect(localStorage.getItem("totalPrice")).toBe("10");
  });

  it("removing the same item twice keeps the count at zero (never negative)", () => {
    const { result } = renderCart();
    act(() => {
      result.current.addToCart(product);
    });
    act(() => {
      result.current.removeFromCart(product);
    });
    act(() => {
      result.current.removeFromCart(product);
    });

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
    expect(Number(localStorage.getItem("itemCount"))).toBe(0);
  });

  it("clearCart empties the cart and removes the localStorage keys", () => {
    const { result } = renderCart();
    act(() => {
      result.current.addToCart(product);
      result.current.addToCart(other);
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

  it("hydrates safely when the stored cart is corrupt", () => {
    localStorage.setItem("cartItems", "{not-valid-json");
    localStorage.setItem("itemCount", "3");
    localStorage.setItem("totalPrice", "12.5");

    const { result } = renderCart();

    // corrupt cartItems falls back to an empty cart instead of throwing;
    // the numeric keys still hydrate
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(3);
    expect(result.current.totalPrice).toBe(12.5);
  });

  it("persists the cart across unmount and remount", () => {
    const first = renderCart();
    act(() => {
      first.result.current.addToCart(product);
    });
    first.unmount();

    const second = renderCart();
    expect(second.result.current.cartItems).toEqual([product]);
    expect(second.result.current.itemCount).toBe(1);
    expect(second.result.current.totalPrice).toBe(10);
    second.unmount();
  });
});
