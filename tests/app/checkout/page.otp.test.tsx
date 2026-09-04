import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

/** Render the checkout page and submit stage 1, returning the OTP from the (mocked) email. */
const reachOtpStage = async () => {
  render(<Checkout />);
  const form = screen
    .getByRole("button", { name: /^submit$/i })
    .closest("form") as HTMLFormElement;
  fireEvent.submit(form);
  await act(async () => {});
  const payload = sendMail.mock.calls[0][0] as { message: string };
  const match = payload.message.match(/Your OTP is: (\d{6})/);
  if (!match) throw new Error(`OTP not found in mail message: ${payload.message}`);
  return match[1];
};

const submitOtpForm = () => {
  const form = screen
    .getByPlaceholderText("OTP")
    .closest("form") as HTMLFormElement;
  fireEvent.submit(form);
  return form;
};

describe("Checkout OTP validation (#76)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("sends a zero-padded six-digit OTP and accepts it back", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.000042); // otp = "000042"
    sendMail.mockResolvedValue(undefined);

    const otp = await reachOtpStage();
    expect(otp).toBe("000042");

    fireEvent.change(screen.getByPlaceholderText("OTP"), {
      target: { value: "000042" },
    });
    submitOtpForm();
    expect(await screen.findByText("Order Completed.")).toBeTruthy();
  });

  it("rejects a wrong numeric OTP", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.000042); // otp = "000042"
    sendMail.mockResolvedValue(undefined);

    const otp = await reachOtpStage();
    const wrong = String((Number(otp) + 1) % 1_000_000).padStart(6, "0");

    fireEvent.change(screen.getByPlaceholderText("OTP"), {
      target: { value: wrong },
    });
    submitOtpForm();
    await act(async () => {});

    expect(screen.queryByText("Order Completed.")).toBeNull();
    expect(screen.getByText("Incorrect OTP. Please try again.")).toBeTruthy();
  });

  it("rejects digits followed by junk characters", async () => {
    sendMail.mockResolvedValue(undefined);
    const otp = await reachOtpStage();
    const junk = otp.slice(0, 3) + "x";

    fireEvent.change(screen.getByPlaceholderText("OTP"), {
      target: { value: junk },
    });
    submitOtpForm();
    await act(async () => {});

    expect(screen.queryByText("Order Completed.")).toBeNull();
    expect(screen.getByText("Incorrect OTP. Please try again.")).toBeTruthy();
  });

  it("rejects letters-only input", async () => {
    sendMail.mockResolvedValue(undefined);
    await reachOtpStage();

    fireEvent.change(screen.getByPlaceholderText("OTP"), {
      target: { value: "abc" },
    });
    submitOtpForm();
    await act(async () => {});

    expect(screen.queryByText("Order Completed.")).toBeNull();
    expect(screen.getByText("Incorrect OTP. Please try again.")).toBeTruthy();
  });

  it("enforces maxLength=6 and a numeric input on the OTP field", async () => {
    sendMail.mockResolvedValue(undefined);
    await reachOtpStage();

    const input = screen.getByPlaceholderText("OTP");
    expect(input).toHaveAttribute("maxlength", "6");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });
});
