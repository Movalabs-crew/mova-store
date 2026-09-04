import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAdminEmail,
  isDevelopment,
  isProduction,
  loadAdminConfig,
  loadEmailJSConfig,
  loadSupabaseConfig,
} from "../../lib/env";

describe("isAdminEmail", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for admin emails", () => {
    expect(isAdminEmail("admin@test.com")).toBe(true);
    expect(isAdminEmail("admin2@test.com")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isAdminEmail("ADMIN@TEST.COM")).toBe(true);
    expect(isAdminEmail("Admin@Test.Com")).toBe(true);
  });

  it("returns false for non-admin emails", () => {
    expect(isAdminEmail("user@test.com")).toBe(false);
    expect(isAdminEmail("notadmin@test.com")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("handles empty admin list", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });
});

describe("isDevelopment", () => {
  it("returns true in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevelopment()).toBe(true);
  });

  it("returns false in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevelopment()).toBe(false);
  });
});

describe("isProduction", () => {
  it("returns true in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(true);
  });

  it("returns false in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isProduction()).toBe(false);
  });
});

describe("loadEmailJSConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accumulates an error per missing required field", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(3);
    expect(errors).toEqual([
      {
        field: "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
        message:
          "NEXT_PUBLIC_EMAILJS_SERVICE_ID is required for email notifications",
      },
      {
        field: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
        message:
          "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID is required for email notifications",
      },
      {
        field: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
        message:
          "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY is required for email notifications",
      },
    ]);
    expect(config.serviceId).toBe("");
    expect(config.templateId).toBe("");
    expect(config.publicKey).toBe("");
    expect(config.defaultRecipientEmail).toBeUndefined();
  });

  it("treats whitespace-only required values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "\t");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "  \n  ");

    const errors: { field: string; message: string }[] = [];
    loadEmailJSConfig(errors);

    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.field)).toEqual([
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
    ]);
    expect(
      errors.every((e) =>
        e.message.includes("is required for email notifications")
      )
    ).toBe(true);
  });

  it("returns trimmed values and no errors when required fields are set", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "  svc_123  ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", " tpl_456 ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pk_789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "  shop@example.com  ");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config).toEqual({
      serviceId: "svc_123",
      templateId: "tpl_456",
      publicKey: "pk_789",
      defaultRecipientEmail: "shop@example.com",
    });
  });

  it("leaves defaultRecipientEmail undefined when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tpl");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pk");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.defaultRecipientEmail).toBeUndefined();
  });

  it("leaves defaultRecipientEmail undefined when whitespace-only", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "svc");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tpl");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pk");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "   ");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.defaultRecipientEmail).toBeUndefined();
  });
});

describe("loadSupabaseConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accumulates an error per missing required field", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(2);
    expect(errors).toEqual([
      {
        field: "NEXT_PUBLIC_SUPABASE_URL",
        message: "NEXT_PUBLIC_SUPABASE_URL is required for Supabase",
      },
      {
        field: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Supabase",
      },
    ]);
    expect(config.url).toBe("");
    expect(config.anonKey).toBe("");
  });

  it("treats whitespace-only required values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "\t\t");

    const errors: { field: string; message: string }[] = [];
    loadSupabaseConfig(errors);

    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.field)).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    expect(errors.map((e) => e.message)).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL is required for Supabase",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Supabase",
    ]);
  });

  it("returns trimmed values and no errors when required fields are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://proj.supabase.co  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", " anon_key_value ");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config).toEqual({
      url: "https://proj.supabase.co",
      anonKey: "anon_key_value",
    });
  });
});

describe("loadAdminConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims and lowercases admin emails", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ADMIN_EMAILS",
      "  Admin@Test.COM , USER@example.com  "
    );

    expect(loadAdminConfig()).toEqual({
      adminEmails: ["admin@test.com", "user@example.com"],
    });
  });

  it("drops empty entries", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,, ,admin2@test.com");

    expect(loadAdminConfig().adminEmails).toEqual([
      "admin@test.com",
      "admin2@test.com",
    ]);
  });

  it("returns an empty list for a blank string", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    expect(loadAdminConfig().adminEmails).toEqual([]);
  });

  it("returns an empty list for comma-only strings", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", ", , ,");
    expect(loadAdminConfig().adminEmails).toEqual([]);
  });
});
