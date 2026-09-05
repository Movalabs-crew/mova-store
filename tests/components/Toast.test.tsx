import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import Toast from "../../components/Toast";
import { Toast as NotificationToast } from "../../components/Notification";

describe("Toast component exit timer cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Toast.jsx", () => {
    it("re-showing a new toast within the exit window (300ms) cancels stale onClose callback", () => {
      const onCloseA = vi.fn();
      const onCloseB = vi.fn();

      const { rerender } = render(
        <Toast message="Message A" show={true} onClose={onCloseA} time={1000} />
      );

      // Fast-forward past time (1000ms), now inside 300ms exit transition
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Re-show Toast B with onCloseB at 1100ms (100ms into the 300ms exit window)
      rerender(<Toast message="Message B" show={true} onClose={onCloseB} time={1000} />);

      // Advance by another 250ms (reaching 1350ms total, which would have fired old exitTimer at 1300ms)
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Old onCloseA was cancelled by cleanup so it shouldn't fire
      expect(onCloseA).not.toHaveBeenCalled();
      // And fresh onCloseB shouldn't be prematurely fired
      expect(onCloseB).not.toHaveBeenCalled();
    });

    it("unmounting mid-exit does not call onClose afterwards", () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <Toast message="Closing Soon" show={true} onClose={onClose} time={1000} />
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        unmount();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Notification.tsx Toast", () => {
    it("re-showing within exit window cancels stale onClose callback", () => {
      const onCloseA = vi.fn();
      const onCloseB = vi.fn();

      const { rerender } = render(
        <NotificationToast message="Notification A" show={true} onClose={onCloseA} time={1000} />
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      rerender(
        <NotificationToast message="Notification B" show={true} onClose={onCloseB} time={1000} />
      );

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(onCloseA).not.toHaveBeenCalled();
      expect(onCloseB).not.toHaveBeenCalled();
    });

    it("unmounting mid-exit does not call onClose afterwards", () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <NotificationToast
          message="Notification Closing"
          show={true}
          onClose={onClose}
          time={1000}
        />
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        unmount();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
