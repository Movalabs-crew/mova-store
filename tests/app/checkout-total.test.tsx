import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Checkout from "../../app/checkout/page";

vi.mock("../../lib/sendmail", () => ({ default: vi.fn() }));

vi.mock("../../components/StellarCheckoutButton", () => ({
  default: ({ amountUsd }: { amountUsd: number }) => (
    <div data-testid="stellar-checkout-button">{String(amountUsd)}</div>
  ),
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => <div data-testid="stellar-wallet-button" />,
}));

vi.mock("../../components/StellarOrderWatch", () => ({
  default: () => <div data-testid="stellar-order-watch" />,
}));

describe("Checkout derives the total from the cart items (Issue #619)", () => {
  beforeEach(() => localStorage.clear());

  it("uses the sum of the stored items and ignores a stale totalPrice key", async () => {
    localStorage.setItem(
      "cartItems",
      JSON.stringify([
        { id: "a", name: "A", price: 20 },
        { id: "b", name: "B", price: 5.5 },
      ])
    );
    localStorage.setItem("itemCount", "2");
    localStorage.setItem("totalPrice", "9999"); // stale, must be ignored

    render(<Checkout />);

    await waitFor(() =>
      expect(screen.getByTestId("stellar-checkout-button")).toHaveTextContent("25.5")
    );
  });
});
