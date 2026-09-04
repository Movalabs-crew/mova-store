import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAdminEmail,
  isDevelopment,
  isProduction,
  loadStellarConfig,
  loadEmailJSConfig,
  loadSupabaseConfig,
  loadAdminConfig,
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

describe("loadEmailJSConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads valid EmailJS config", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "support@example.com");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config).toEqual({
      serviceId: "service_123",
      templateId: "template_456",
      publicKey: "pubkey_789",
      defaultRecipientEmail: "support@example.com",
    });
  });

  it("leaves defaultRecipientEmail undefined when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_789");
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_789");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.defaultRecipientEmail).toBe("");
  });

  it("pushes error for missing required fields", () => {
    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(3);
    expect(errors[0]).toEqual({
      field: "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      message: "NEXT_PUBLIC_EMAILJS_SERVICE_ID is required for email notifications",
    });
    expect(errors[1]).toEqual({
      field: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      message: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID is required for email notifications",
    });
    expect(errors[2]).toEqual({
      field: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
      message: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY is required for email notifications",
    });
    expect(config.serviceId).toBe("");
    expect(config.templateId).toBe("");
    expect(config.publicKey).toBe("");
  });

  it("treats whitespace-only values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "\t\n ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "  ");

    const errors: { field: string; message: string }[] = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(3);
    expect(config.serviceId).toBe("");
    expect(config.templateId).toBe("");
    expect(config.publicKey).toBe("");
  });
});

describe("loadSupabaseConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads valid Supabase config", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config).toEqual({
      url: "https://xyz.supabase.co",
      anonKey: "anon-key-123",
    });
  });

  it("pushes errors for missing Supabase env variables", () => {
    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({
      field: "NEXT_PUBLIC_SUPABASE_URL",
      message: "NEXT_PUBLIC_SUPABASE_URL is required for Supabase",
    });
    expect(errors[1]).toEqual({
      field: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Supabase",
    });
    expect(config.url).toBe("");
    expect(config.anonKey).toBe("");
  });

  it("treats whitespace-only values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", " \n ");

    const errors: { field: string; message: string }[] = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(2);
    expect(config.url).toBe("");
    expect(config.anonKey).toBe("");
  });
});

describe("loadAdminConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims and lowercases admin email entries", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ADMIN_EMAILS",
      " UserOne@Domain.COM ,  userTwo@DOMAIN.ORG  "
    );

    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([
      "userone@domain.com",
      "usertwo@domain.org",
    ]);
  });

  it("drops empty entries and returns empty array for blank or comma-only strings", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", ", ,  ,");
    expect(loadAdminConfig().adminEmails).toEqual([]);

    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "   ");
    expect(loadAdminConfig().adminEmails).toEqual([]);

    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "a@b.com,,,c@d.com,");
    expect(loadAdminConfig().adminEmails).toEqual(["a@b.com", "c@d.com"]);
  });
});

describe("loadStellarConfig and validateEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loadStellarConfig uses defaults for testnet when envs unset", () => {
    const errors: { field: string; message: string }[] = [];
    const config = loadStellarConfig(errors);

    expect(config.network).toBe("testnet");
    expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org");
    expect(config.usdcContractId).toBe(
      "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID");
  });

  it("validateEnv collects errors across all loaders without throwing", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const env = validateEnv();

    expect(env.stellar).toBeDefined();
    expect(env.emailjs).toBeDefined();
    expect(env.supabase).toBeDefined();
    expect(env.admin).toBeDefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
