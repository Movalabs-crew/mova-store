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

  it("only links to real routes and does not contain broken links to /about, /contact, or /categories", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    const { container } = render(<Sidebar />);
    const links = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );

    const brokenRoutes = ["/about", "/contact", "/categories"];
    brokenRoutes.forEach((route) => {
      expect(links).not.toContain(route);
    });

    const validRoutes = ["/", "/shop", "/collections", "/blog"];
    links.forEach((href) => {
      expect(validRoutes).toContain(href);
    });
  });

  it("matches entry labels to their corresponding destinations", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    const homeLinks = screen.getAllByRole("link", { name: "Home" });
    expect(homeLinks.length).toBeGreaterThan(0);
    homeLinks.forEach((link) => expect(link).toHaveAttribute("href", "/"));

    const shopLinks = screen.getAllByRole("link", { name: "Shop" });
    expect(shopLinks.length).toBeGreaterThan(0);
    shopLinks.forEach((link) => expect(link).toHaveAttribute("href", "/shop"));

    const collectionLinks = screen.getAllByRole("link", { name: "Collections" });
    expect(collectionLinks.length).toBeGreaterThan(0);
    collectionLinks.forEach((link) =>
      expect(link).toHaveAttribute("href", "/collections")
    );

    const blogLinks = screen.getAllByRole("link", { name: "Blog" });
    expect(blogLinks.length).toBeGreaterThan(0);
    blogLinks.forEach((link) => expect(link).toHaveAttribute("href", "/blog"));
  });
});

