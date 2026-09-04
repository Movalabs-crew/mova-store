import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NotificationProvider, useNotification } from "../../components/Notification";

afterEach(() => {
  vi.useRealTimers();
});

let addedId: string | null = null;

function Probe() {
  const { addNotification, removeNotification } = useNotification();
  return (
    <div>
      <button
        onClick={() =>
          (addedId = addNotification({
            type: "success",
            message: "payment received",
            duration: 2000,
          }))
        }
      >
        add
      </button>
      <button onClick={() => addedId && removeNotification(addedId)}>
        remove
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <NotificationProvider>
      <Probe />
    </NotificationProvider>
  );
}

describe("NotificationProvider auto-removal timers", () => {
  it("auto-removes a notification after its configured duration", () => {
    vi.useFakeTimers();
    renderProbe();
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByRole("alert")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("manual removal cancels the pending auto-removal", () => {
    vi.useFakeTimers();
    renderProbe();
    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("remove"));
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(10000);
    }); // no stale timer left to act on
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("unmounting mid-auto-removal does not fire pending timers afterwards", () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderProbe();
    fireEvent.click(screen.getByText("add"));

    act(() => {
      vi.advanceTimersByTime(1000);
    }); // half way through the 2000ms duration
    unmount();
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
