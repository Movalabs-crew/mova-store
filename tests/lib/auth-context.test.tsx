import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabase";

// Mock supabase module
vi.mock("../../lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
    },
    default: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
    },
  };
});

// Test consumer component
function TestConsumer() {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "loaded"}</div>
      <div data-testid="authenticated">{isAuthenticated ? "authenticated" : "unauthenticated"}</div>
      <div data-testid="is-admin">{isAdmin ? "admin" : "not-admin"}</div>
      <div data-testid="user-id">{user?.id || "no-id"}</div>
      <div data-testid="user-email">{user?.email || "no-email"}</div>
      <div data-testid="user-name">{user?.displayName || "no-name"}</div>
    </div>
  );
}

describe("AuthProvider lifecycle & session tests (Issue #95)", () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>;
  let authStateCallback: ((event: string, session: any) => void) | null = null;
  let getSessionResolve: ((value: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeMock = vi.fn();
    authStateCallback = null;
    getSessionResolve = null;

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });
  });

  it("starts with loading true and flips to false when getSession resolves", async () => {
    let resolveSession: any;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    vi.mocked(supabase.auth.getSession).mockReturnValue(sessionPromise as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Initial state: loading is true, not authenticated
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("unauthenticated");

    // Resolve getSession with a valid user
    await act(async () => {
      resolveSession({
        data: {
          session: {
            user: {
              id: "user-123",
              email: "test@example.com",
              user_metadata: {
                full_name: "Test User",
              },
            },
          },
        },
      });
    });

    // Loading should flip to false, authenticated true, user details populated
    expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("user-id")).toHaveTextContent("user-123");
    expect(screen.getByTestId("user-email")).toHaveTextContent("test@example.com");
    expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("not-admin");
  });

  it("recognizes admin users based on NEXT_PUBLIC_ADMIN_EMAILS whitelist", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: {
            id: "admin-456",
            email: "admin@test.com",
            user_metadata: {
              name: "Admin User",
            },
          },
        },
      },
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("admin");
    expect(screen.getByTestId("user-email")).toHaveTextContent("admin@test.com");
  });

  it("handles null session on getSession resolution", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: null,
      },
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("unauthenticated");
    expect(screen.getByTestId("user-id")).toHaveTextContent("no-id");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("not-admin");
  });

  it("updates user state on onAuthStateChange events and clears on SIGNED_OUT", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: null,
      },
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
    });
    expect(screen.getByTestId("authenticated")).toHaveTextContent("unauthenticated");

    // Simulate SIGNED_IN event from auth listener
    expect(authStateCallback).toBeTypeOf("function");
    await act(async () => {
      authStateCallback!("SIGNED_IN", {
        user: {
          id: "new-user-789",
          email: "signedin@example.com",
          user_metadata: {
            display_name: "Signed In User",
          },
        },
      });
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("user-id")).toHaveTextContent("new-user-789");
    expect(screen.getByTestId("user-email")).toHaveTextContent("signedin@example.com");
    expect(screen.getByTestId("user-name")).toHaveTextContent("Signed In User");

    // Simulate SIGNED_OUT event
    await act(async () => {
      authStateCallback!("SIGNED_OUT", null);
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("unauthenticated");
    expect(screen.getByTestId("user-id")).toHaveTextContent("no-id");
    expect(screen.getByTestId("user-email")).toHaveTextContent("no-email");
    expect(screen.getByTestId("is-admin")).toHaveTextContent("not-admin");
  });

  it("unsubscribes from onAuthStateChange on unmount", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: null,
      },
    } as any);

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(unsubscribeMock).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
