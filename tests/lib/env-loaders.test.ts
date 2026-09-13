import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAdminConfig, loadEmailJSConfig, loadSupabaseConfig } from "../../lib/env";

// The loaders read process.env through two private helpers: requireEnv, which
// pushes a ValidationError for a missing value and returns "", and getEnv,
// which falls back to a default. Both treat a whitespace-only value as absent
// and trim what they return. These exercise that behaviour through the public
// loaders, since the helpers themselves are not exported.

type ValidationError = { field: string; message: string };

const EMAILJS_KEYS = [
  "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
  "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
  "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
  "NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL",
];
const SUPABASE_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

function clear(keys: string[]): void {
  for (const key of keys) vi.stubEnv(key, "");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadEmailJSConfig", () => {
  it("reports one error per missing required field", () => {
    clear(EMAILJS_KEYS);
    const errors: ValidationError[] = [];

    loadEmailJSConfig(errors);

    expect(errors).toEqual(
      EMAILJS_KEYS.slice(0, 3).map((field) => ({
        field,
        message: `${field} is required for email notifications`,
      }))
    );
  });

  it("counts a whitespace-only value as missing", () => {
    clear(EMAILJS_KEYS);
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "   ");
    const errors: ValidationError[] = [];

    const config = loadEmailJSConfig(errors);

    expect(config.serviceId).toBe("");
    expect(errors.map((e) => e.field)).toContain("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
  });

  it("trims the values it returns and records no error when all are set", () => {
    clear(EMAILJS_KEYS);
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "  service  ");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "public-key");
    const errors: ValidationError[] = [];

    const config = loadEmailJSConfig(errors);

    expect(config.serviceId).toBe("service");
    expect(config.templateId).toBe("template");
    expect(config.publicKey).toBe("public-key");
    expect(errors).toEqual([]);
  });

  it.each([undefined, "", "   ", "\t\n"])(
    "returns undefined for an absent default recipient (%j)",
    (value) => {
      clear(EMAILJS_KEYS);
      vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", value ?? "");
      if (value === undefined) {
        delete process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL;
      }

      expect(loadEmailJSConfig([]).defaultRecipientEmail).toBeUndefined();
    }
  );

  it("passes a set default recipient through, trimmed", () => {
    clear(EMAILJS_KEYS);
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "  orders@example.com ");

    expect(loadEmailJSConfig([]).defaultRecipientEmail).toBe("orders@example.com");
  });

  it("appends to an errors array it shares with another loader", () => {
    clear([...EMAILJS_KEYS, ...SUPABASE_KEYS]);
    const errors: ValidationError[] = [];

    loadEmailJSConfig(errors);
    loadSupabaseConfig(errors);

    expect(errors).toHaveLength(5);
  });
});

describe("loadSupabaseConfig", () => {
  it("reports one error per missing required field", () => {
    clear(SUPABASE_KEYS);
    const errors: ValidationError[] = [];

    loadSupabaseConfig(errors);

    expect(errors).toEqual(
      SUPABASE_KEYS.map((field) => ({
        field,
        message: `${field} is required for Supabase`,
      }))
    );
  });

  it("counts a whitespace-only value as missing", () => {
    clear(SUPABASE_KEYS);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "\t ");
    const errors: ValidationError[] = [];

    expect(loadSupabaseConfig(errors).url).toBe("");
    expect(errors.map((e) => e.field)).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("returns trimmed values and no error when both are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const errors: ValidationError[] = [];

    const config = loadSupabaseConfig(errors);

    expect(config.url).toBe("https://example.supabase.co");
    expect(config.anonKey).toBe("anon-key");
    expect(errors).toEqual([]);
  });
});

describe("loadAdminConfig", () => {
  it("trims and lowercases each entry", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", " Admin@Test.com , SECOND@Test.COM ");

    expect(loadAdminConfig().adminEmails).toEqual(["admin@test.com", "second@test.com"]);
  });

  it("drops empty entries left by stray separators", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "a@test.com,,b@test.com,");

    expect(loadAdminConfig().adminEmails).toEqual(["a@test.com", "b@test.com"]);
  });

  it("returns an empty list when the variable is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;

    expect(loadAdminConfig().adminEmails).toEqual([]);
  });

  it("returns an empty list for a separators-only value", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", ",, ,");

    expect(loadAdminConfig().adminEmails).toEqual([]);
  });

  it("accepts a single address with no separator", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "solo@test.com");

    expect(loadAdminConfig().adminEmails).toEqual(["solo@test.com"]);
  });

  it("never reports an error, because the list is optional", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");

    expect(loadAdminConfig()).toEqual({ adminEmails: [] });
  });
});
