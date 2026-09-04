import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Checkout from "../../app/checkout/page";
import sendMail from "../../lib/sendmail";

vi.mock("../../lib/sendmail", () => ({
  default: vi.fn(),
}));

vi.mock("../../context/CartContext", () => ({
  useCart: () => ({
    cart: [],
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    totalPrice: 100,
    totalItems: 1,
  }),
}));

vi.mock("../../components/StellarCheckoutButton", () => ({
  default: () => <div data-testid="stellar-checkout-button" />,
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => <div data-testid="stellar-wallet-button" />,
}));

vi.mock("../../components/StellarOrderWatch", () => ({
  default: () => <div data-testid="stellar-order-watch" />,
}));

describe("Checkout page button disabled states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("disables the stage-1 submit button while sendMail request is in flight", async () => {
    let resolveSendMail: (value: any) => void;
    const sendMailPromise = new Promise((resolve) => {
      resolveSendMail = resolve;
    });

    vi.mocked(sendMail).mockImplementation(() => sendMailPromise as any);

    const { container } = render(<Checkout />);

    const form = container.querySelector("form")!;
    expect(form).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeEnabled();

    // Submit form
    fireEvent.submit(form);

    // Button should now be disabled and show "Submitting..."
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submitting\.\.\./i })).toBeDisabled();
    });

    // Submitting again while in-flight or clicking
    fireEvent.submit(form);
    expect(sendMail).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolveSendMail!({ status: 200, text: "OK" });

    // Transitions to stage 2 (Confirm OTP)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });
  });

  it("disables stage-2 OTP confirm button while OTP verification is processed", async () => {
    vi.mocked(sendMail).mockResolvedValueOnce({ status: 200, text: "OK" } as any);

    const { container } = render(<Checkout />);

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    expect(confirmBtn).toBeEnabled();
  });
});
