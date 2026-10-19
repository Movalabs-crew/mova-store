import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Checkout from "../../app/checkout/page";
import { requestOtp, verifyOtp } from "../../lib/otp-client";

vi.mock("../../lib/otp-client", () => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
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

describe("Checkout OTP flow (server-side verification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("disables the stage-1 submit button while the OTP request is in flight", async () => {
    let resolveRequest: (value: any) => void;
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    vi.mocked(requestOtp).mockImplementation(() => requestPromise as any);

    seedCart();
    const { container } = render(<Checkout />);

    const form = formOf(container);
    fillValidForm(container);

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.submit(form);

    // Button should now be disabled and show "Submitting..."
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submitting\.\.\./i })).toBeDisabled();
    });

    // Submitting again while in-flight is a no-op.
    fireEvent.submit(form);
    expect(requestOtp).toHaveBeenCalledTimes(1);

    resolveRequest!({ ok: true });

    // Transitions to stage 2 (Confirm OTP)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });
  });

  it("keeps the shopper on the OTP stage when the server rejects the code", async () => {
    vi.mocked(requestOtp).mockResolvedValueOnce({ ok: true } as any);
    vi.mocked(verifyOtp).mockResolvedValueOnce({ ok: false, error: "mismatch" } as any);

    seedCart();
    const { container } = render(<Checkout />);

    const form = formOf(container);
    fillValidForm(container);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/please confirm otp/i), {
      target: { value: "123456" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /confirm/i }).closest("form")!);

    // The server rejected the code, so the shopper must stay on the OTP stage
    // and never reach the completion panel.
    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith("ada@example.com", "123456");
    });
    expect(screen.queryByText(/order completed/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/please confirm otp/i)).toBeInTheDocument();
  });
});

describe("Checkout form error identification (#603)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("marks an invalid field aria-invalid and links the message that explains why", async () => {
    seedCart();
    const { container } = render(<Checkout />);
    fillValidForm(container);

    // Every other field stays valid, so exactly one error is reported.
    const expiry = field(container, "checkout-expiry-date");
    fireEvent.change(expiry, { target: { value: "" } });
    expect(expiry).toHaveAttribute("aria-invalid", "false");

    fireEvent.submit(formOf(container));

    await waitFor(() => {
      expect(expiry).toHaveAttribute("aria-invalid", "true");
    });
    expect(expiry).toHaveAttribute("aria-describedby", "checkout-expiry-date-error");
    // The id that aria-describedby points at has to exist, otherwise the reason
    // for the failure is never announced to a screen reader.
    expect(
      container.querySelector<HTMLParagraphElement>("#checkout-expiry-date-error")
    ).toHaveTextContent("Expiry date is required");
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it("focuses the first invalid field in the form and sends no OTP", async () => {
    seedCart();
    const { container } = render(<Checkout />);
    fillValidForm(container);

    // Two independent failures: an incomplete CVV, and a 16-digit card that
    // fails the Luhn check.
    fireEvent.change(field(container, "checkout-cvv"), { target: { value: "12" } });
    fireEvent.change(field(container, "checkout-card-number"), {
      target: { value: "1234567890123456" },
    });

    fireEvent.submit(formOf(container));

    await waitFor(() => {
      expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(2);
    });
    // A form already known to be invalid never requests an OTP.
    expect(requestOtp).not.toHaveBeenCalled();
    // Focus lands on the first failure in document order (the card), not the
    // last one that was validated.
    await waitFor(() => {
      expect(document.activeElement).toBe(field(container, "checkout-card-number"));
    });
  });

  it("clears the error and aria-invalid once the user corrects the field", async () => {
    seedCart();
    const { container } = render(<Checkout />);
    fireEvent.submit(formOf(container));

    const firstName = field(container, "checkout-first-name");
    await waitFor(() => {
      expect(firstName).toHaveAttribute("aria-invalid", "true");
    });
    expect(
      container.querySelector<HTMLParagraphElement>("#checkout-first-name-error")
    ).toHaveTextContent("First name is required");

    fireEvent.change(firstName, { target: { value: "Ada" } });

    await waitFor(() => {
      expect(firstName).toHaveAttribute("aria-invalid", "false");
    });
    expect(container.querySelector("#checkout-first-name-error")).not.toBeInTheDocument();
    expect(firstName).not.toHaveAttribute("aria-describedby");
  });
});

/**
 * Issue #477: the card/contact validators are imported by the page, so every
 * one of them has to actually gate submission. Each case below starts from a
 * form that is valid except for the one field under test, so a missing
 * validator for that field shows up as "an OTP was requested anyway".
 */
describe("Checkout per-field validation blocks submission (#477)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const REJECTED: Array<{ id: string; label: string; value: string; message: string }> = [
    {
      id: "checkout-first-name",
      label: "first name",
      value: "A9",
      message: "First name can only contain letters, spaces, hyphens, and apostrophes",
    },
    {
      id: "checkout-last-name",
      label: "last name",
      value: "",
      message: "Last name is required",
    },
    {
      id: "checkout-email",
      label: "email",
      value: "not-an-email",
      message: "Please enter a valid email address",
    },
    {
      id: "checkout-address",
      label: "address",
      value: "12A",
      message: "Please enter a complete address",
    },
    {
      id: "checkout-card-number",
      label: "card number",
      value: "1234",
      message: "Please enter a valid card number",
    },
    {
      id: "checkout-expiry-date",
      label: "expiry date",
      value: "01/20",
      message: "Card has expired",
    },
    {
      id: "checkout-cvv",
      label: "CVV",
      value: "12",
      message: "CVV must be 3 or 4 digits",
    },
  ];

  it.each(REJECTED)(
    "rejects an invalid $label with a visible message and sends no OTP",
    async ({ id, value, message }) => {
      seedCart();
      const { container } = render(<Checkout />);
      fillValidForm(container);

      fireEvent.change(field(container, id), { target: { value } });
      fireEvent.submit(formOf(container));

      const input = field(container, id);
      await waitFor(() => {
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
      expect(input).toHaveAttribute("aria-describedby", `${id}-error`);
      expect(container.querySelector(`#${id}-error`)).toHaveTextContent(message);
      // Every other field is valid, so this failure is the only one.
      expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1);
      // An invalid form never spends an OTP request.
      expect(requestOtp).not.toHaveBeenCalled();
    }
  );

  it("accepts a card number typed with spaces", async () => {
    vi.mocked(requestOtp).mockResolvedValueOnce({ ok: true } as any);

    seedCart();
    const { container } = render(<Checkout />);
    fillValidForm(container);

    // Spaces are how the number is printed on the card; the validator strips
    // them, so rejecting this would be a false negative.
    fireEvent.change(field(container, "checkout-card-number"), {
      target: { value: "4242 4242 4242 4242" },
    });
    fireEvent.submit(formOf(container));

    await waitFor(() => {
      expect(requestOtp).toHaveBeenCalledTimes(1);
    });
    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });
});
