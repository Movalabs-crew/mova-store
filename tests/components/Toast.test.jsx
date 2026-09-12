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
