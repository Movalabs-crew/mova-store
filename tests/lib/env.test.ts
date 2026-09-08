import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAdminEmail, isDevelopment, isProduction, validateEnv } from "../../lib/env";

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

  it("resolves canonical mainnet RPC default when env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CA1234567890TESTCONTRACTID");
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "CB1234567890TESTUSDCID");
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", "CC1234567890TESTNATIVEID");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key-123");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_abc");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template_xyz");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pubkey_789");

    const config = validateEnv();
    expect(config.stellar.rpcUrl).toBe("https://soroban-rpc.stellar.org");
  });
});
