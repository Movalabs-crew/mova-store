import { describe, it, expect, vi } from "vitest";
import {
  SESSION_COOKIE,
  parseAdminEmails,
  isAdminEmail,
  readCookie,
  authorizeAdminRequest,
  gateResponseFor,
} from "../../lib/admin-auth";
import { setSessionCookie, clearSessionCookie } from "../../lib/session-cookie";

const SUPABASE_URL = "https://dummy.supabase.co";
const ANON_KEY = "dummy_anon_key";
const ADMIN_LIST = "admin@test.com,admin2@test.com";

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe("admin authorization (server-side gate) (#489)", () => {
  describe("allow-list helpers", () => {
    it("normalises and trims the comma-separated list", () => {
      expect(parseAdminEmails(" Admin@Test.com , second@test.com ")).toEqual([
        "admin@test.com",
        "second@test.com",
      ]);
    });

    it("matches emails case-insensitively and fails closed", () => {
      expect(isAdminEmail("ADMIN@test.com", ADMIN_LIST)).toBe(true);
      expect(isAdminEmail("intruder@test.com", ADMIN_LIST)).toBe(false);
      expect(isAdminEmail("", ADMIN_LIST)).toBe(false);
      expect(isAdminEmail(null, "")).toBe(false);
    });
  });

  describe("cookie parsing", () => {
    it("extracts the session cookie and ignores unrelated cookies", () => {
      const header = `theme=dark; ${SESSION_COOKIE}=a.b.c; other=1`;
      expect(readCookie(header, SESSION_COOKIE)).toBe("a.b.c");
      expect(readCookie(header, "missing")).toBeNull();
      expect(readCookie(null, SESSION_COOKIE)).toBeNull();
    });

    it("decodes percent-encoded token values", () => {
      expect(readCookie(`${SESSION_COOKIE}=a%20b`, SESSION_COOKIE)).toBe("a b");
    });
  });

  describe("authorizeAdminRequest", () => {
    it("denies a request with no session cookie", async () => {
      const fetchImpl = vi.fn();

      const result = await authorizeAdminRequest({
        cookieHeader: null,
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        adminEmails: ADMIN_LIST,
        fetchImpl,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("unauthenticated");
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("denies a token Supabase rejects", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(401, { message: "invalid token" }));

      const result = await authorizeAdminRequest({
        cookieHeader: `${SESSION_COOKIE}=revoked`,
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        adminEmails: ADMIN_LIST,
        fetchImpl,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("unauthenticated");
    });

    it("denies an authenticated non-admin", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { email: "intruder@test.com" }));

      const result = await authorizeAdminRequest({
        cookieHeader: `${SESSION_COOKIE}=valid`,
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        adminEmails: ADMIN_LIST,
        fetchImpl,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("forbidden");
      expect(result.email).toBe("intruder@test.com");
    });

    it("allows a verified admin, whatever the email casing", async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { email: "Admin@TEST.com" }));

      const result = await authorizeAdminRequest({
        cookieHeader: `${SESSION_COOKIE}=valid`,
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        adminEmails: ADMIN_LIST,
        fetchImpl,
      });

      expect(result.allowed).toBe(true);
      expect(result.email).toBe("Admin@TEST.com");
    });

    it("fails closed when the verification call throws", async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error("network down");
      });

      const result = await authorizeAdminRequest({
        cookieHeader: `${SESSION_COOKIE}=valid`,
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        adminEmails: ADMIN_LIST,
        fetchImpl,
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe("gate decision", () => {
    it("sends a denied admin navigation to the login page with the original path", () => {
      const gate = gateResponseFor({
        allowed: false,
        reason: "forbidden",
        pathname: "/admin/orders",
        search: "?page=2",
      });

      expect(gate.allowed).toBe(false);
      expect(gate.redirectTo).toContain("/profile/login?");
      expect(gate.redirectTo).toContain("redirect=%2Fadmin%2Forders%3Fpage%3D2");
      expect(gate.redirectTo).toContain("reason=forbidden");
    });

    it("lets an allowed request through without a redirect", () => {
      const gate = gateResponseFor({
        allowed: true,
        reason: "admin",
        pathname: "/admin",
        search: "",
      });

      expect(gate).toEqual({ allowed: true, redirectTo: null });
    });
  });

  describe("client cookie mirror", () => {
    it("writes and clears the session cookie via document.cookie", () => {
      setSessionCookie("a.b.c");
      expect(document.cookie).toContain(`${SESSION_COOKIE}=a.b.c`);

      clearSessionCookie();
      expect(document.cookie).not.toContain(`${SESSION_COOKIE}=a.b.c`);
    });
  });
});
