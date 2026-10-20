import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Hero from "../../app/(landingpage)/Hero";

// Stub the auth context the same way tests/components/sidebar.test.tsx does, so
// the CTA can be rendered in both the signed-out and signed-in states.
const mockUseAuth = vi.fn();
vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Hero primary call to action (#585)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("points the signed-out CTA at the login route instead of a placeholder", () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<Hero />);

    const cta = screen.getByRole("link", { name: /shop now/i });
    expect(cta).toHaveAttribute("href", "/profile/login");
    expect(cta).not.toHaveAttribute("href", "#");
  });

  it("points the signed-in CTA at the shop", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });

    render(<Hero />);

    expect(screen.getByRole("link", { name: /shop now/i })).toHaveAttribute("href", "/shop");
  });

  it("does not cancel the anchor's own navigation when clicked while signed out", () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<Hero />);

    // `fireEvent.click` reports false when a handler called preventDefault, so a
    // true result proves the href is still free to navigate on its own — which
    // is what makes the link work before hydration.
    const cta = screen.getByRole("link", { name: /shop now/i });
    expect(fireEvent.click(cta)).toBe(true);
  });

  it("does not cancel the anchor's own navigation when clicked while signed in", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });

    render(<Hero />);

    const cta = screen.getByRole("link", { name: /shop now/i });
    expect(fireEvent.click(cta)).toBe(true);
  });

  it("still nudges a signed-out visitor to log in", () => {
    mockUseAuth.mockReturnValue({ user: null });

    render(<Hero />);

    fireEvent.click(screen.getByRole("link", { name: /shop now/i }));

    expect(screen.getByText("Kindly login first")).toBeInTheDocument();
  });

  it("never renders a dead hash link in the hero", () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { container } = render(<Hero />);

    expect(container.querySelector('a[href="#"]')).toBeNull();
  });
});
