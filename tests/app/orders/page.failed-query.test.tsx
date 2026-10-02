import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFetchBuyerOrders, mockUseAuth } = vi.hoisted(() => ({
  mockFetchBuyerOrders: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock("../../../lib/buyer-orders", () => ({
  fetchBuyerOrders: (...args: unknown[]) => mockFetchBuyerOrders(...args),
}));

vi.mock("../../../lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../../components/OrderCard", () => ({
  default: ({ order }: { order: { orderId: string } }) => <div>{order.orderId}</div>,
}));

import BuyerOrdersPage from "../../../app/orders/page";

const order = {
  id: "ord-1",
  orderId: "SS-101",
  userEmail: "buyer@example.com",
  createdAt: "2026-09-05T08:00:00.000Z",
  total: 89.99,
  status: "Paid" as const,
  paymentMethod: "stellar" as const,
  items: [{ name: "Running Shoes", price: 89.99, quantity: 1 }],
};

describe("Buyer orders page — a failed query is not an empty history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { email: "buyer@example.com" }, loading: false });
  });

  it("says the list may be incomplete when cached orders were served", async () => {
    mockFetchBuyerOrders.mockResolvedValue({
      orders: [order],
      source: "cache",
      stale: true,
      error: "permission denied for table orders",
    });

    render(<BuyerOrdersPage />);

    expect(await screen.findByText(/Showing orders cached on this device/)).toBeInTheDocument();
    expect(screen.getByText("SS-101")).toBeInTheDocument();
    expect(screen.queryByText("No orders found")).not.toBeInTheDocument();
  });

  it("does not claim the buyer has no orders when the load failed", async () => {
    mockFetchBuyerOrders.mockResolvedValue({
      orders: [],
      source: "cache",
      stale: true,
      error: "column orders.total does not exist",
    });

    render(<BuyerOrdersPage />);

    expect(await screen.findByText("Orders unavailable right now")).toBeInTheDocument();
    expect(screen.getByText(/This is not the same as having no orders/)).toBeInTheDocument();
    expect(screen.queryByText("No orders found")).not.toBeInTheDocument();
  });

  it("keeps the empty state for a confirmed empty history", async () => {
    mockFetchBuyerOrders.mockResolvedValue({
      orders: [],
      source: "cache",
      stale: false,
      error: null,
    });

    render(<BuyerOrdersPage />);

    expect(await screen.findByText("No orders found")).toBeInTheDocument();
    expect(screen.queryByText(/Showing orders cached on this device/)).not.toBeInTheDocument();
    expect(screen.queryByText("Orders unavailable right now")).not.toBeInTheDocument();
  });
});
