import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/products", async () => {
  const { invalidateProductCache } = await import("../../../lib/productCache");
  return {
    listProducts: vi.fn(),
    // The production delete invalidates the shared cache once the row is gone,
    // which is what makes the mounted list drop it.
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
import { invalidateProductCache, resetProductCache } from "../../../lib/productCache";
import { deleteProduct, listProducts } from "../../../lib/products";

const shoes = [
  { id: "p1", name: "Mova Runner", price: 75, img: "/runner.png" },
  { id: "p2", name: "Mova Sprint", price: 90, img: "/sprint.png" },
];

describe("Products admin delete failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProductCache();
    // Re-establish the successful-delete behaviour for every case; the failing
    // cases override it with `mockRejectedValueOnce`.
    vi.mocked(deleteProduct).mockImplementation(async () => {
      invalidateProductCache();
    });
    vi.mocked(listProducts).mockResolvedValue(shoes);
  });

  it("keeps the row and tells the operator when the delete is rejected", async () => {
    // A rejected delete leaves the shared cache untouched, so the row the
    // operator clicked is still on screen.
    vi.mocked(deleteProduct).mockRejectedValueOnce(new Error("row level security"));

    render(<ProductsAdmin />);
    await screen.findByText("Mova Runner");

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));

    expect(
      await screen.findByText('Could not delete "Mova Runner": row level security')
    ).toBeInTheDocument();
    expect(screen.getByText("Mova Runner")).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledTimes(1);
  });

  it("reports the failure for the row that was clicked, not another row", async () => {
    vi.mocked(deleteProduct).mockRejectedValueOnce(new Error("permission denied"));

    render(<ProductsAdmin />);
    await screen.findByText("Mova Sprint");

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Sprint" }));

    expect(
      await screen.findByText('Could not delete "Mova Sprint": permission denied')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Could not delete "Mova Runner"/)).not.toBeInTheDocument();
    expect(screen.getByText("Mova Runner")).toBeInTheDocument();
  });

  it("removes the row without a message when the delete succeeds", async () => {
    vi.mocked(listProducts).mockResolvedValueOnce(shoes).mockResolvedValueOnce([shoes[1]]);

    render(<ProductsAdmin />);
    await screen.findByText("Mova Runner");

    fireEvent.click(screen.getByRole("button", { name: "Delete Mova Runner" }));

    await waitFor(() => expect(screen.queryByText("Mova Runner")).not.toBeInTheDocument());
    expect(screen.getByText("Mova Sprint")).toBeInTheDocument();
    expect(deleteProduct).toHaveBeenCalledWith("p1");
    expect(screen.queryByText(/Could not delete/)).not.toBeInTheDocument();
  });
});
