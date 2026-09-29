import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/buyer-orders", () => ({ verifyOrderOnChain: vi.fn() }));

import OrderCard from "../../components/OrderCard";
import { verifyOrderOnChain, type BuyerOrder } from "../../lib/buyer-orders";

const baseOrder: BuyerOrder = {
  id: "row-1",
  orderId: "MOVA-ORD-0001",
  createdAt: "2026-01-15T10:30:00.000Z",
  total: 125.5,
  status: "Paid",
  paymentMethod: "stellar",
  tokenSymbol: "USDC",
  tokenAmount: 125.5,
  txHash: "abc123",
  items: [{ id: 1, name: "Mova Runner", price: 75, quantity: 2, img: "/images/shoe1.png" }],
};

function order(overrides: Partial<BuyerOrder> = {}): BuyerOrder {
  return { ...baseOrder, ...overrides };
}

describe("OrderCard", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("renders the order id, formatted date and total", () => {
    render(<OrderCard order={order()} />);

    expect(screen.getByText("MOVA-ORD-0001")).toBeInTheDocument();
    expect(screen.getByText("$125.50")).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
  });

  it("copies the order id to the clipboard", () => {
    render(<OrderCard order={order()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Order ID" }));

    expect(writeText).toHaveBeenCalledWith("MOVA-ORD-0001");
    expect(screen.getByRole("button", { name: "Copy Order ID" })).toBeInTheDocument();
  });

  it.each([
    ["Shipped", "Shipped"],
    ["Completed", "Completed"],
    ["Paid", "Paid"],
    ["Refunded", "Refunded"],
  ] as const)("renders the badge for a %s order", (status, label) => {
    render(<OrderCard order={order({ status })} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("falls back to a pending badge for an unknown status", () => {
    render(<OrderCard order={order({ status: "Awaiting Stock" as BuyerOrder["status"] })} />);

    expect(screen.getByText("Awaiting Stock")).toBeInTheDocument();
  });

  it("renders an item placeholder when the row has no image", () => {
    render(
      <OrderCard
        order={order({
          items: [{ name: "Belt", price: 40, quantity: 1 }],
        })}
      />
    );

    expect(screen.getByText("Belt")).toBeInTheDocument();
    expect(screen.getByText("Qty: 1")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("defaults the quantity when the item row omits one", () => {
    render(
      <OrderCard
        order={order({
          items: [{ name: "Belt", price: 40 }],
        })}
      />
    );

    expect(screen.getByText("Qty: 1")).toBeInTheDocument();
  });

  it("says so when no item details were recorded", () => {
    render(<OrderCard order={order({ items: [] })} />);

    expect(screen.getByText("No item details recorded")).toBeInTheDocument();
  });

  it("shows the card payment footer for card orders", () => {
    render(<OrderCard order={order({ paymentMethod: "card", tokenSymbol: undefined })} />);

    expect(screen.getByText("Paid with Card")).toBeInTheDocument();
    expect(screen.queryByText(/Paid with Stellar/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify Contract" })).not.toBeInTheDocument();
  });

  it("shows the Stellar footer with the token breakdown", () => {
    render(<OrderCard order={order()} />);

    expect(screen.getByText(/Paid with Stellar/)).toBeInTheDocument();
    expect(screen.getByText(/~125\.50 USDC/)).toBeInTheDocument();
  });

  it("omits the token breakdown when Stellar orders have no token amount", () => {
    render(<OrderCard order={order({ tokenAmount: undefined })} />);

    expect(screen.getByText(/Paid with Stellar/)).toBeInTheDocument();
    expect(screen.queryByText(/~125\.50/)).not.toBeInTheDocument();
  });

  it("links to the explorer only when a transaction hash exists", () => {
    const { rerender } = render(<OrderCard order={order()} />);

    expect(screen.getByRole("link", { name: /View On Explorer/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/tx/abc123")
    );

    rerender(<OrderCard order={order({ txHash: undefined })} />);
    expect(screen.queryByRole("link", { name: /View On Explorer/ })).not.toBeInTheDocument();
  });

  it("reports a verified on-chain order", async () => {
    vi.mocked(verifyOrderOnChain).mockResolvedValue({
      verified: true,
      onChainStatus: "Completed",
    });

    render(<OrderCard order={order()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify Contract" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Verified ✓" })).toBeEnabled());
    expect(verifyOrderOnChain).toHaveBeenCalledWith("MOVA-ORD-0001");
  });

  it("reports an order the contract does not know about", async () => {
    vi.mocked(verifyOrderOnChain).mockResolvedValue({ verified: false });

    render(<OrderCard order={order()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify Contract" }));

    await waitFor(() => expect(screen.getByText("Not Found")).toBeInTheDocument());
  });

  it("treats a thrown verification as not found", async () => {
    vi.mocked(verifyOrderOnChain).mockRejectedValue(new Error("rpc down"));

    render(<OrderCard order={order()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify Contract" }));

    await waitFor(() => expect(screen.getByText("Not Found")).toBeInTheDocument());
  });
});
