import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
