import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mockListProducts, mockUseCart } = vi.hoisted(() => ({
  mockListProducts: vi.fn(),
  mockUseCart: vi.fn(),
}));

vi.mock("../../../lib/products", () => ({
  listProducts: () => mockListProducts(),
}));

vi.mock("../../../context/CartContext", () => ({
  useCart: () => mockUseCart(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("../../../components/Cart", () => ({ default: () => null }));
vi.mock("../../../components/Toast", () => ({ default: () => null }));
vi.mock("../../../components/Modal", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

import Products from "../../../app/shop/page";

describe("Shop results are a labelled list (#598)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCart.mockReturnValue({
      itemCount: 0,
      cartItems: [],
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      totalPrice: 0,
    });
  });

  it("exposes an accessible name that includes the result count", async () => {
    mockListProducts.mockResolvedValue([
      { id: "shoe-1", name: "Nike Air Zoom", price: 120, img: "https://example.com/1.png" },
      { id: "shoe-2", name: "Adidas Ultraboost", price: 150, img: "https://example.com/2.png" },
    ]);

    render(<Products />);

    await waitFor(() => expect(screen.queryByTestId("products-loading")).not.toBeInTheDocument());

    const list = screen.getByRole("list");
    expect(list).toHaveAccessibleName(/2 products found/i);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("uses the singular count for a single result", async () => {
    mockListProducts.mockResolvedValue([
      { id: "shoe-1", name: "Nike Air Zoom", price: 120, img: "https://example.com/1.png" },
    ]);

    render(<Products />);

    await waitFor(() => expect(screen.queryByTestId("products-loading")).not.toBeInTheDocument());

    expect(screen.getByRole("list")).toHaveAccessibleName(/1 product found/i);
  });
});
