import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "../../hooks/useToast";

describe("useToast hook (Issue #31)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with toast hidden and empty message", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toast).toEqual({ show: false, message: "" });
  });

  it("shows toast with provided message and auto-hides after specified delay", () => {
    const { result } = renderHook(() => useToast(3000));

    act(() => {
      result.current.showToast("Item added successfully");
    });

    expect(result.current.toast).toEqual({
      show: true,
      message: "Item added successfully",
    });

    // Advance halfway: toast still visible
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.toast.show).toBe(true);

    // Advance remaining time: toast auto-hides
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.toast).toEqual({ show: false, message: "" });
  });

  it("hideToast immediately dismisses toast and cancels pending auto-hide timer", () => {
    const { result } = renderHook(() => useToast(3000));

    act(() => {
      result.current.showToast("Temporary alert");
    });
    expect(result.current.toast.show).toBe(true);

    act(() => {
      result.current.hideToast();
    });
    expect(result.current.toast).toEqual({ show: false, message: "" });

    // Advancing timers should not cause any issues
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.toast.show).toBe(false);
  });

  it("consecutive showToast calls reset the auto-hide timer with the latest message", () => {
    const { result } = renderHook(() => useToast(3000));

    act(() => {
      result.current.showToast("First message");
    });
    expect(result.current.toast.message).toBe("First message");

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Fire second toast
    act(() => {
      result.current.showToast("Second message");
    });
    expect(result.current.toast).toEqual({
      show: true,
      message: "Second message",
    });

    // Advance another 2 seconds (4 seconds total since first toast, 2s since second)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Second toast must still be visible!
    expect(result.current.toast.show).toBe(true);
    expect(result.current.toast.message).toBe("Second message");

    // Advance remaining 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.toast.show).toBe(false);
  });

  it("cleans up pending timer on unmount to prevent state updates on unmounted component", () => {
    const { result, unmount } = renderHook(() => useToast(5000));

    act(() => {
      result.current.showToast("Unmount test");
    });
    expect(result.current.toast.show).toBe(true);

    // Unmount before timer finishes
    unmount();

    // Fast-forward time past the 5s timer
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(6000);
      });
    }).not.toThrow();
  });
});
