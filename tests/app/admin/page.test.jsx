import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockListProducts, mockDeleteProduct } = vi.hoisted(() => ({
  mockListProducts: vi.fn(),
  mockDeleteProduct: vi.fn(),
}));

vi.mock("../../../lib/products", () => ({
  listProducts: (...args) => mockListProducts(...args),
  deleteProduct: (...args) => mockDeleteProduct(...args),
}));

// AdminGuard would otherwise pull in Supabase auth; the guard itself is
// covered by its own tests. Pass children straight through.
vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }) => <>{children}</>,
}));

// The add/edit forms are separate components with their own test coverage.
vi.mock("../../../app/admin/AddProductForm", () => ({
  default: () => null,
}));
vi.mock("../../../app/admin/EditProductForm", () => ({
  default: () => null,
}));

import ProductsAdmin from "../../../app/admin/page";

const PRODUCTS = [
  {
    id: "prod-1",
    name: "Alpha Sneakers",
    price: 120,
    img: "https://example.com/alpha.jpg",
  },
  {
    id: "prod-2",
    name: "Beta Boots",
    price: 180,
    img: "https://example.com/beta.jpg",
  },
];

describe("ProductsAdmin delete confirmation (issue #564)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProducts.mockResolvedValue(PRODUCTS);
    mockDeleteProduct.mockResolvedValue(undefined);
  });

  it("asks for confirmation before deleting and does not delete on cancel", async () => {
    render(<ProductsAdmin />);

    expect(await screen.findByText("Alpha Sneakers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Alpha Sneakers" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => {
        return element?.tagName === "SPAN" && element.textContent === "Alpha Sneakers";
      })
    ).toBeInTheDocument();

    // Cancelling leaves the product intact.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockDeleteProduct).not.toHaveBeenCalled();
    expect(screen.getByText("Alpha Sneakers")).toBeInTheDocument();
    expect(screen.getByText("Beta Boots")).toBeInTheDocument();
  });

  it("deletes the product exactly once when the admin confirms", async () => {
    render(<ProductsAdmin />);

    expect(await screen.findByText("Alpha Sneakers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Alpha Sneakers" }));

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Confirm deleting Alpha Sneakers" }));

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteProduct).toHaveBeenCalledWith("prod-1");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Alpha Sneakers")).not.toBeInTheDocument();
    expect(screen.getByText("Beta Boots")).toBeInTheDocument();
  });

  it("closes the confirmation dialog on Escape without deleting", async () => {
    render(<ProductsAdmin />);

    expect(await screen.findByText("Alpha Sneakers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Beta Boots" }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockDeleteProduct).not.toHaveBeenCalled();
    expect(screen.getByText("Beta Boots")).toBeInTheDocument();
  });
});
