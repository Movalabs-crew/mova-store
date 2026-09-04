import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Products from "@/app/shop/page";
import { CartProvider } from "@/context/CartContext";
import * as productsLib from "@/lib/products";

// Ensure localStorage mock is available for CartProvider
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

Object.defineProperty(window, "localStorage", {
  value: createLocalStorageMock(),
  writable: true,
});

describe("Shop Page Loading and Empty States (Issue #105)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  const renderShopPage = () => {
    return render(
      <CartProvider>
        <Products />
      </CartProvider>
    );
  };

  it("renders ProductGridSkeleton while listProducts is pending", () => {
    // Return an unresolved promise to simulate pending network request
    vi.spyOn(productsLib, "listProducts").mockImplementation(
      () => new Promise(() => {})
    );

    const { container } = renderShopPage();

    // Verify skeleton animation elements are rendered
    const skeletonElements = container.querySelectorAll(".animate-pulse");
    expect(skeletonElements.length).toBeGreaterThan(0);
    expect(screen.queryByText("No products yet")).not.toBeInTheDocument();
  });

  it("renders an explicit 'No products yet' empty state when listProducts resolves empty", async () => {
    vi.spyOn(productsLib, "listProducts").mockResolvedValue([]);

    renderShopPage();

    // Await the resolution of the empty products list
    await waitFor(() => {
      expect(screen.getByText("No products yet")).toBeInTheDocument();
    });

    // Verify skeleton is no longer present
    const skeletonElements = document.querySelectorAll(".animate-pulse");
    expect(skeletonElements.length).toBe(0);
  });

  it("renders the error message when listProducts rejects", async () => {
    vi.spyOn(productsLib, "listProducts").mockRejectedValue(
      new Error("Network connection failed")
    );

    renderShopPage();

    await waitFor(() => {
      expect(
        screen.getByText("Network connection failed")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("No products yet")).not.toBeInTheDocument();
  });

  it("renders product cards when listProducts returns items", async () => {
    const mockProducts = [
      {
        id: "prod-1",
        name: "Stellar Horizon Hoodie",
        price: 49.99,
        img: "https://example.com/hoodie.jpg",
      },
    ];

    vi.spyOn(productsLib, "listProducts").mockResolvedValue(mockProducts as any);

    renderShopPage();

    await waitFor(() => {
      expect(screen.getByText("Stellar Horizon Hoodie")).toBeInTheDocument();
      expect(screen.getByText("$49.99")).toBeInTheDocument();
    });

    expect(screen.queryByText("No products yet")).not.toBeInTheDocument();
  });
});
