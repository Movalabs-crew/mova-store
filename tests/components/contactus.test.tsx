import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ContactUs from "@/app/(landingpage)/ContactUs";
import * as sendMailModule from "@/lib/sendmail";

vi.mock("@/lib/sendmail", () => ({
  default: vi.fn(),
}));

describe("ContactUs component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders error persistently when sendMail rejects", async () => {
    vi.mocked(sendMailModule.default).mockRejectedValueOnce(new Error("Network Error"));

    render(<ContactUs />);

    fireEvent.change(screen.getByPlaceholderText("Your Name"), {
      target: { value: "Alice" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Email"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your Message"), {
      target: { value: "Hello world" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      const errorMsg = screen.getByRole("alert");
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg).toHaveTextContent("Failed to send message.");
    });
  });

  it("clears error on subsequent input change or retry", async () => {
    vi.mocked(sendMailModule.default)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ status: 200, text: "OK" });

    render(<ContactUs />);

    const nameInput = screen.getByPlaceholderText("Your Name");
    fireEvent.change(nameInput, { target: { value: "Bob" } });
    fireEvent.change(screen.getByPlaceholderText("Your Email"), { target: { value: "bob@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Your Message"), { target: { value: "Test" } });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Typing in name input clears error
    fireEvent.change(nameInput, { target: { value: "Bobby" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
