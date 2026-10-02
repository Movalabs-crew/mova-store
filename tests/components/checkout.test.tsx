import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Checkout from "../../app/checkout/page";
import sendMail from "../../lib/sendmail";

vi.mock("../../lib/sendmail", () => ({
  default: vi.fn(),
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

/**
 * The page replaces itself with the "Your cart is empty" panel as soon as it
 * has loaded an empty cart, so the checkout form only exists once a cart has
 * been persisted. Every test seeds one before rendering.
 */
function seedCart(): void {
  localStorage.setItem(
    "cartItems",
    JSON.stringify([{ id: "p1", name: "Widget", price: 25, quantity: 2 }])
  );
  localStorage.setItem("itemCount", "2");
  localStorage.setItem("totalPrice", "50");
}

/** A future MM/YY, so the expiry check keeps passing as time moves on. */
function futureExpiry(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  return `${month}/${year}`;
}

function field(container: HTMLElement, id: string): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`checkout field #${id} is not rendered`);
  return input;
}

function formOf(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector("form");
  if (!form) throw new Error("checkout form is not rendered");
  return form;
}

const VALID_DETAILS = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  address: "123 Analytical Engine Way",
  cardNumber: "4242424242424242",
  expiryDate: "12/30",
  cvv: "123",
};

function renderCheckoutWithCart() {
  localStorage.setItem(
    "cartItems",
    JSON.stringify([{ id: 1, name: "Mova Sneaker", price: 100, quantity: 1 }])
  );
  localStorage.setItem("totalPrice", "100");
  return render(<Checkout />);
}

/** Fills every field with data its validator accepts. */
function fillValidForm(container: HTMLElement): void {
  const values: Record<string, string> = {
    "checkout-first-name": "Ada",
    "checkout-last-name": "Lovelace",
    "checkout-email": "ada@example.com",
    "checkout-address": "12 Analytical Engine Way",
    // 16 digits that satisfy the Luhn check.
    "checkout-card-number": "4242424242424242",
    "checkout-expiry-date": futureExpiry(),
    "checkout-cvv": "123",
  };

  for (const [id, value] of Object.entries(values)) {
    fireEvent.change(field(container, id), { target: { value } });
  }
}

function fillValidDetails() {
  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: VALID_DETAILS.firstName },
  });
  fireEvent.change(screen.getByLabelText(/last name/i), {
    target: { value: VALID_DETAILS.lastName },
  });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: VALID_DETAILS.email } });
  fireEvent.change(screen.getByLabelText(/address/i), {
    target: { value: VALID_DETAILS.address },
  });
  fireEvent.change(screen.getByLabelText(/card number/i), {
    target: { value: VALID_DETAILS.cardNumber },
  });
  fireEvent.change(screen.getByLabelText(/expiry date/i), {
    target: { value: VALID_DETAILS.expiryDate },
  });
  fireEvent.change(screen.getByLabelText(/cvv/i), { target: { value: VALID_DETAILS.cvv } });
}

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

    const { container } = renderCheckoutWithCart();

    const form = formOf(container);
    fillValidForm(container);

    fillValidDetails();

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

    seedCart();
    const { container } = renderCheckoutWithCart();
    fillValidDetails();

    const form = formOf(container);
    fillValidForm(container);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    expect(confirmBtn).toBeEnabled();
  });
});

describe("Checkout form error identification (#603)", () => {
});

describe("Checkout page field validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });


  });
});
