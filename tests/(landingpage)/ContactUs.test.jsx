import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ContactUs from "../../app/(landingpage)/ContactUs";

vi.mock("../../lib/sendmail", () => ({
  default: vi.fn(),
}));

// eslint-disable-next-line import/first
import sendMail from "../../lib/sendmail";

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText("Your Name"), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByPlaceholderText("Your Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Your Message"), {
    target: { value: "Hello Mova!" },
  });
}

beforeEach(() => {
  vi.mocked(sendMail).mockReset();
});

describe("ContactUs", () => {
  it("renders an error message when sendMail rejects", async () => {
    vi.mocked(sendMail).mockRejectedValue(new Error("mail down"));
    render(<ContactUs />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText("Unable to send message, please try again later")
    ).toBeInTheDocument();
    expect(screen.queryByText("Message sent successfully!")).not.toBeInTheDocument();
  });

  it("shows the success toast and resets the form when sendMail resolves", async () => {
    vi.mocked(sendMail).mockResolvedValue({ ok: true });
    render(<ContactUs />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText("Message sent successfully!")).toBeInTheDocument();
    expect(sendMail).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello Mova!",
    });

    // controlled inputs are reset after a successful send
    const form = screen.getByRole("button", { name: /send message/i }).closest("form");
    const inputs = within(form).getAllByRole("textbox").slice(0, 2);
    for (const input of inputs) {
      expect(input).toHaveValue("");
    }
    expect(within(form).getByPlaceholderText("Your Message")).toHaveValue("");
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveSend;
    vi.mocked(sendMail).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );
    render(<ContactUs />);
    fillForm();
    const button = screen.getByRole("button", { name: /send message/i });

    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByText("Sending...")).toBeInTheDocument();

    await waitFor(() => resolveSend?.({ ok: true }));
    await screen.findByText("Message sent successfully!");
  });
});
