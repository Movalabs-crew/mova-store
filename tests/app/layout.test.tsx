import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import RootLayout from "@/app/layout";

/**
 * `app/layout.jsx` imported `ErrorBoundary` but never rendered it, so no route
 * had render-error protection and a single throwing child could blank the whole
 * app. These tests lock the boundary into the layout: the children still render
 * normally, and a route-level throw shows the fallback instead of unmounting
 * everything.
 */

vi.mock("next/font/google", () => ({
  Syne: () => ({ variable: "font-syne" }),
  Manrope: () => ({ variable: "font-manrope" }),
}));

vi.mock("nextjs-toploader", () => ({ default: () => null }));

vi.mock("next/head", () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/lib/AuthContext", () => ({
  AuthProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/Whatsapp", () => ({ default: () => null }));
vi.mock("@/components/ScrollToTop", () => ({ default: () => null }));

function Boom(): React.JSX.Element {
  throw new Error("route exploded");
}

beforeEach(() => {
  // React logs the caught error and the <html>/<body> nesting warning; both are
  // noise for these assertions rather than failures.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("app/layout.jsx", () => {
  it("renders the route children inside the main landmark", () => {
    render(
      <RootLayout>
        <p>the page</p>
      </RootLayout>
    );

    expect(screen.getByText("the page")).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByText("the page"));
  });

  it("shows the ErrorBoundary fallback when a route child throws", () => {
    render(
      <RootLayout>
        <Boom />
      </RootLayout>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not render a blank page when a route child throws", () => {
    const { container } = render(
      <RootLayout>
        <Boom />
      </RootLayout>
    );

    // The app shell must survive: the main landmark is still mounted and the
    // fallback content is visible inside it.
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(container.textContent).not.toBe("");
  });
});
