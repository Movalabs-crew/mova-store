import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../../components/Sidebar";

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/",
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

  it("handles search input submit and navigates to shop with query parameter", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    const searchInput = screen.getByRole("textbox", { name: /search shoes/i });
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "Air Max" } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/shop?search=Air%20Max");
  });

  it("navigates to /shop when search is submitted empty", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(<Sidebar />);

    const searchInput = screen.getByRole("textbox", { name: /search shoes/i });
    fireEvent.change(searchInput, { target: { value: "   " } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(mockPush).toHaveBeenCalledWith("/shop");
  });
});
