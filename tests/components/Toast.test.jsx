import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import Toast from "../../components/Toast";

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast exit-timer cleanup", () => {
  it("calls onClose after the show duration plus the 300ms exit", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { container } = render(
      <Toast message="A" show time={1000} onClose={onClose} />
    );

    expect(container.firstChild.className).toContain("opacity-100");
    act(() => {
      vi.advanceTimersByTime(1000 + 299);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not fire the stale exit timer after a re-show within 300ms", () => {
    vi.useFakeTimers();
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const { container, rerender } = render(
      <Toast message="A" show time={1000} onClose={onCloseA} />
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    }); // A starts its 300ms exit
    expect(container.firstChild.className).toContain("opacity-0");

    // A new toast is re-shown inside the exit window (fresh onClose identity,
    // as the Navbar produces on every render).
    rerender(<Toast message="B" show time={1000} onClose={onCloseB} />);
    expect(container.firstChild.className).toContain("opacity-100");

    act(() => {
      vi.advanceTimersByTime(300);
    }); // A's stale exit point
    expect(onCloseA).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000 + 300);
    }); // B's own lifecycle completes
    expect(onCloseB).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose after unmounting mid-exit", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { unmount } = render(
      <Toast message="A" show time={1000} onClose={onClose} />
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    }); // exit timer is now pending
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
