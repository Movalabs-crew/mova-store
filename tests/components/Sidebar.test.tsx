import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import Sidebar from "../../components/Sidebar";

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Modal component
vi.mock("../../components/Modal", () => ({
  default: ({ show, children }: { show: boolean; children: React.ReactNode }) =>
    show ? <div data-testid="modal">{children}</div> : null,
}));

describe("Sidebar component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Admin links on desktop and mobile when isAdmin is true", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "random-user-123", email: "admin@test.com" },
      isAdmin: true,
      loading: false,
    });

    render(<Sidebar />);

    const adminLinks = screen.getAllByRole("link", { name: /admin/i });
    expect(adminLinks.length).toBe(2);
    expect(adminLinks[0]).toHaveAttribute("href", "/admin");
    expect(adminLinks[1]).toHaveAttribute("href", "/admin");
  });

  it("points every link at a route that exists under app/", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "random-user-123", email: "admin@test.com" },
      isAdmin: true,
      loading: false,
    });

    render(<Sidebar />);

    // Every directory under app/ that has a page file. A sidebar href outside
    // this set renders the not-found page when clicked.
    const realRoutes = new Set([
      "/",
      "/shop",
      "/collections",
      "/checkout",
      "/blog",
      "/orders",
      "/admin",
      "/admin/orders",
      "/profile/login",
      "/profile/orders",
    ]);

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");

    expect(hrefs.length).toBeGreaterThan(0);
    const dead = hrefs.filter((href) => !realRoutes.has(href));
    expect(dead).toEqual([]);
  });

  it("labels each entry with the destination it actually navigates to", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /shop/i })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: /collections/i })).toHaveAttribute("href", "/collections");
  });

  it("does not render Admin links when isAdmin is false even with legacy UID", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "SvGyqjTVt4XgGLsGSzC0amUzC0M2", email: "user@test.com" },
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    const adminLinks = screen.queryAllByRole("link", { name: /admin/i });
    expect(adminLinks.length).toBe(0);
  });

  it("does not render Admin links for unauthenticated/guest users", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    const adminLinks = screen.queryAllByRole("link", { name: /admin/i });
    expect(adminLinks.length).toBe(0);
  });

  it("does not render inert search input or search modal", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    expect(screen.queryByPlaceholderText("Search Shoes")).not.toBeInTheDocument();
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });
});

