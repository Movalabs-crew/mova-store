import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock("../../../lib/sendmail", () => ({ default: sendMail }));
vi.mock("../../../components/StellarCheckoutButton", () => ({
  default: () => null,
}));
vi.mock("../../../components/StellarWalletButton", () => ({
  default: () => null,
}));
vi.mock("../../../components/StellarOrderWatch", () => ({
  default: () => null,
}));
vi.mock("../../../context/CartContext", () => ({ useCart: () => ({}) }));

import Checkout from "../../../app/checkout/page";

const fillStage1 = (container: HTMLElement) => {
  const set = (name: string, value: string) =>
    fireEvent.change(
      container.querySelector(`input[name="${name}"]`) as HTMLInputElement,
      { target: { value } }
    );
  set("firstName", "Ada");
  set("lastName", "Lovelace");
  set("email", "ada@example.com");
  set("address", "1 Analytical Way");
  // the app reuses name="cardNumber" for the CVV field too - fill both
  const cardInputs = container.querySelectorAll('input[name="cardNumber"]');
  fireEvent.change(cardInputs[0] as HTMLInputElement, {
    target: { value: "4242424242424242" },
  });
  set("expiryDate", "12/28");
  fireEvent.change(cardInputs[cardInputs.length - 1] as HTMLInputElement, {
    target: { value: "123" },
  });
};

describe("Checkout submit buttons stay disabled while pending (#78)", () => {
  it("spam-clicking Submit while the OTP email is in flight sends exactly one email", async () => {
    sendMail.mockImplementation(() => new Promise(() => {})); // never settles

    const { container } = render(<Checkout />);
    fillStage1(container);
    const button = screen.getByRole("button", { name: /^submit$/i });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  it("re-enables Submit after a failed send", async () => {
    sendMail.mockRejectedValue(new Error("mail server down"));

    const { container } = render(<Checkout />);
    fillStage1(container);
    const button = screen.getByRole("button", { name: /^submit$/i });

    fireEvent.click(button);
    expect(button).toBeDisabled();

    await act(async () => {});
    expect(button).not.toBeDisabled();
    expect(
      screen.getByText("Failed to send OTP. Please try again.")
    ).toBeTruthy();
  });

  it("the OTP confirm button does not advance the stage on a wrong OTP and stays usable", async () => {
    sendMail.mockResolvedValue(undefined);

    render(<Checkout />);
    const stage1Form = screen
      .getByRole("button", { name: /^submit$/i })
      .closest("form") as HTMLFormElement;
    fireEvent.submit(stage1Form);
    await act(async () => {});

    const otpInput = screen.getByPlaceholderText("OTP");
    const confirmButton = screen.getByRole("button", { name: /^confirm$/i });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.change(otpInput, { target: { value: "000000" } });
    const stage2Form = otpInput.closest("form") as HTMLFormElement;
    fireEvent.submit(stage2Form);
    await act(async () => {});

    // "000000" only matches if the random OTP happens to be 0; guard against it.
    const emailed = (sendMail.mock.calls[0][0] as { message: string }).message;
    const otp = emailed.match(/Your OTP is: (\d+)/)![1];
    if (otp !== "000000") {
      expect(screen.queryByText("Order Completed.")).toBeNull();
      expect(confirmButton).not.toBeDisabled();
    }
  });
});
