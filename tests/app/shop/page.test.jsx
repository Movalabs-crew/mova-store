import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let listProductsImpl;

vi.mock("../../../lib/products", () => ({
  listProducts: (...args) => listProductsImpl(...args),
}));

vi.mock("../../../context/CartContext", () => ({
  useCart: () => ({
    itemCount: 0,
    cartItems: [],
    addToCart: () => {},
    removeFromCart: () => {},
    totalPrice: 0,
  }),
}));

import Products from "../../../app/shop/page";

function pendingProducts() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  listProductsImpl = () => promise;
  return resolve;
}

describe("shop products grid states", () => {
  beforeEach(() => {
    listProductsImpl = () => new Promise(() => {}); // stays pending
  });

  it("shows the loading skeleton while listProducts is pending", async () => {
    const { container } = render(<Products />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByText(/no products yet/i)).toBeNull();
  });

  it("shows an explicit empty state when the list resolves empty", async () => {
    const resolve = pendingProducts();
    render(<Products />);
    expect(screen.queryByText(/no products yet/i)).toBeNull();
    resolve([]);
    await screen.findByText(/no products yet/i);
  });

  it("renders products once the list resolves with items", async () => {
    const resolve = pendingProducts();
    render(<Products />);
    resolve([
      { id: "p1", name: "Test Shoes", price: 99.99, img: "http://x/y.png" },
    ]);
    await screen.findByText("Test Shoes");
  });

  it("keeps the error state on rejection", async () => {
    listProductsImpl = async () => {
      throw new Error("products failed");
    };
    render(<Products />);
    await screen.findByText("products failed");
  });
});
