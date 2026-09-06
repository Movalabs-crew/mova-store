import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAdminEmail,
  isDevelopment,
  isProduction,
  validateEnv,
  loadStellarConfig,
  loadEmailJSConfig,
  loadSupabaseConfig,
  loadAdminConfig,
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

  it("returns typed config when all required variables are set", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "srv_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pk_789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "support@store.com");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config).toEqual({
      serviceId: "srv_123",
      templateId: "tmpl_456",
      publicKey: "pk_789",
      defaultRecipientEmail: "support@store.com",
    });
  });

  it("trims whitespace from environment variable values", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "  srv_123  ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "  tmpl_456  ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "  pk_789  ");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "  support@store.com  ");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.serviceId).toBe("srv_123");
    expect(config.templateId).toBe("tmpl_456");
    expect(config.publicKey).toBe("pk_789");
    expect(config.defaultRecipientEmail).toBe("support@store.com");
  });

  it("pushes an error for each missing required field with the right context message", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");

    const errors: Array<{ field: string; message: string }> = [];
    loadEmailJSConfig(errors);

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
  });

  it("treats whitespace-only values as missing and pushes errors", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", " \t ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "  \n  ");

    const errors: Array<{ field: string; message: string }> = [];
    loadEmailJSConfig(errors);

    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.field)).toEqual([
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
    ]);
  });

  it("handles unset optional defaultRecipientEmail", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "srv_123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_456");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pk_789");
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadEmailJSConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.defaultRecipientEmail).toBe("");
  });
});

describe("loadSupabaseConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns typed config when all required variables are valid", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-secret-123");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config).toEqual({
      url: "https://xyz.supabase.co",
      anonKey: "anon-key-secret-123",
    });
  });

  it("trims surrounding whitespace from configuration values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "  https://xyz.supabase.co  ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "  anon-key-secret-123  ");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadSupabaseConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.url).toBe("https://xyz.supabase.co");
    expect(config.anonKey).toBe("anon-key-secret-123");
  });

  it("pushes error with Supabase context when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "valid-key");

    const errors: Array<{ field: string; message: string }> = [];
    loadSupabaseConfig(errors);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      field: "NEXT_PUBLIC_SUPABASE_URL",
      message: "NEXT_PUBLIC_SUPABASE_URL is required for Supabase",
    });
  });

  it("pushes error with Supabase context when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const errors: Array<{ field: string; message: string }> = [];
    loadSupabaseConfig(errors);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      field: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Supabase",
    });
  });

  it("treats whitespace-only values as missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "   ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "\t  \n");

    const errors: Array<{ field: string; message: string }> = [];
    loadSupabaseConfig(errors);

    expect(errors).toHaveLength(2);
    expect(errors[0].field).toBe("NEXT_PUBLIC_SUPABASE_URL");
    expect(errors[1].field).toBe("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

describe("loadAdminConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty array when NEXT_PUBLIC_ADMIN_EMAILS is unset or empty", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([]);
  });

  it("parses, normalizes to lowercase, and trims whitespace from comma-separated emails", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", " User1@Example.com ,  USER2@DOMAIN.ORG  , admin@mova.store ");
    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([
      "user1@example.com",
      "user2@domain.org",
      "admin@mova.store",
    ]);
  });

  it("filters out empty segments resulting from consecutive or trailing commas", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", ",admin@test.com,,other@test.com,   ,");
    const config = loadAdminConfig();
    expect(config.adminEmails).toEqual([
      "admin@test.com",
      "other@test.com",
    ]);
  });
});

describe("loadStellarConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads testnet defaults when network is testnet and contract id is set", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CCONTRACT123");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadStellarConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.network).toBe("testnet");
    expect(config.checkoutContractId).toBe("CCONTRACT123");
    expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org");
    expect(config.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  it("loads mainnet defaults when network is set to mainnet", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CCONTRACT456");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadStellarConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.network).toBe("mainnet");
    expect(config.rpcUrl).toBe("https://soroban-rpc.mainnet.stellar.gateway.fm");
    expect(config.networkPassphrase).toBe("Public Global Stellar Network ; September 2015");
  });

  it("respects custom RPC URL and contract overrides", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CCONTRACT123");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_RPC_URL", "https://custom-rpc.stellar.org");
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "CUSDC999");

    const errors: Array<{ field: string; message: string }> = [];
    const config = loadStellarConfig(errors);

    expect(errors).toHaveLength(0);
    expect(config.rpcUrl).toBe("https://custom-rpc.stellar.org");
    expect(config.usdcContractId).toBe("CUSDC999");
  });

  it("pushes error for missing NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "");

    const errors: Array<{ field: string; message: string }> = [];
    loadStellarConfig(errors);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      field: "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
      message: "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID is required for Stellar payments",
    });
  });
});

describe("Error Accumulation across loaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accumulates errors across multiple loader calls into the shared error array", () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const errors: Array<{ field: string; message: string }> = [];
    loadStellarConfig(errors);
    loadEmailJSConfig(errors);
    loadSupabaseConfig(errors);

    // 1 from stellar + 3 from emailjs + 2 from supabase = 6 total errors
    expect(errors).toHaveLength(6);
    expect(errors.map((e) => e.field)).toEqual([
      "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
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
