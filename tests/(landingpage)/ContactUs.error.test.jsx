import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("../../lib/sendmail", () => ({ default: sendMail }));

import ContactUs from "../../app/(landingpage)/ContactUs";

const fillForm = () => {
  fireEvent.change(screen.getByPlaceholderText("Your Name"), {
    target: { value: "Tester" },
  });
  fireEvent.change(screen.getByPlaceholderText("Your Email"), {
    target: { value: "tester@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Your Message"), {
    target: { value: "Hello there" },
  });
};

const submit = () => {
  fireEvent.click(screen.getByRole("button", { name: /send message/i }));
};

describe("ContactUs persistent error rendering (#81)", () => {
  it("starts with no error region", () => {
    sendMail.mockResolvedValue(undefined);
    render(<ContactUs />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a persistent error when sendMail rejects (not only the toast)", async () => {
    sendMail.mockRejectedValue(new Error("mail server down"));
    render(<ContactUs />);
    fillForm();
    submit();
    await act(async () => {});

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Failed to send message.");
  });

  it("clears the error once a subsequent submit succeeds", async () => {
    sendMail.mockRejectedValueOnce(new Error("mail server down"));
    sendMail.mockResolvedValueOnce(undefined);
    render(<ContactUs />);

    fillForm();
    submit();
    await act(async () => {});
    expect(screen.getByRole("alert")).toBeTruthy();

    // fill again (inputs were NOT reset after a failure) and retry
    fillForm();
    submit();
    await act(async () => {});

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByPlaceholderText("Your Name")).toHaveValue("");
  });
});
