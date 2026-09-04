import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Cart from "../../components/Cart";

describe("Cart component", () => {
  it("does not render the badge when itemCount is 0", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={0} onClick={handleClick} />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("renders the badge with correct count when itemCount > 0", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={3} onClick={handleClick} />);

    const badge = screen.getByText("3");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-purple-600");
  });

  it("calls onClick exactly once when clicked", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={3} onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
