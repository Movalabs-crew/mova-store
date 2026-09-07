import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import SkipLink from "@/components/SkipLink";

/**
 * These two components are wired into `app/layout.jsx`, so they sit above every
 * page in the tree. That makes two things worth locking down: the boundary has
 * to stay invisible while nothing throws, and it has to show the fallback when
 * something does — otherwise a single throwing child blanks the whole app.
 */

function Boom(): React.JSX.Element {
  throw new Error("child exploded");
}

// React logs the caught error itself, which is noise rather than a failure.
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders its children untouched while nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>the page</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("the page")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("shows the fallback when a child throws, instead of unmounting the app", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("prefers a caller-supplied fallback over the default one", () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("hands the error to an onError callback", () => {
    let captured: Error | undefined;
    const onError = vi.fn((error: Error) => {
      captured = error;
    });

    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(captured).toBeInstanceOf(Error);
    expect(captured?.message).toBe("child exploded");
  });

  it("recovers to the children again once the boundary is reset", () => {
    function Flaky({ shouldThrow }: { shouldThrow: boolean }) {
      if (shouldThrow) {
        throw new Error("child exploded");
      }
      return <p>recovered</p>;
    }

    function Harness() {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      return (
        <>
          <button onClick={() => setShouldThrow(false)}>stop throwing</button>
          <ErrorBoundary>
            <Flaky shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Clear the underlying failure, then reset the boundary via its own button.
    fireEvent.click(screen.getByRole("button", { name: /stop throwing/i }));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("recovered")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});

describe("SkipLink", () => {
  it("points at the main content landmark by default", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("stays out of the visual flow until it is focused", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toHaveClass("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
  });

  it("accepts an explicit target", () => {
    render(<SkipLink href="#checkout">Skip to checkout</SkipLink>);

    expect(screen.getByRole("link", { name: /skip to checkout/i })).toHaveAttribute(
      "href",
      "#checkout",
    );
  });
});
