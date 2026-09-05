import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import Toast from "../../components/Toast";

describe("Toast exit-timer cleanup", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call onClose for a fresh toast shown within the exit window", () => {
    vi.useFakeTimers();
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();

    const { rerender } = render(<Toast message="A" show={true} onClose={onCloseA} time={3000} />);

    // Re-show with new toast B within 300ms exit window
    rerender(<Toast message="B" show={true} onClose={onCloseB} time={3000} />);

    // Advance past the 3000ms display + 300ms exit for A
    vi.advanceTimersByTime(3500);

    // B should still be visible and its onClose should NOT have been called
    expect(onCloseB).not.toHaveBeenCalled();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("does not call onClose after unmounting mid-exit", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    const { unmount } = render(<Toast message="test" show={true} onClose={onClose} time={3000} />);

    // Advance to just before the exit timer fires
    vi.advanceTimersByTime(3100);

    // Unmount while the toast is in its exit phase
    unmount();

    // Advance past the 300ms exit window
    vi.advanceTimersByTime(400);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose after the full display + exit duration when not interrupted", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(<Toast message="test" show={true} onClose={onClose} time={3000} />);

    // Advance past display (3000) + exit (300)
    vi.advanceTimersByTime(3500);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
