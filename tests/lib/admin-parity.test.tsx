import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../lib/AuthContext";
import { isAdminEmail } from "../../lib/env";
import { supabase } from "../../lib/supabase";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

function stubSession(email: string, appMetadata: Record<string, unknown> = {}) {
  (supabase.auth.getSession as any).mockResolvedValue({
    data: {
      session: {
        user: {
          id: "parity-user",
          email,
          user_metadata: { full_name: "Parity User" },
          app_metadata: appMetadata,
        },
      },
    },
  });
}

describe("admin authorization parity (single source of truth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["admin@test.com", "ADMIN@TEST.COM", "admin2@test.com", "buyer@example.com"])(
    "agrees with the shared isAdminEmail helper for %s",
    async (email) => {
      stubSession(email);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(isAdminEmail(email));
    }
  );

  it("treats the server claim as the source of truth when it is present", async () => {
    stubSession("buyer@example.com", { is_admin: true });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    // The email is not in the whitelist; only the server claim grants access.
    expect(isAdminEmail("buyer@example.com")).toBe(false);
  });
});
