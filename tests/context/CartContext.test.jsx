import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook, act } from "@testing-library/react";
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

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const prod1 = { id: "prod_1", name: "Classic Runner", price: 25.5 };
const prod2 = { id: "prod_2", name: "Trail Trekker", price: 10 };
const missingProd = { id: "prod_missing", name: "Ghost Item", price: 99 };

function assertCartState(result, { items, count, total }) {
  expect(result.current.cartItems).toEqual(items);
  expect(result.current.itemCount).toBe(count);
  expect(result.current.totalPrice).toBe(total);
  expect(result.current.itemCount).toBeGreaterThanOrEqual(0);
  expect(result.current.totalPrice).toBeGreaterThanOrEqual(0);
}

function assertLocalStorage({ items, count, total, cleared = false }) {
  if (cleared) {
    expect(localStorage.getItem("cartItems")).toBeNull();
    expect(localStorage.getItem("itemCount")).toBeNull();
    expect(localStorage.getItem("totalPrice")).toBeNull();
    return;
  }
  expect(JSON.parse(localStorage.getItem("cartItems") || "[]")).toEqual(items);
  expect(localStorage.getItem("itemCount")).toBe(String(count));
  expect(localStorage.getItem("totalPrice")).toBe(String(total));
  expect(Number(localStorage.getItem("itemCount"))).toBeGreaterThanOrEqual(0);
  expect(Number(localStorage.getItem("totalPrice"))).toBeGreaterThanOrEqual(0);
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

describe("CartProvider count and total transitions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds an item and asserts React state and localStorage writes", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });

    assertCartState(result, { items: [prod1], count: 1, total: 25.5 });
    assertLocalStorage({ items: [prod1], count: 1, total: 25.5 });
  });

  it("handles duplicate add of the same item and increments count and total", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });
    assertCartState(result, { items: [prod1], count: 1, total: 25.5 });
    assertLocalStorage({ items: [prod1], count: 1, total: 25.5 });

    act(() => {
      result.current.addToCart(prod1);
    });
    assertCartState(result, { items: [prod1, prod1], count: 2, total: 51 });
    assertLocalStorage({ items: [prod1, prod1], count: 2, total: 51 });
  });

  it("removes an existing item and updates count, total, and localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
      result.current.addToCart(prod2);
    });
    assertCartState(result, { items: [prod1, prod2], count: 2, total: 35.5 });
    assertLocalStorage({ items: [prod1, prod2], count: 2, total: 35.5 });

    act(() => {
      result.current.removeFromCart(prod1);
    });
    assertCartState(result, { items: [prod2], count: 1, total: 10 });
    assertLocalStorage({ items: [prod2], count: 1, total: 10 });
  });

  it("locks negative-itemCount bug: removing a missing item leaves count and total unchanged", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });
    assertCartState(result, { items: [prod1], count: 1, total: 25.5 });
    assertLocalStorage({ items: [prod1], count: 1, total: 25.5 });

    act(() => {
      result.current.removeFromCart(missingProd);
    });
    assertCartState(result, { items: [prod1], count: 1, total: 25.5 });
    assertLocalStorage({ items: [prod1], count: 1, total: 25.5 });
  });

  it("locks negative-itemCount bug: repeat remove on empty cart never produces negative count or total", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
    });
    assertLocalStorage({ items: [prod1], count: 1, total: 25.5 });

    act(() => {
      result.current.removeFromCart(prod1);
    });
    assertCartState(result, { items: [], count: 0, total: 0 });
    assertLocalStorage({ items: [], count: 0, total: 0 });

    act(() => {
      result.current.removeFromCart(prod1);
    });
    assertCartState(result, { items: [], count: 0, total: 0 });
    assertLocalStorage({ items: [], count: 0, total: 0 });
  });

  it("double remove on an empty cart never writes negative count or total to localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.removeFromCart(prod1);
      result.current.removeFromCart(prod1);
    });

    assertCartState(result, { items: [], count: 0, total: 0 });
    const storedCount = localStorage.getItem("itemCount");
    const storedTotal = localStorage.getItem("totalPrice");
    if (storedCount !== null) {
      expect(Number(storedCount)).toBeGreaterThanOrEqual(0);
    }
    if (storedTotal !== null) {
      expect(Number(storedTotal)).toBeGreaterThanOrEqual(0);
    }
  });

  it("clearCart empties state and removes persisted cart keys from localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
      result.current.addToCart(prod2);
    });
    assertLocalStorage({ items: [prod1, prod2], count: 2, total: 35.5 });

    act(() => {
      result.current.clearCart();
    });
    assertCartState(result, { items: [], count: 0, total: 0 });
    assertLocalStorage({ items: [], count: 0, total: 0, cleared: true });
  });

  it("hydrates an empty cart from corrupt localStorage payloads without throwing", async () => {
    localStorage.setItem("cartItems", "{broken");
    localStorage.setItem("itemCount", "-99");
    localStorage.setItem("totalPrice", "invalid_number");

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      assertCartState(result, { items: [], count: 0, total: 0 });
    });
  });

  it("persists cartItems, itemCount, and totalPrice across unmount and remount", async () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(prod1);
      result.current.addToCart(prod2);
    });
    assertLocalStorage({ items: [prod1, prod2], count: 2, total: 35.5 });

    unmount();

    const { result: remounted } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      assertCartState(remounted, { items: [prod1, prod2], count: 2, total: 35.5 });
    });
    assertLocalStorage({ items: [prod1, prod2], count: 2, total: 35.5 });
  });
});
