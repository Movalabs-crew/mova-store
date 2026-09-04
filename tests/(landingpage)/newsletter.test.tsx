import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Newsletter from "@/app/(landingpage)/newsletter";

const SUCCESS_MESSAGE = "Thank you for subscribing!";

describe("Newsletter component", () => {
  it("shows error toast when email is empty", () => {
    render(<Newsletter />);
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    fireEvent.click(submitBtn);

    expect(screen.getByText("Please enter your email!")).toBeInTheDocument();
    expect(screen.queryByText(SUCCESS_MESSAGE)).not.toBeInTheDocument();
  });

  it("shows error toast when invalid email is entered", () => {
    render(<Newsletter />);
    const input = screen.getByPlaceholderText("Enter your email");
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(screen.queryByText(SUCCESS_MESSAGE)).not.toBeInTheDocument();
  });

  it("never shows the success toast for any invalid email", () => {
    render(<Newsletter />);
    const input = screen.getByPlaceholderText("Enter your email") as HTMLInputElement;
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    for (const invalid of ["invalid-email", "no@tld", "@example.com"]) {
      fireEvent.change(input, { target: { value: invalid } });
      fireEvent.click(submitBtn);

      expect(screen.queryByText(SUCCESS_MESSAGE)).not.toBeInTheDocument();
      // The success branch is the only one that clears the field.
      expect(input.value).toBe(invalid);
    }
  });

  it("shows success toast and resets email state on valid submission", () => {
    render(<Newsletter />);
    const input = screen.getByPlaceholderText("Enter your email") as HTMLInputElement;
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    fireEvent.change(input, { target: { value: "user@example.com" } });
    fireEvent.click(submitBtn);

    expect(screen.getByText(SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(input.value).toBe("");

    // Submitting again on cleared input should now ask for email
    fireEvent.click(submitBtn);
    expect(screen.getByText("Please enter your email!")).toBeInTheDocument();
  });
});
