import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAdminEmail,
  isDevelopment,
  isProduction,
  loadAdminConfig,
  loadEmailJSConfig,
  loadSupabaseConfig,
  validateEnv,
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

describe("validateEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws an error naming missing fields when required variables are unset", () => {
    // Ensure required env vars are empty/unset
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");

    expect(() => validateEnv()).toThrowError(/NEXT_PUBLIC_CHECKOUT_CONTRACT_ID/);
    expect(() => validateEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => validateEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("returns populated configuration when all required environment variables are set", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CA1234567890TESTCONTRACTID");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key-123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_abc");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template_xyz");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_789");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@store.org");

    const config = validateEnv();

    expect(config.stellar.checkoutContractId).toBe("CA1234567890TESTCONTRACTID");
    expect(config.supabase.url).toBe("https://project.supabase.co");
    expect(config.supabase.anonKey).toBe("test-anon-key-123");
    expect(config.emailjs.serviceId).toBe("service_abc");
    expect(config.emailjs.templateId).toBe("template_xyz");
    expect(config.emailjs.publicKey).toBe("pubkey_789");
    expect(config.admin.adminEmails).toContain("admin@store.org");
  });
});

describe("loadEmailJSConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports each missing variable with its own error message", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

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
        message: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY is required for email notifications",
      },
    ]);
    expect(config.serviceId).toBe("");
    expect(config.templateId).toBe("");
    expect(config.publicKey).toBe("");
    expect(config.defaultRecipientEmail).toBe("");
  });

  it("counts whitespace-only values as missing and trims valid ones", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "  template_xyz  ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "  ops@store.org  ");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
    expect(config.templateId).toBe("template_xyz");
    expect(config.publicKey).toBe("pubkey_789");
    expect(config.defaultRecipientEmail).toBe("ops@store.org");
  });
});

describe("loadSupabaseConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accumulates one error per missing variable with the Supabase context", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "   ");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

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

  it("returns trimmed values and no errors when both variables are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://project.supabase.co  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "key123");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.url).toBe("https://project.supabase.co");
    expect(config.anonKey).toBe("key123");
  });
});

describe("loadAdminConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims and lowercases entries and drops empty ones", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "  Admin@Store.org ,ops@store.org,, ");
    expect(loadAdminConfig().adminEmails).toEqual([
      "admin@store.org",
      "ops@store.org",
    ]);
  });

  it("returns an empty list for blank or comma-only values", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    expect(loadAdminConfig().adminEmails).toEqual([]);
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", " , ,");
    expect(loadAdminConfig().adminEmails).toEqual([]);
  });

  it("returns an empty list when the variable is unset", () => {
    // vi.stubEnv(name, undefined) stringifies to "undefined", so remove the
    // variable directly to simulate a genuinely unset env (and restore it).
    const saved = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    try {
      expect(loadAdminConfig().adminEmails).toEqual([]);
    } finally {
      if (saved === undefined) delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
      else process.env.NEXT_PUBLIC_ADMIN_EMAILS = saved;
    }
  });
});
