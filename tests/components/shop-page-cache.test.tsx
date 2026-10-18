import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Products from "../../app/shop/page";
import { useCart } from "../../context/CartContext";
import { listProducts } from "../../lib/products";
import { invalidateProductCache } from "../../lib/productCache";

vi.mock("../../lib/products", () => ({ listProducts: vi.fn() }));
vi.mock("../../context/CartContext", () => ({ useCart: vi.fn() }));
vi.mock("../../components/Toast", () => ({ default: () => null }));

const runner = { id: "runner-42", name: "Mova Runner", price: 75, img: "/images/shoe1.png" };
const sprint = { id: "sprint-7", name: "Mova Sprint", price: 90, img: "/images/shoe2.png" };

function renderShop() {
  return render(<Products />);
}

describe("Shop product caching (issue #618)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCart).mockReturnValue({
      itemCount: 0,
      cartItems: [],
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      totalPrice: 0,
    });
  });

  it("does not refetch the product list when the shop is revisited", async () => {
    vi.mocked(listProducts).mockResolvedValue([runner]);

    const firstVisit = renderShop();
    await screen.findByText(runner.name);
    expect(listProducts).toHaveBeenCalledTimes(1);
    firstVisit.unmount();

    renderShop();
    expect(screen.getByText(runner.name)).toBeInTheDocument();
    expect(screen.queryAllByRole("presentation", { hidden: true })).toHaveLength(0);
    expect(listProducts).toHaveBeenCalledTimes(1);
  });

  it("shows fresh data after the cache is invalidated by a mutation", async () => {
    vi.mocked(listProducts).mockResolvedValueOnce([runner]).mockResolvedValueOnce([sprint]);

    renderShop();
    await screen.findByText(runner.name);
    expect(listProducts).toHaveBeenCalledTimes(1);

    act(() => {
      invalidateProductCache();
    });

    await screen.findByText(sprint.name);
    expect(listProducts).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(runner.name)).not.toBeInTheDocument();
  });

  it("retries a failed load on the next visit instead of staying broken", async () => {
    vi.mocked(listProducts).mockRejectedValueOnce(new Error("Network is down"));

    const firstVisit = renderShop();
    await screen.findByText("Network is down");
    firstVisit.unmount();

    vi.mocked(listProducts).mockResolvedValueOnce([runner]);
    renderShop();
    await screen.findByText(runner.name);
    expect(listProducts).toHaveBeenCalledTimes(2);
  });
});
