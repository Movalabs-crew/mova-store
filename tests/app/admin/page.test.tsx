import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/products", async () => {
  const { invalidateProductCache } = await import("../../../lib/productCache");
  return {
    listProducts: vi.fn(),
    deleteProduct: vi.fn(async () => {
      invalidateProductCache();
    }),
  };
});

vi.mock("../../../components/AdminGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../../../app/admin/AddProductForm", () => ({ default: () => null }));
vi.mock("../../../app/admin/EditProductForm", () => ({ default: () => null }));

import ProductsAdmin from "../../../app/admin/page";
import { deleteProduct, listProducts } from "../../../lib/products";

const shoes = [
  { id: "p1", name: "Mova Runner", price: 75, img: "/runner.png" },
  { id: "p2", name: "Mova Sprint", price: 90, img: "/sprint.png" },
];

describe("Products admin reads through the shared product cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the product list once on mount", async () => {
    vi.mocked(listProducts).mockResolvedValue(shoes);

    render(<ProductsAdmin />);

    expect(await screen.findByText("Mova Runner")).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledTimes(1);
  });

  it("refreshes the list after a delete invalidates the cache", async () => {
    vi.mocked(listProducts).mockResolvedValueOnce(shoes).mockResolvedValueOnce([shoes[1]]);

    render(<ProductsAdmin />);
    await screen.findByText("Mova Runner");

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));

    await waitFor(() => expect(screen.queryByText("Mova Runner")).not.toBeInTheDocument());
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledTimes(2);
    expect(deleteProduct).toHaveBeenCalledWith("p1");
  });
});
