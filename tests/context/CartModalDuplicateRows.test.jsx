import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CartProvider, useCart } from "../../context/CartContext";

const SAMPLE_PRODUCT = {
  id: "prod-42",
  name: "Soroban Runner Sneaker",
  price: 75,
  img: "/shoes/shoe1.png",
};

function CartModalConsumer() {
  const { cartItems, itemCount, totalPrice, addToCart, removeFromCart } = useCart();

  return (
    <div>
      <button onClick={() => addToCart(SAMPLE_PRODUCT)}>Add Product</button>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="total">{totalPrice}</span>
      <div data-testid="cart-modal">
        {cartItems.map((item, idx) => (
          <div
            key={item.cartItemId || item.lineId || item.id}
            data-testid={`cart-row-${idx}`}
            data-cart-item-id={item.cartItemId}
          >
            <span>{item.name}</span>
            <span>${item.price}</span>
            <button data-testid={`remove-btn-${idx}`} onClick={() => removeFromCart(item)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

describe("Cart duplicate rows UI & keys", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders duplicate line items with unique keys without console duplicate-key warnings", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <CartProvider>
        <CartModalConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByRole("button", { name: "Add Product" });
    act(() => {
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
    });

    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("total").textContent).toBe("150");

    const row0 = screen.getByTestId("cart-row-0");
    const row1 = screen.getByTestId("cart-row-1");
    expect(row0).toBeInTheDocument();
    expect(row1).toBeInTheDocument();

    const id0 = row0.getAttribute("data-cart-item-id");
    const id1 = row1.getAttribute("data-cart-item-id");
    expect(id0).toBeTruthy();
    expect(id1).toBeTruthy();
    expect(id0).not.toBe(id1);

    // Verify no React duplicate key error was logged
    const duplicateKeyWarnings = errorSpy.mock.calls.filter((call) =>
      call.some(
        (arg) =>
          typeof arg === "string" && arg.includes("Encountered two children with the same key")
      )
    );
    expect(duplicateKeyWarnings).toHaveLength(0);

    errorSpy.mockRestore();
  });

  it("removes lower duplicate row leaving upper row intact", () => {
    render(
      <CartProvider>
        <CartModalConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByRole("button", { name: "Add Product" });
    act(() => {
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
    });

    const id0 = screen.getByTestId("cart-row-0").getAttribute("data-cart-item-id");
    const id1 = screen.getByTestId("cart-row-1").getAttribute("data-cart-item-id");

    // Click remove on lower/second row
    const removeBtn1 = screen.getByTestId("remove-btn-1");
    act(() => {
      fireEvent.click(removeBtn1);
    });

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("75");

    // Only 1 row remains and it corresponds to the first item (id0)
    const remainingRow = screen.getByTestId("cart-row-0");
    expect(remainingRow.getAttribute("data-cart-item-id")).toBe(id0);
    expect(screen.queryByTestId("cart-row-1")).not.toBeInTheDocument();
  });

  it("removes upper duplicate row leaving lower row intact", () => {
    render(
      <CartProvider>
        <CartModalConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByRole("button", { name: "Add Product" });
    act(() => {
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);
    });

    const id1 = screen.getByTestId("cart-row-1").getAttribute("data-cart-item-id");

    // Click remove on upper/first row
    const removeBtn0 = screen.getByTestId("remove-btn-0");
    act(() => {
      fireEvent.click(removeBtn0);
    });

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("75");

    // Only 1 row remains and its id corresponds to the second item (id1)
    const remainingRow = screen.getByTestId("cart-row-0");
    expect(remainingRow.getAttribute("data-cart-item-id")).toBe(id1);
    expect(screen.queryByTestId("cart-row-1")).not.toBeInTheDocument();
  });
});
