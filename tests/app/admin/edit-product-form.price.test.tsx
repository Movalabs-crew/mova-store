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

const product = {
  id: "prod-1",
  name: "Alpha Sneakers",
  price: 120,
  img: "https://example.com/alpha.jpg",
};

async function renderLoaded() {
  mockGetProductById.mockResolvedValue(product);
  const view = render(<EditProductForm productId="prod-1" onProductUpdated={vi.fn()} />);
  await waitFor(() => {
    expect(screen.getByDisplayValue("Alpha Sneakers")).toBeInTheDocument();
  });
  return view;
}

function submitForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("form not found");
  fireEvent.submit(form);
}

describe("EditProductForm price guard (#560)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks submission and shows a message when the price is empty (NaN)", async () => {
    const { container } = await renderLoaded();

    fireEvent.change(screen.getByDisplayValue("120"), { target: { value: "" } });
    submitForm(container);

    expect(await screen.findByTestId("price-error")).toHaveTextContent(
      "Please enter a valid price"
    );
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("blocks submission for a negative price", async () => {
    const { container } = await renderLoaded();

    fireEvent.change(screen.getByDisplayValue("120"), { target: { value: "-5" } });
    submitForm(container);

    expect(await screen.findByTestId("price-error")).toBeInTheDocument();
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it("submits a valid price and clears the field error", async () => {
    mockUpdateProduct.mockResolvedValue({});
    const { container } = await renderLoaded();

    fireEvent.change(screen.getByDisplayValue("120"), { target: { value: "12.5" } });
    submitForm(container);

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith("prod-1", {
        name: "Alpha Sneakers",
        price: 12.5,
        img: "https://example.com/alpha.jpg",
      });
    });
    expect(screen.queryByTestId("price-error")).not.toBeInTheDocument();
  });
});
