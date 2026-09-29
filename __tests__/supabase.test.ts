import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveSupabaseConfig } from "../lib/supabase";

/**
 * `lib/supabase.js` used to bootstrap the client with
 * `"https://placeholder.supabase.co"` / `"placeholder-anon-key"` whenever the
 * configuration was missing, so a misconfigured deployment booted happily and
 * then failed every data/auth call against a fake project. These tests pin the
 * fail-fast contract instead: a missing variable must throw, and the message
 * must name the variable that is missing.
 */

describe("resolveSupabaseConfig", () => {
  it("returns the trimmed url and anon key when both are configured", () => {
    expect(
      resolveSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "  https://xyz.supabase.co ",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon-key-xyz ",
      })
    ).toEqual({ url: "https://xyz.supabase.co", anonKey: "anon-key-xyz" });
  });

  it("throws naming both variables when neither is set", () => {
    expect(() => resolveSupabaseConfig({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => resolveSupabaseConfig({})).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("throws naming only the missing variable when one is present", () => {
    let message = "";
    try {
      resolveSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://xyz.supabase.co",
      });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(message).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("treats a whitespace-only value as missing", () => {
    expect(() =>
      resolveSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "   ",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-xyz",
      })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("names the variable in the error, not a placeholder fallback", () => {
    let message = "";
    try {
      resolveSupabaseConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-xyz" });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain("placeholder.supabase.co");
    expect(message).not.toContain("placeholder-anon-key");
  });
});

describe("lib/supabase startup", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails fast at import time when the Supabase env is missing", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(import("../lib/supabase")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("exports a usable client when the Supabase env is configured", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://xyz.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-xyz");

    const mod = await import("../lib/supabase");

    expect(mod.supabase).toBeTruthy();
    expect(mod.default).toBe(mod.supabase);
    expect(typeof mod.supabase.auth.getSession).toBe("function");
  });
});
