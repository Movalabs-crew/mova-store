import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, authState } = vi.hoisted(() => ({
  push: vi.fn(),
  authState: {
    current: {
      user: null as { email?: string } | null,
      loading: false,
      isAdmin: false,
      isAuthenticated: false,
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => "/admin",
}));

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => authState.current,
}));

import AdminGuard from "../../components/AdminGuard";

describe("AdminGuard", () => {
  beforeEach(() => {
    push.mockClear();
    authState.current = {
      user: null,
      loading: false,
      isAdmin: false,
      isAuthenticated: false,
    };
  });

  it("shows the loading state while the session is still resolving", () => {
    authState.current = { user: null, loading: true, isAdmin: false, isAuthenticated: false };

    render(
      <AdminGuard>
        <p>secret</p>
      </AdminGuard>
    );

    expect(screen.getByText("Checking access...")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    // Redirecting mid-load would bounce a legitimate admin to the login page.
    expect(push).not.toHaveBeenCalled();
  });

  it("sends unauthenticated visitors to the login page with a return path", () => {
    render(
      <AdminGuard>
        <p>secret</p>
      </AdminGuard>
    );

    expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Login" })).toHaveAttribute(
      "href",
      "/profile/login?redirect=/admin"
    );
    expect(push).toHaveBeenCalledWith("/profile/login?redirect=/admin");
  });

  it("honours a custom redirectTo", () => {
    render(
      <AdminGuard redirectTo="/custom/login">
        <p>secret</p>
      </AdminGuard>
    );

    expect(push).toHaveBeenCalledWith("/custom/login?redirect=/admin");
    expect(screen.getByRole("link", { name: "Go to Login" })).toHaveAttribute(
      "href",
      "/custom/login?redirect=/admin"
    );
  });

  it("denies signed-in users who are not admins", () => {
    authState.current = {
      user: { email: "someone@example.com" },
      loading: false,
      isAdmin: false,
      isAuthenticated: true,
    };

    render(
      <AdminGuard>
        <p>secret</p>
      </AdminGuard>
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText("someone@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Browse Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("renders the guarded content for an admin", () => {
    authState.current = {
      user: { email: "admin@example.com" },
      loading: false,
      isAdmin: true,
      isAuthenticated: true,
    };

    render(
      <AdminGuard>
        <p>secret admin tools</p>
      </AdminGuard>
    );

    expect(screen.getByText("secret admin tools")).toBeInTheDocument();
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
