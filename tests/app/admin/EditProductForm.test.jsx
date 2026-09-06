import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getProductById, updateProduct, uploadProductImage } = vi.hoisted(() => ({
  getProductById: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImage: vi.fn(),
}));

vi.mock("../../../lib/products", () => ({
  getProductById,
  updateProduct,
  uploadProductImage,
}));

import EditProductForm from "../../../app/admin/EditProductForm";

const product = (id, price) => ({
  name: `Name ${id}`,
  price,
  img: `${id}.png`,
});

describe("EditProductForm stale banner (#27)", () => {
  it("loads the selected product into the form", async () => {
    getProductById.mockResolvedValue(product("A", 11));
    render(<EditProductForm productId="A" onProductUpdated={() => {}} />);
    expect(await screen.findByDisplayValue("Name A")).toBeTruthy();
    expect(screen.getByDisplayValue("11")).toBeTruthy();
  });

  it("does not show a stale success banner after switching products", async () => {
    getProductById.mockImplementation(async (id) => product(id, 12));
    updateProduct.mockResolvedValue({ ok: true });

    const { rerender } = render(
      <EditProductForm productId="A" onProductUpdated={() => {}} />
    );
    await screen.findByDisplayValue("Name A");

    fireEvent.click(screen.getByRole("button", { name: /update product/i }));
    expect(
      await screen.findByText("Product updated successfully!")
    ).toBeTruthy();

    // Selecting another product must immediately clear the green banner.
    rerender(<EditProductForm productId="B" onProductUpdated={() => {}} />);
    expect(
      screen.queryByText("Product updated successfully!")
    ).toBeNull();

    expect(await screen.findByDisplayValue("Name B")).toBeTruthy();
  });

  it("shows a fetch failure in a red error box", async () => {
    getProductById.mockRejectedValue(new Error("boom"));
    render(<EditProductForm productId="A" onProductUpdated={() => {}} />);

    const message = await screen.findByText(
      "Error fetching product: boom"
    );
    expect(message.className).toContain("bg-red-500");
  });

  it("shows an update failure in a red error box and clears it on reload", async () => {
    getProductById.mockImplementation(async (id) => product(id, 12));
    updateProduct.mockRejectedValue(new Error("oops"));

    const { rerender } = render(
      <EditProductForm productId="A" onProductUpdated={() => {}} />
    );
    await screen.findByDisplayValue("Name A");

    fireEvent.click(screen.getByRole("button", { name: /update product/i }));
    const error = await screen.findByText("Error updating product: oops");
    expect(error.className).toContain("bg-red-500");

    // Loading another product clears the prior error immediately.
    rerender(<EditProductForm productId="B" onProductUpdated={() => {}} />);
    expect(screen.queryByText("Error updating product: oops")).toBeNull();
    expect(await screen.findByDisplayValue("Name B")).toBeTruthy();
  });
});
