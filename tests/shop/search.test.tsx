import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Products from "../../app/shop/page";
import * as productsModule from "../../lib/products";

// Mock CartContext
vi.mock("../../context/CartContext", () => ({
  useCart: () => ({
    itemCount: 0,
    cartItems: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    totalPrice: 0,
  }),
}));

const mockGet = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockGet(key),
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/shop",
}));

describe("Shop page search filter", () => {
  const dummyProducts = [
    { id: "1", name: "Nike Air Jordan 1", price: 150, img: "/img1.png", description: "Classic" },
    { id: "2", name: "Adidas Ultraboost", price: 180, img: "/img2.png", description: "Running" },
    { id: "3", name: "Nike Air Max 90", price: 130, img: "/img3.png", description: "Casual" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(productsModule, "listProducts").mockResolvedValue(dummyProducts as never);
  });

  it("renders all products when no search param is set", async () => {
    mockGet.mockReturnValue(null);

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Nike Air Jordan 1")).toBeInTheDocument();
      expect(screen.getByText("Adidas Ultraboost")).toBeInTheDocument();
      expect(screen.getByText("Nike Air Max 90")).toBeInTheDocument();
    });
  });

  it("filters products matching the search query", async () => {
    mockGet.mockImplementation((key: string) => (key === "search" ? "Air Max" : null));

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText("Nike Air Max 90")).toBeInTheDocument();
      expect(screen.queryByText("Adidas Ultraboost")).not.toBeInTheDocument();
      expect(screen.queryByText("Nike Air Jordan 1")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Showing search results for/i)).toBeInTheDocument();
  });

  it("shows empty state when no products match the query", async () => {
    mockGet.mockImplementation((key: string) => (key === "search" ? "NonExistentShoe" : null));

    render(<Products />);

    await waitFor(() => {
      expect(screen.getByText(/No products found matching "NonExistentShoe"/i)).toBeInTheDocument();
    });
  });
});
