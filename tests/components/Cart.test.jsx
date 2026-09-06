import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Cart from "../../components/Cart";

describe("Cart component", () => {
  it("does not render item count badge when itemCount is 0", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={0} onClick={handleClick} />);

    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("3")).toBeNull();
  });

  it("renders the item count badge when itemCount is positive", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={3} onClick={handleClick} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onClick handler when the cart button is clicked", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={3} onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
