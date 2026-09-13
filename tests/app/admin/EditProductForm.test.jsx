import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockGetProductById, mockUpdateProduct, mockUploadProductImage } = vi.hoisted(() => ({
  mockGetProductById: vi.fn(),
  mockUpdateProduct: vi.fn(),
  mockUploadProductImage: vi.fn(),
}));

vi.mock("../../../lib/products", () => ({
  getProductById: (...args) => mockGetProductById(...args),
  updateProduct: (...args) => mockUpdateProduct(...args),
  uploadProductImage: (...args) => mockUploadProductImage(...args),
}));

import EditProductForm from "../../../app/admin/EditProductForm";

describe("EditProductForm status banners reset and error styling (#27)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the selected product data into form fields", async () => {
    const product = {
      id: "prod-1",
      name: "Alpha Sneakers",
      price: 120,
      img: "https://example.com/alpha.jpg",
    };
    mockGetProductById.mockResolvedValue(product);

    render(<EditProductForm productId="prod-1" onProductUpdated={vi.fn()} />);

    expect(await screen.findByDisplayValue("Alpha Sneakers")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.getByAltText("Existing product")).toHaveAttribute(
      "src",
      "https://example.com/alpha.jpg"
    );
  });

  it("clears stale success banner immediately when switching products", async () => {
    const productA = {
      id: "prod-1",
      name: "Alpha Sneakers",
      price: 120,
      img: "https://example.com/alpha.jpg",
    };
    const productB = {
      id: "prod-2",
      name: "Beta Boots",
      price: 180,
      img: "https://example.com/beta.jpg",
    };

    mockGetProductById.mockImplementation(async (id) => {
      if (id === "prod-1") return productA;
      if (id === "prod-2") return productB;
      return null;
    });
    mockUpdateProduct.mockResolvedValue({});

    const { rerender } = render(
      <EditProductForm productId="prod-1" onProductUpdated={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Alpha Sneakers")).toBeInTheDocument();
    });

    // Update Product A
    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      expect(screen.getByText("Product updated successfully!")).toBeInTheDocument();
    });

    // Select Product B - stale success banner MUST clear immediately
    rerender(<EditProductForm productId="prod-2" onProductUpdated={vi.fn()} />);

    expect(screen.queryByText("Product updated successfully!")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Beta Boots")).toBeInTheDocument();
    });
    expect(screen.queryByText("Product updated successfully!")).not.toBeInTheDocument();
  });

  it("clears stale error banner immediately when switching products", async () => {
    const productB = {
      id: "prod-2",
      name: "Beta Boots",
      price: 180,
      img: "https://example.com/beta.jpg",
    };

    mockGetProductById.mockImplementation(async (id) => {
      if (id === "prod-fail") throw new Error("Database timeout");
      if (id === "prod-2") return productB;
      return null;
    });

    const { rerender } = render(
      <EditProductForm productId="prod-fail" onProductUpdated={vi.fn()} />
    );

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent("Error fetching product: Database timeout");

    // Switching to Product B immediately clears the error banner
    rerender(<EditProductForm productId="prod-2" onProductUpdated={vi.fn()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Beta Boots")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays fetch error with distinct red styling", async () => {
    mockGetProductById.mockRejectedValue(new Error("Server offline"));

    render(<EditProductForm productId="prod-error" onProductUpdated={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.className).toContain("bg-red-500");
    expect(alert.className).not.toContain("bg-purple-500");
    expect(alert).toHaveTextContent("Error fetching product: Server offline");
  });

  it("displays product not found error in red alert box when product is null", async () => {
    mockGetProductById.mockResolvedValue(null);

    render(<EditProductForm productId="prod-missing" onProductUpdated={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.className).toContain("bg-red-500");
    expect(alert).toHaveTextContent("Product not found");
  });

  it("displays update failure in red alert box and clears it upon subsequent submit", async () => {
    const product = {
      id: "prod-1",
      name: "Gamma Cap",
      price: 35,
      img: "https://example.com/gamma.jpg",
    };
    mockGetProductById.mockResolvedValue(product);
    mockUpdateProduct.mockRejectedValueOnce(new Error("Permission denied"));

    render(<EditProductForm productId="prod-1" onProductUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Gamma Cap")).toBeInTheDocument();
    });

    // First submit fails
    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.className).toContain("bg-red-500");
    expect(alert).toHaveTextContent("Error updating product: Permission denied");

    // Second submit succeeds
    mockUpdateProduct.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("Product updated successfully!")).toBeInTheDocument();
    });
  });

  it("uploads product image if a new image file is selected", async () => {
    const product = {
      id: "prod-1",
      name: "Delta Tee",
      price: 50,
      img: "https://example.com/delta-old.jpg",
    };
    mockGetProductById.mockResolvedValue(product);
    mockUploadProductImage.mockResolvedValue("https://example.com/delta-new.jpg");
    mockUpdateProduct.mockResolvedValue({});

    const onProductUpdated = vi.fn();
    const { container } = render(
      <EditProductForm productId="prod-1" onProductUpdated={onProductUpdated} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Delta Tee")).toBeInTheDocument();
    });

    const file = new File(["dummy content"], "new-image.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /update product/i }));

    await waitFor(() => {
      expect(mockUploadProductImage).toHaveBeenCalledWith(file);
      expect(mockUpdateProduct).toHaveBeenCalledWith("prod-1", {
        name: "Delta Tee",
        price: 50,
        img: "https://example.com/delta-new.jpg",
      });
      expect(screen.getByText("Product updated successfully!")).toBeInTheDocument();
      expect(onProductUpdated).toHaveBeenCalled();
    });
  });
});
