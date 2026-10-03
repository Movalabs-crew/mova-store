import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockDeleteProduct, mockListProducts } = vi.hoisted(() => ({
  mockDeleteProduct: vi.fn(),
  mockListProducts: vi.fn(),
}));

vi.mock("../../../lib/products", async () => {
  const { invalidateProductCache } = await import("../../../lib/productCache");
  return {
    listProducts: (...args) => mockListProducts(...args),
    deleteProduct: (...args) => mockDeleteProduct(...args),
    invalidateProductCache,
  };
});

vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../../../app/admin/AddProductForm", () => ({ default: () => null }));
vi.mock("../../../app/admin/EditProductForm", () => ({ default: () => null }));

import ProductsAdmin from "../../../app/admin/page";
import { resetProductCache } from "../../../lib/productCache";

const shoes = [
  { id: "p1", name: "Mova Runner", price: 75, img: "/runner.png" },
  { id: "p2", name: "Mova Sprint", price: 90, img: "/sprint.png" },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("Products admin delete is race-safe (#563)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProductCache();
  });

  it("keeps a deleted row hidden even when a concurrent refetch returns it again", async () => {
    const pending = deferred<void>();
    // The real deleteProduct invalidates the cache on success; simulate that
    // invalidation immediately so a refetch runs while the delete is in flight.
    mockDeleteProduct.mockImplementation(async (id) => {
      const { invalidateProductCache } = await import("../../../lib/productCache");
      invalidateProductCache();
      return pending.promise;
    });
    // Every read (including the racing one) still returns both rows.
    mockListProducts.mockResolvedValue(shoes);

    render(<ProductsAdmin />);
    await screen.findByText("Mova Runner");

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));

    await waitFor(() => {
      expect(screen.queryByText("Mova Runner")).not.toBeInTheDocument();
    });
    // The refetch that raced the delete resolved with the stale row in it; the
    // row must not come back.
    await waitFor(() => {
      expect(mockListProducts).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText("Mova Runner")).not.toBeInTheDocument();
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();

    pending.resolve();
  });

  it("de-duplicates a double-click so deleteProduct is called once", async () => {
    const pending = deferred<void>();
    mockDeleteProduct.mockReturnValue(pending.promise);
    mockListProducts.mockResolvedValue(shoes);

    render(<ProductsAdmin />);
    await screen.findByText("Mova Runner");

    const button = screen.getByRole("button", { name: "Delete Mova Runner" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledTimes(1);
    });

    pending.resolve();
  });
});
