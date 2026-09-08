import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Cart from "../../components/Cart";

describe("Cart floating badge button", () => {
  it("does not render the badge when itemCount is 0", () => {
    render(<Cart itemCount={0} onClick={vi.fn()} />);

    expect(screen.queryByText("3")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("renders the badge showing '3' when itemCount is 3", () => {
    render(<Cart itemCount={3} onClick={vi.fn()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onClick exactly once when the button is clicked", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={3} onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
