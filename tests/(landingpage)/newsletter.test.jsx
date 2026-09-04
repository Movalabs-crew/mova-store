import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Newsletter from "../../app/(landingpage)/newsletter";

const SUCCESS = "Thank you for subscribing!";
const ERROR = "Please enter a valid email!";

function submit(email) {
  const input = screen.getByPlaceholderText("Enter your email");
  if (email !== null) {
    fireEvent.change(input, { target: { value: email } });
  }
  fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
}

describe("Newsletter", () => {
  it("never shows the success toast for an invalid email", () => {
    render(<Newsletter />);
    submit("not-an-email");

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
    expect(screen.getByText(ERROR)).toBeInTheDocument();
  });

  it("never shows the success toast for an empty submission", () => {
    render(<Newsletter />);
    submit(null);

    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
    expect(screen.getByText(ERROR)).toBeInTheDocument();
  });

  it("shows the success toast for a valid email and clears the state", () => {
    render(<Newsletter />);
    submit("shopper@example.com");
    expect(screen.getByText(SUCCESS)).toBeInTheDocument();

    // form and state are reset after submit
    const input = screen.getByPlaceholderText("Enter your email");
    expect(input).toHaveValue("");

    // submitting again with an empty field must not reuse the stale email
    submit(null);
    expect(screen.queryByText(SUCCESS)).not.toBeInTheDocument();
    expect(screen.getByText(ERROR)).toBeInTheDocument();
  });
});
