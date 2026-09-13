import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Products from "../../app/shop/page";
import { CartProvider } from "../../context/CartContext";
import { listProducts } from "../../lib/products";

vi.mock("../../lib/products", () => ({ listProducts: vi.fn() }));

// Toast rendering and timers have their own component tests.
vi.mock("../../components/Toast", () => ({
  default: ({ message, show }: { message: string; show: boolean }) =>
    show ? <p role="status">{message}</p> : null,
}));

const product = {
  id: "runner-42",
  name: "Mova Runner",
  price: 75,
  img: "/images/shoe1.png",
};

function pendingProducts() {
  let resolve!: (products: (typeof product)[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<(typeof product)[]>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  vi.mocked(listProducts).mockReturnValueOnce(promise);
  return { resolve, reject };
}

function renderShop() {
  return render(
    <CartProvider>
      <Products />
    </CartProvider>
  );
}

function skeletons() {
  return screen.queryAllByRole("presentation", { hidden: true });
}

describe("Shop product loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows skeletons while the request is pending, then shows an empty catalogue", async () => {
    const request = pendingProducts();
    renderShop();

    expect(listProducts).toHaveBeenCalledTimes(1);
    expect(skeletons().length).toBeGreaterThan(0);
    expect(screen.queryByText("No products yet.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await act(async () => request.resolve([]));

    expect(screen.getByText("No products yet.")).toBeInTheDocument();
    expect(skeletons()).toHaveLength(0);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("replaces skeletons with product cards that still add products to the cart", async () => {
    const request = pendingProducts();
    renderShop();

    expect(skeletons().length).toBeGreaterThan(0);
    expect(screen.queryByText(product.name)).not.toBeInTheDocument();

    await act(async () => request.resolve([product]));

    const productLink = screen.getByRole("link", { name: /Mova Runner/ });
    expect(productLink).toHaveAttribute("href", `/shop/${product.id}`);
    expect(within(productLink).getByRole("img", { name: product.name })).toHaveAttribute(
      "src",
      product.img
    );
    expect(within(productLink).getByText("$75")).toBeInTheDocument();
    expect(skeletons()).toHaveLength(0);
    expect(screen.queryByText("No products yet.")).not.toBeInTheDocument();

    fireEvent.click(within(productLink.parentElement!).getByRole("button"));

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Item added to cart");
    expect(JSON.parse(localStorage.getItem("cartItems")!)).toEqual([product]);
  });

  it("replaces skeletons with the request error without claiming the catalogue is empty", async () => {
    const request = pendingProducts();
    renderShop();

    expect(skeletons().length).toBeGreaterThan(0);
    expect(screen.queryByText("Catalogue unavailable")).not.toBeInTheDocument();

    await act(async () => request.reject(new Error("Catalogue unavailable")));

    expect(screen.getByText("Catalogue unavailable")).toBeInTheDocument();
    expect(skeletons()).toHaveLength(0);
    expect(screen.queryByText("No products yet.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
