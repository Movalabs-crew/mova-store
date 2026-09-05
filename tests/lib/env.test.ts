import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAdminEmail,
  isDevelopment,
  isProduction,
  validateEnv,
  loadEmailJSConfig,
  loadSupabaseConfig,
  loadAdminConfig,
  loadStellarConfig,
  ValidationError,
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

  it("loads valid EmailJS configuration without errors", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_test123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template_test456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_test789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "orders@store.com");

    const errors: ValidationError[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.serviceId).toBe("service_test123");
    expect(config.templateId).toBe("template_test456");
    expect(config.publicKey).toBe("pubkey_test789");
    expect(config.defaultRecipientEmail).toBe("orders@store.com");
  });

  it("records validation errors when required EmailJS fields are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "");

    const errors: ValidationError[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(3);
    expect(errors).toEqual([
      {
        field: "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
        message: "NEXT_PUBLIC_EMAILJS_SERVICE_ID is required for email notifications",
      },
      {
        field: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
        message: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID is required for email notifications",
      },
      {
        field: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
        message: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY is required for email notifications",
      },
    ]);
    expect(config.defaultRecipientEmail).toBe("");
  });

  it("treats whitespace-only values as missing and trims non-empty values", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "  template_trimmed  ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "\t\n  ");

    const errors: ValidationError[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(2);
    expect(errors[0].field).toBe("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
    expect(errors[1].field).toBe("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");
    expect(config.templateId).toBe("template_trimmed");
  });
});

describe("loadSupabaseConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads valid Supabase configuration without errors", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-xyz");

    const errors: ValidationError[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.url).toBe("https://xyz.supabase.co");
    expect(config.anonKey).toBe("anon-key-xyz");
  });

  it("records validation errors when required Supabase fields are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const errors: ValidationError[] = [];
    loadSupabaseConfig(errors);

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
  });

  it("treats whitespace-only values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "  \n\t ");

    const errors: ValidationError[] = [];
    loadSupabaseConfig(errors);

    expect(errors).toHaveLength(2);
  });
});

describe("loadAdminConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims and lowercases email entries and removes empty items", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ADMIN_EMAILS",
      "  Admin1@Store.com , ADMIN2@STORE.COM, , superadmin@mova.org "
    );

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([
      "admin1@store.com",
      "admin2@store.com",
      "superadmin@mova.org",
    ]);
  });

  it("returns empty array for empty, whitespace, or comma-only strings", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    expect(loadAdminConfig().adminEmails).toEqual([]);

    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "   ");
    expect(loadAdminConfig().adminEmails).toEqual([]);

    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", ",,,  , , ");
    expect(loadAdminConfig().adminEmails).toEqual([]);
  });
});

describe("loadStellarConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads valid testnet defaults and requires checkoutContractId", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CA12345");

    const errors: ValidationError[] = [];
    const config = loadStellarConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.network).toBe("testnet");
    expect(config.checkoutContractId).toBe("CA12345");
    expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org");
  });

  it("records an error when checkoutContractId is missing or whitespace", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "   ");

    const errors: ValidationError[] = [];
    loadStellarConfig(errors);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      field: "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
      message: "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID is required for Stellar payments",
    });
  });
});
