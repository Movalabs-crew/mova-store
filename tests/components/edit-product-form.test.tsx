import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockGetProductById, mockUpdateProduct, mockUploadProductImage } = vi.hoisted(() => ({
  mockGetProductById: vi.fn(),
  mockUpdateProduct: vi.fn(),
  mockUploadProductImage: vi.fn(),
}));

vi.mock("../../lib/products", () => ({
  getProductById: (...args: any[]) => mockGetProductById(...args),
  updateProduct: (...args: any[]) => mockUpdateProduct(...args),
  uploadProductImage: (...args: any[]) => mockUploadProductImage(...args),
}));

import EditProductForm from "../../app/admin/EditProductForm";

describe("EditProductForm status banners reset and error styling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears stale success banner when switching to a different productId", async () => {
    const productA = { id: "prod-1", name: "Shoe A", price: 100, img: "/shoe-a.jpg" };
    const productB = { id: "prod-2", name: "Shoe B", price: 150, img: "/shoe-b.jpg" };

    mockGetProductById.mockImplementation(async (id: string) => {
      if (id === "prod-1") return productA;
      if (id === "prod-2") return productB;
      return null;
    });
    mockUpdateProduct.mockResolvedValue({});

    const { rerender } = render(<EditProductForm productId="prod-1" onProductUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Shoe A")).toBeInTheDocument();
    });

    // Submit form for Product A
    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      expect(screen.getByText("Product updated successfully!")).toBeInTheDocument();
    });

    // Now switch to Product B
    rerender(<EditProductForm productId="prod-2" onProductUpdated={vi.fn()} />);

    // Stale success banner from Product A MUST be cleared immediately
    expect(screen.queryByText("Product updated successfully!")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Shoe B")).toBeInTheDocument();
    });
    expect(screen.queryByText("Product updated successfully!")).not.toBeInTheDocument();
  });

  it("renders fetch error message in a red error box", async () => {
    mockGetProductById.mockRejectedValue(new Error("Database connection timed out"));

    render(<EditProductForm productId="prod-fail" onProductUpdated={vi.fn()} />);

    await waitFor(() => {
      const errorBox = screen.getByRole("alert");
      expect(errorBox).toBeInTheDocument();
      expect(errorBox).toHaveClass("bg-red-500");
      expect(errorBox).toHaveTextContent("Error fetching product: Database connection timed out");
    });
  });

  it("renders update failure in a red error box and clears before next submit", async () => {
    const product = { id: "prod-1", name: "Shoe 1", price: 90, img: "/shoe.jpg" };
    mockGetProductById.mockResolvedValue(product);
    mockUpdateProduct.mockRejectedValue(new Error("Unauthorized write"));

    render(<EditProductForm productId="prod-1" onProductUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Shoe 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      const errorBox = screen.getByRole("alert");
      expect(errorBox).toBeInTheDocument();
      expect(errorBox).toHaveClass("bg-red-500");
      expect(errorBox).toHaveTextContent("Error updating product: Unauthorized write");
    });
  });
});
