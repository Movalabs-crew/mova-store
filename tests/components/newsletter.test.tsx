import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Newsletter from "@/app/(landingpage)/newsletter";

describe("Newsletter component", () => {
  it("shows error toast when email is empty", () => {
    render(<Newsletter />);
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    fireEvent.click(submitBtn);

    expect(screen.getByText("Please enter your email!")).toBeInTheDocument();
  });

  it("shows error toast when invalid email is entered", () => {
    render(<Newsletter />);
    const input = screen.getByPlaceholderText("Enter your email");
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText("Please enter a valid email address")
    ).toBeInTheDocument();
  });

  it("shows success toast and resets email state on valid submission", () => {
    render(<Newsletter />);
    const input = screen.getByPlaceholderText("Enter your email") as HTMLInputElement;
    const submitBtn = screen.getByRole("button", { name: "Subscribe" });

    fireEvent.change(input, { target: { value: "user@example.com" } });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Thank you for subscribing!")).toBeInTheDocument();
    expect(input.value).toBe("");

    // Submitting again on cleared input should now ask for email
    fireEvent.click(submitBtn);
    expect(screen.getByText("Please enter your email!")).toBeInTheDocument();
  });
});
