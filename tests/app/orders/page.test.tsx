import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

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
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("../../../components/OrderCard", () => ({
  default: ({ order }: any) => <div data-testid="order-card">{order.orderId}</div>,
}));

import BuyerOrdersPage from "../../../app/orders/page";

const ORDER = {
  id: "1",
  orderId: "SS-1",
  total: 10,
  status: "Paid",
  paymentMethod: "stellar",
  createdAt: "2026-09-05T08:00:00.000Z",
  items: [],
};

describe("Buyer orders page states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { email: "buyer@example.com" }, loading: false });
  });

  it("renders the order list when the fetch succeeds", async () => {
    mockFetchBuyerOrders.mockResolvedValue([ORDER]);

    render(<BuyerOrdersPage />);

    expect(await screen.findByTestId("order-card")).toHaveTextContent("SS-1");
    expect(screen.queryByTestId("orders-error")).not.toBeInTheDocument();
    expect(screen.queryByText(/no orders found/i)).not.toBeInTheDocument();
  });

  it("renders an error state, not the empty state, when the fetch fails", async () => {
    mockFetchBuyerOrders.mockRejectedValue(new Error("network down"));

    render(<BuyerOrdersPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/network down/i);
    expect(screen.queryByText(/no orders found/i)).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no orders", async () => {
    mockFetchBuyerOrders.mockResolvedValue([]);

    render(<BuyerOrdersPage />);

    expect(await screen.findByText(/no orders found/i)).toBeInTheDocument();
    expect(screen.queryByTestId("orders-error")).not.toBeInTheDocument();
  });

  it("re-reads the orders when the tab regains focus", async () => {
    mockFetchBuyerOrders.mockResolvedValue([]);

    render(<BuyerOrdersPage />);
    await waitFor(() => expect(mockFetchBuyerOrders).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(mockFetchBuyerOrders).toHaveBeenCalledTimes(2));
  });
});
