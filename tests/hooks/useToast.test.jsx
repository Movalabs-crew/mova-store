import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "@/hooks/useToast";

describe("useToast", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows a message and auto-hides after the configured duration", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(3000));

    act(() => result.current.showToast("Item added to cart"));
    expect(result.current.toast).toEqual({
      show: true,
      message: "Item added to cart",
    });

    act(() => vi.advanceTimersByTime(2999));
    expect(result.current.toast.show).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toast).toEqual({ show: false, message: "" });
  });

  it("clears the pending timer on unmount so no state update fires afterwards", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useToast(3000));

    act(() => result.current.showToast("hi"));
    unmount();
    act(() => vi.advanceTimersByTime(5000));

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("hideToast dismisses immediately and cancels the pending auto-hide", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(3000));

    act(() => result.current.showToast("hi"));
    act(() => result.current.hideToast());
    expect(result.current.toast).toEqual({ show: false, message: "" });

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.toast).toEqual({ show: false, message: "" });
  });

  it("restarting showToast resets the timer instead of firing the stale one", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(3000));

    act(() => result.current.showToast("first"));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.showToast("second"));

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.toast).toEqual({
      show: true,
      message: "second",
    });

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.toast).toEqual({ show: false, message: "" });
  });
});
