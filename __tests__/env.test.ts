import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadEmailJSConfig,
  loadSupabaseConfig,
  loadAdminConfig,
  loadStellarConfig,
  validateEnv,
  isAdminEmail,
} from "../lib/env";

describe("Environment Configuration Loaders (lib/env.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadEmailJSConfig", () => {
    it("loads valid EmailJS config with all fields set", () => {
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID = "service_123";
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID = "template_456";
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY = "pk_789";
      process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL = "notify@mova.store";

      const errors: Array<{ field: string; message: string }> = [];
      const config = loadEmailJSConfig(errors);

      expect(errors).toHaveLength(0);
      expect(config).toEqual({
        serviceId: "service_123",
        templateId: "template_456",
        publicKey: "pk_789",
        defaultRecipientEmail: "notify@mova.store",
      });
    });

    it("records validation errors when required EmailJS variables are missing", () => {
      delete process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      delete process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      delete process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      const errors: Array<{ field: string; message: string }> = [];
      const config = loadEmailJSConfig(errors);

      expect(errors).toHaveLength(3);
      expect(errors.map((e) => e.field)).toEqual([
        "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
        "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
        "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
      ]);
      expect(config.serviceId).toBe("");
      expect(config.templateId).toBe("");
      expect(config.publicKey).toBe("");
    });
  });

  describe("loadSupabaseConfig", () => {
    it("loads valid Supabase configuration", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-xyz-123";

      const errors: Array<{ field: string; message: string }> = [];
      const config = loadSupabaseConfig(errors);

      expect(errors).toHaveLength(0);
      expect(config).toEqual({
        url: "https://xyz.supabase.co",
        anonKey: "anon-key-xyz-123",
      });
    });

    it("records validation errors when Supabase environment variables are missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const errors: Array<{ field: string; message: string }> = [];
      const config = loadSupabaseConfig(errors);

      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.field)).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]);
    });
  });

  describe("loadAdminConfig", () => {
    it("parses comma-separated admin emails and trims/lowercases them", () => {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = " Admin@Mova.Store , OWNER@Mova.Store ,dev@mova.store ";

      const config = loadAdminConfig();
      expect(config.adminEmails).toEqual([
        "admin@mova.store",
        "owner@mova.store",
        "dev@mova.store",
      ]);
    });

    it("handles empty or unset admin emails gracefully", () => {
      delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
      const config = loadAdminConfig();
      expect(config.adminEmails).toEqual([]);
    });

    it("filters out empty segments in comma-separated strings", () => {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@mova.store,,,user@mova.store,";
      const config = loadAdminConfig();
      expect(config.adminEmails).toEqual(["admin@mova.store", "user@mova.store"]);
    });
  });

  describe("isAdminEmail", () => {
    it("returns true for registered admin emails case-insensitively", () => {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@mova.store,owner@mova.store";

      expect(isAdminEmail("ADMIN@MOVA.STORE")).toBe(true);
      expect(isAdminEmail("owner@mova.store")).toBe(true);
      expect(isAdminEmail("customer@mova.store")).toBe(false);
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
      expect(isAdminEmail("")).toBe(false);
    });
  });

  describe("validateEnv", () => {
    it("throws a descriptive error when required variables are missing", () => {
      delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;
      delete process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => validateEnv()).toThrow("Environment configuration errors:");
    });

    it("returns full EnvConfig when all required variables are present", () => {
      process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID = "CCHECKOUT123456789";
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID = "service_123";
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID = "template_456";
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY = "pk_789";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon_key_123";
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@mova.store";

      const config = validateEnv();
      expect(config.stellar.checkoutContractId).toBe("CCHECKOUT123456789");
      expect(config.emailjs.serviceId).toBe("service_123");
      expect(config.supabase.url).toBe("https://xyz.supabase.co");
      expect(config.admin.adminEmails).toEqual(["admin@mova.store"]);
    });
  });
});
