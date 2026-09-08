import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Cart from "../../components/Cart";

describe("Cart component", () => {
  it("does not render count badge when itemCount is 0", () => {
    render(<Cart itemCount={0} onClick={vi.fn()} />);
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("3")).toBeNull();
  });

  it("does not render count badge when itemCount is negative", () => {
    render(<Cart itemCount={-1} onClick={vi.fn()} />);
    expect(screen.queryByText("-1")).toBeNull();
  });

  it("renders count badge with exact count when itemCount is positive", () => {
    render(<Cart itemCount={3} onClick={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeNull();
  });

  it("calls onClick callback exactly once when the button is clicked", () => {
    const handleClick = vi.fn();
    render(<Cart itemCount={3} onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("updates badge visibility and count when itemCount prop changes", () => {
    const { rerender } = render(<Cart itemCount={0} onClick={vi.fn()} />);
    expect(screen.queryByText("3")).toBeNull();

    rerender(<Cart itemCount={3} onClick={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(<Cart itemCount={0} onClick={vi.fn()} />);
    expect(screen.queryByText("3")).toBeNull();
  });
});
