import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { mockCreateProduct, mockUploadProductImage } = vi.hoisted(() => ({
  mockCreateProduct: vi.fn(),
  mockUploadProductImage: vi.fn(),
}));

vi.mock("../../../lib/products", () => ({
  createProduct: (...args) => mockCreateProduct(...args),
  uploadProductImage: (...args) => mockUploadProductImage(...args),
}));

import AddProductForm from "../../../app/admin/AddProductForm";

describe("AddProductForm price validation (#559)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () => {
    const onProductAdded = vi.fn();
    const { container } = render(<AddProductForm onProductAdded={onProductAdded} />);
    return { onProductAdded, form: container.querySelector("form") };
  };

  const fillFields = (price) => {
    fireEvent.change(screen.getByLabelText(/product name/i), {
      target: { value: "Test Shoe" },
    });
    fireEvent.change(screen.getByLabelText(/product price/i), {
      target: { value: String(price) },
    });
  };

  it("marks the price input with the HTML min/step guards", () => {
    renderForm();

    const priceInput = screen.getByLabelText(/product price/i);
    expect(priceInput).toHaveAttribute("type", "number");
    expect(priceInput).toHaveAttribute("min", "0");
    expect(priceInput).toHaveAttribute("step", "0.01");
  });

  it("shows a visible error and does not create a product for a negative price", async () => {
    const { form } = renderForm();
    fillFields(-50);

    fireEvent.submit(form);

    expect(await screen.findByText(/price cannot be negative/i)).toBeInTheDocument();
    expect(mockCreateProduct).not.toHaveBeenCalled();
    expect(mockUploadProductImage).not.toHaveBeenCalled();
  });

  it("shows a visible error for an absurd price", async () => {
    const { form } = renderForm();
    fillFields(2000000);

    fireEvent.submit(form);

    expect(await screen.findByText(/price is too high/i)).toBeInTheDocument();
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it("shows a visible error for a price that is not a number", async () => {
    const { form } = renderForm();
    fillFields("not-a-number");

    fireEvent.submit(form);

    expect(await screen.findByText(/valid price/i)).toBeInTheDocument();
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it("still creates the product for an accepted price", async () => {
    mockUploadProductImage.mockResolvedValue("https://example.com/shoe.png");
    mockCreateProduct.mockResolvedValue({ id: "p-1", name: "Test Shoe", price: 49.99 });

    const { form, onProductAdded } = renderForm();
    fillFields(49.99);

    const file = new File(["dummy content"], "shoe.png", { type: "image/png" });
    fireEvent.change(form.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith({
        name: "Test Shoe",
        price: 49.99,
        img: "https://example.com/shoe.png",
      });
    });
    expect(onProductAdded).toHaveBeenCalled();
  });
});
