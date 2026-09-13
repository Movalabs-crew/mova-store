import React, { useLayoutEffect } from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CartProvider, useCart } from "../../context/CartContext";

const STORED_ITEM_1 = { id: "p1", name: "Alpha Sneaker", price: 100 };
const STORED_ITEM_2 = { id: "p2", name: "Beta Sneaker", price: 50 };
const NEW_ITEM = { id: "p3", name: "Gamma Sneaker", price: 30 };

function PreHydrationAdder({ itemsToAdd = [] }) {
  const { addToCart, cartItems, itemCount, totalPrice, hydrated, isHydrated } = useCart();

  // useLayoutEffect runs synchronously right after DOM mutation,
  // strictly BEFORE passive useEffect (hydration) runs.
  useLayoutEffect(() => {
    for (const item of itemsToAdd) {
      addToCart(item);
    }
  }, []);

  return (
    <div>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="total">{totalPrice}</span>
      <span data-testid="length">{cartItems.length}</span>
      <span data-testid="hydrated">{String(hydrated)}</span>
      <span data-testid="isHydrated">{String(isHydrated)}</span>
      <ul data-testid="items">
        {cartItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

describe("CartProvider hydration race (Issue #71)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps previously stored cart items plus the new item when added before hydration effect resolves", () => {
    // Seed initial stored cart in localStorage
    localStorage.setItem("cartItems", JSON.stringify([STORED_ITEM_1]));
    localStorage.setItem("itemCount", "1");
    localStorage.setItem("totalPrice", "100");

    render(
      <CartProvider>
        <PreHydrationAdder itemsToAdd={[NEW_ITEM]} />
      </CartProvider>
    );

    // State must contain BOTH stored item and newly added item
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("total").textContent).toBe("130");
    expect(screen.getByTestId("length").textContent).toBe("2");
    expect(screen.getByTestId("hydrated").textContent).toBe("true");

    // localStorage must also contain both items
    const rawItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
    expect(rawItems).toHaveLength(2);
    expect(rawItems.map((i) => i.id)).toEqual(["p1", "p3"]);
    expect(localStorage.getItem("itemCount")).toBe("2");
    expect(localStorage.getItem("totalPrice")).toBe("130");
  });

  it("preserves multiple stored items when multiple pre-hydration additions occur", () => {
    // Seed multiple stored items
    localStorage.setItem("cartItems", JSON.stringify([STORED_ITEM_1, STORED_ITEM_2]));
    localStorage.setItem("itemCount", "2");
    localStorage.setItem("totalPrice", "150");

    const ANOTHER_ITEM = { id: "p4", name: "Delta Runner", price: 40 };

    render(
      <CartProvider>
        <PreHydrationAdder itemsToAdd={[NEW_ITEM, ANOTHER_ITEM]} />
      </CartProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("4");
    expect(screen.getByTestId("total").textContent).toBe("220");
    expect(screen.getByTestId("length").textContent).toBe("4");

    const rawItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
    expect(rawItems).toHaveLength(4);
    expect(rawItems.map((i) => i.id)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(localStorage.getItem("itemCount")).toBe("4");
    expect(localStorage.getItem("totalPrice")).toBe("220");
  });

  it("handles pre-hydration adds when localStorage starts completely empty", () => {
    render(
      <CartProvider>
        <PreHydrationAdder itemsToAdd={[NEW_ITEM]} />
      </CartProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("30");
    expect(screen.getByTestId("length").textContent).toBe("1");

    const rawItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
    expect(rawItems).toHaveLength(1);
    expect(rawItems[0].id).toBe("p3");
  });

  it("handles pre-hydration removals correctly from stored items", () => {
    localStorage.setItem("cartItems", JSON.stringify([STORED_ITEM_1, STORED_ITEM_2]));
    localStorage.setItem("itemCount", "2");
    localStorage.setItem("totalPrice", "150");

    function PreHydrationRemover() {
      const { removeFromCart, cartItems, itemCount, totalPrice } = useCart();
      useLayoutEffect(() => {
        removeFromCart(STORED_ITEM_1);
      }, []);

      return (
        <div>
          <span data-testid="count">{itemCount}</span>
          <span data-testid="total">{totalPrice}</span>
          <span data-testid="length">{cartItems.length}</span>
        </div>
      );
    }

    render(
      <CartProvider>
        <PreHydrationRemover />
      </CartProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("50");
    expect(screen.getByTestId("length").textContent).toBe("1");

    const rawItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
    expect(rawItems).toHaveLength(1);
    expect(rawItems[0].id).toBe("p2");
  });
});
