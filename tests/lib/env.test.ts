import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadEmailJSConfig,
  loadSupabaseConfig,
  loadAdminConfig,
  validateEnv,
} from "../../lib/env";

describe("loadEmailJSConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws errors for each missing required field", () => {
    const errors: { field: string; message: string }[] = [];
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");

    loadEmailJSConfig(errors);
    expect(errors).toHaveLength(3);
    expect(errors.some((e) => e.field === "NEXT_PUBLIC_EMAILJS_SERVICE_ID")).toBe(true);
    expect(errors.some((e) => e.field === "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID")).toBe(true);
    expect(errors.some((e) => e.field === "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY")).toBe(true);
  });

  it("loads successfully when all required fields are set", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_789");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.serviceId).toBe("svc_123");
    expect(config.templateId).toBe("tmpl_456");
    expect(config.publicKey).toBe("pub_789");
  });

  it("leaves defaultRecipientEmail undefined when not set", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_789");

    const config = loadEmailJSConfig([]);
    expect(config.defaultRecipientEmail).toBeUndefined();
  });

  it("allows optional defaultRecipientEmail when set", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "help@store.org");

    const config = loadEmailJSConfig([]);
    expect(config.defaultRecipientEmail).toBe("help@store.org");
  });

  it("treats whitespace-only required values as missing", () => {
    const errors: { field: string; message: string }[] = [];
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_789");

    loadEmailJSConfig(errors);
    expect(errors.some((e) => e.field === "NEXT_PUBLIC_EMAILJS_SERVICE_ID")).toBe(true);
  });
});

describe("loadSupabaseConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws errors for each missing required field", () => {
    const errors: { field: string; message: string }[] = [];
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    loadSupabaseConfig(errors);
    expect(errors).toHaveLength(2);
    expect(errors.some((e) => e.field === "NEXT_PUBLIC_SUPABASE_URL")).toBe(true);
    expect(errors.some((e) => e.field === "NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBe(true);
  });

  it("loads successfully when all required fields are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://myproject.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.url).toBe("https://myproject.supabase.co");
    expect(config.anonKey).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });

  it("trims whitespace from values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://myproject.supabase.co  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "  key123  ");

    const config = loadSupabaseConfig([]);
    expect(config.url).toBe("https://myproject.supabase.co");
    expect(config.anonKey).toBe("key123");
  });
});

describe("loadAdminConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims and lowercases admin emails", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "  Admin@Test.Com  ,  MOD@TEST.COM  ");

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual(["admin@test.com", "mod@test.com"]);
  });

  it("drops empty entries", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "a@b.com,,  ,c@d.com");

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual(["a@b.com", "c@d.com"]);
  });

  it("returns empty array for blank string", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([]);
  });

  it("returns empty array for comma-only string", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", ",,,");

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "   ");

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([]);
  });
});

describe("validateEnv — error accumulation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("collects errors from multiple missing loaders", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc_ok");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_ok");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_ok");

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("whitespace-only values are treated as missing in validateEnv", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CA123");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "key123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_789");

    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
