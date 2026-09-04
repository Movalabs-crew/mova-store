import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import Cart from "../../components/Cart";

describe("Cart", () => {
  it("does not render badge when itemCount is 0", () => {
    const { queryByText } = render(<Cart itemCount={0} onClick={vi.fn()} />);
    expect(queryByText("0")).toBeNull();
  });

  it("shows the correct count when itemCount > 0", () => {
    const { queryByText } = render(<Cart itemCount={3} onClick={vi.fn()} />);
    expect(queryByText("3")).not.toBeNull();
    expect(queryByText("3")).toBeInTheDocument();
  });

  it("calls onClick exactly once when clicked", () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Cart itemCount={3} onClick={onClick} />);
    const button = getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when itemCount is 0", () => {
    const onClick = vi.fn();
    const { getByRole } = render(<Cart itemCount={0} onClick={onClick} />);
    const button = getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
