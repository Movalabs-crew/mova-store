import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import Toast from "../../components/Toast";

const advance = (milliseconds) => act(() => vi.advanceTimersByTime(milliseconds));

describe("Toast display and exit timers", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each([3000, 1000])("waits %i ms before exiting, then closes after 300 ms", (time) => {
    const onClose = vi.fn();
    render(<Toast message="Saved" show={true} onClose={onClose} time={time} />);

    advance(time - 1);
    expect(screen.getByText("Saved")).toHaveClass("translate-x-0", "opacity-100");
    expect(onClose).not.toHaveBeenCalled();

    advance(1);
    expect(screen.getByText("Saved")).toHaveClass("translate-x-full", "opacity-0");
    expect(onClose).not.toHaveBeenCalled();

    advance(299);
    expect(onClose).not.toHaveBeenCalled();
    advance(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    advance(time);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cancels the old exit when a new message uses the same close callback", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Toast message="A" show={true} onClose={onClose} />);

    advance(3100);
    rerender(<Toast message="B" show={true} onClose={onClose} />);
    advance(200);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("B")).toHaveClass("opacity-100");

    advance(2800);
    expect(screen.getByText("B")).toHaveClass("opacity-0");
    expect(onClose).not.toHaveBeenCalled();
    advance(300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cancels the previous callback when the callback changes during exit", () => {
    const previousClose = vi.fn();
    const nextClose = vi.fn();
    const { rerender } = render(<Toast message="Saved" show={true} onClose={previousClose} />);

    advance(3100);
    rerender(<Toast message="Saved" show={true} onClose={nextClose} />);
    advance(200);
    expect(previousClose).not.toHaveBeenCalled();
    expect(nextClose).not.toHaveBeenCalled();

    advance(3100);
    expect(previousClose).not.toHaveBeenCalled();
    expect(nextClose).toHaveBeenCalledTimes(1);
  });

  it.each([1000, 3100])("cancels pending callbacks when hidden at %i ms", (elapsed) => {
    const onClose = vi.fn();
    const { rerender } = render(<Toast message="Saved" show={true} onClose={onClose} />);

    advance(elapsed);
    rerender(<Toast message="Saved" show={false} onClose={onClose} />);
    advance(4000);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Saved")).toHaveClass("opacity-0");
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([1000, 3100])("cleans up both timers when unmounted at %i ms", (elapsed) => {
    const onClose = vi.fn();
    const { unmount } = render(<Toast message="Saved" show={true} onClose={onClose} />);

    advance(elapsed);
    unmount();
    advance(4000);
    expect(onClose).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Toast dismiss control accessibility (#594)", () => {
  afterEach(() => cleanup());

  it("exposes a programmatic name and hides the glyph from assistive tech", () => {
    render(<Toast message="Saved" show={true} onClose={() => {}} />);

    // The control is reachable by its accessible name, not by the "✕" symbol.
    const dismiss = screen.getByRole("button", { name: "Dismiss notification" });
    expect(dismiss).toBeTruthy();

    // The visible glyph is decorative, so it must not be announced verbatim.
    expect(screen.getByText("✕")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Toast accessibility live region (Issue #593)", () => {
  afterEach(cleanup);

  it("announces status messages politely and atomically", () => {
    render(<Toast message="Item added to cart" show={true} onClose={vi.fn()} />);

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Item added to cart");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("announces error messages assertively", () => {
    render(<Toast message="Payment failed" show={true} onClose={vi.fn()} variant="error" />);

    const region = screen.getByRole("alert");
    expect(region).toHaveTextContent("Payment failed");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("keeps the live region mounted while hidden so later updates are announced", () => {
    render(<Toast message="Saved" show={false} onClose={vi.fn()} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
