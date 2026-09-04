import { describe, it, expect, beforeEach } from "vitest";
import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { CartProvider, useCart } from "../../context/CartContext";

const PRODUCT = {
  id: 42,
  name: "Test Product",
  price: 10,
  img: "/test.png",
};

function TestConsumer() {
  const { cartItems, itemCount, totalPrice, addToCart, removeFromCart } =
    useCart();
  return (
    <div>
      <div data-testid="count">{itemCount}</div>
      <div data-testid="total">{totalPrice}</div>
      <ul data-testid="rows">
        {cartItems.map((item) => (
          <li key={item.lineId ?? item.id} data-lineid={item.lineId}>
            {item.name}
            <button onClick={() => removeFromCart(item)}>remove</button>
          </li>
        ))}
      </ul>
      <button onClick={() => addToCart(PRODUCT)}>add</button>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <TestConsumer />
    </CartProvider>
  );
}

describe("CartContext duplicate line items", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds the same product twice as two rows with unique lineIds and no duplicate keys", () => {
    const { container } = renderCart();
    const add = screen.getByText("add");
    act(() => {
      fireEvent.click(add);
      fireEvent.click(add);
    });

    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("total").textContent).toBe("20");

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const lineIds = rows.map((r) => r.getAttribute("data-lineid"));
    expect(new Set(lineIds).size).toBe(2);
    // Every line id is unique in the DOM (no React duplicate-key warnings)
    expect(container.querySelectorAll("[data-lineid]").length).toBe(2);
  });

  it("removes only the clicked duplicate row (lower one leaves the upper intact)", () => {
    renderCart();
    const add = screen.getByText("add");
    act(() => {
      fireEvent.click(add);
      fireEvent.click(add);
    });
    const [firstRow, secondRow] = screen.getAllByRole("listitem");

    act(() => {
      fireEvent.click(firstRow.querySelector("button"));
    });

    const remaining = screen.getAllByRole("listitem");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].getAttribute("data-lineid")).toBe(
      secondRow.getAttribute("data-lineid")
    );
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("10");
  });

  it("removing the upper duplicate row leaves the lower one intact", () => {
    renderCart();
    const add = screen.getByText("add");
    act(() => {
      fireEvent.click(add);
      fireEvent.click(add);
    });
    const [firstRow] = screen.getAllByRole("listitem");

    act(() => {
      fireEvent.click(screen.getAllByRole("listitem")[1].querySelector("button"));
    });

    const remaining = screen.getAllByRole("listitem");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].getAttribute("data-lineid")).toBe(
      firstRow.getAttribute("data-lineid")
    );
  });

  it("keeps itemCount and totalPrice correct across duplicate add/remove cycles", () => {
    renderCart();
    const add = screen.getByText("add");
    act(() => {
      fireEvent.click(add);
      fireEvent.click(add);
      fireEvent.click(add);
    });
    expect(screen.getByTestId("count").textContent).toBe("3");
    expect(screen.getByTestId("total").textContent).toBe("30");

    act(() => {
      fireEvent.click(screen.getAllByRole("listitem")[1].querySelector("button"));
    });
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("total").textContent).toBe("20");
  });

  it("assigns lineIds to legacy persisted carts that have none", () => {
    localStorage.setItem(
      "cartItems",
      JSON.stringify([{ ...PRODUCT }, { ...PRODUCT }])
    );
    localStorage.setItem("itemCount", "2");
    localStorage.setItem("totalPrice", "20");

    renderCart();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const lineIds = rows.map((r) => r.getAttribute("data-lineid"));
    expect(lineIds.every(Boolean)).toBe(true);
    expect(new Set(lineIds).size).toBe(2);
  });
});
