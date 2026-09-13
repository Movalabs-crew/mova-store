import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "../../context/CartContext";

const shirt = { id: "prod_1", name: "Shirt", price: 25.5 };
const hat = { id: "prod_2", name: "Hat", price: 10 };
const ghost = { id: "prod_999", name: "Ghost", price: 999 };

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

function wrapper({ children }) {
  return <CartProvider>{children}</CartProvider>;
}

function expectCartState(result, { items, count, total }) {
  expect(result.current.cartItems).toEqual(items);
  expect(result.current.itemCount).toBe(count);
  expect(result.current.totalPrice).toBe(total);
  expect(result.current.itemCount).toBeGreaterThanOrEqual(0);
  expect(result.current.totalPrice).toBeGreaterThanOrEqual(0);
}

function expectStored({ items, count, total, cleared = false }) {
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

  it("adds an item and persists cartItems, itemCount, and totalPrice", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
    });

    expectCartState(result, { items: [shirt], count: 1, total: 25.5 });
    expectStored({ items: [shirt], count: 1, total: 25.5 });
  });

  it("duplicate add of the same id appends another line and increases count and total", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
    });
    expectCartState(result, { items: [shirt], count: 1, total: 25.5 });
    expectStored({ items: [shirt], count: 1, total: 25.5 });

    act(() => {
      result.current.addToCart(shirt);
    });
    expectCartState(result, { items: [shirt, shirt], count: 2, total: 51 });
    expectStored({ items: [shirt, shirt], count: 2, total: 51 });
  });

  it("removes an existing item and updates count, total, and localStorage", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
      result.current.addToCart(hat);
    });
    expectCartState(result, { items: [shirt, hat], count: 2, total: 35.5 });
    expectStored({ items: [shirt, hat], count: 2, total: 35.5 });

    act(() => {
      result.current.removeFromCart(shirt);
    });
    expectCartState(result, { items: [hat], count: 1, total: 10 });
    expectStored({ items: [hat], count: 1, total: 10 });
  });

  it("leaves count and total unchanged when removing an item that is not in the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
    });
    expectCartState(result, { items: [shirt], count: 1, total: 25.5 });
    expectStored({ items: [shirt], count: 1, total: 25.5 });

    act(() => {
      result.current.removeFromCart(ghost);
    });
    expectCartState(result, { items: [shirt], count: 1, total: 25.5 });
    expectStored({ items: [shirt], count: 1, total: 25.5 });
  });

  it("repeat-remove after the item is gone never produces a negative itemCount or totalPrice", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
    });
    expectStored({ items: [shirt], count: 1, total: 25.5 });

    act(() => {
      result.current.removeFromCart(shirt);
    });
    expectCartState(result, { items: [], count: 0, total: 0 });
    expectStored({ items: [], count: 0, total: 0 });

    act(() => {
      result.current.removeFromCart(shirt);
    });
    expectCartState(result, { items: [], count: 0, total: 0 });
    expectStored({ items: [], count: 0, total: 0 });
  });

  it("double remove on an empty cart never writes a negative count or total", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.removeFromCart(shirt);
      result.current.removeFromCart(shirt);
    });

    expectCartState(result, { items: [], count: 0, total: 0 });
    const storedCount = localStorage.getItem("itemCount");
    const storedTotal = localStorage.getItem("totalPrice");
    if (storedCount !== null) {
      expect(Number(storedCount)).toBeGreaterThanOrEqual(0);
    }
    if (storedTotal !== null) {
      expect(Number(storedTotal)).toBeGreaterThanOrEqual(0);
    }
  });

  it("clearCart empties state and removes persisted cart keys", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
      result.current.addToCart(hat);
    });
    expectStored({ items: [shirt, hat], count: 2, total: 35.5 });

    act(() => {
      result.current.clearCart();
    });
    expectCartState(result, { items: [], count: 0, total: 0 });
    expectStored({ items: [], count: 0, total: 0, cleared: true });
  });

  it("hydrates an empty cart from corrupt localStorage without throwing", async () => {
    localStorage.setItem("cartItems", "{broken");
    localStorage.setItem("itemCount", "invalid");
    localStorage.setItem("totalPrice", "NaN");

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expectCartState(result, { items: [], count: 0, total: 0 });
    });
  });

  it("persists cartItems, itemCount, and totalPrice across unmount and remount", async () => {
    const { result, unmount } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart(shirt);
      result.current.addToCart(hat);
    });
    expectStored({ items: [shirt, hat], count: 2, total: 35.5 });

    unmount();

    const { result: remounted } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expectCartState(remounted, { items: [shirt, hat], count: 2, total: 35.5 });
    });
    expectStored({ items: [shirt, hat], count: 2, total: 35.5 });
  });
});
