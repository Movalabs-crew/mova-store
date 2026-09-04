import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("lib/supabase", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls createClient with configured environment variables and auth options", async () => {
    const mockCreateClient = vi.fn().mockReturnValue({ auth: {} });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: mockCreateClient,
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "custom-anon-key-12345");

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const mod = await import("../../lib/supabase.js");

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example-project.supabase.co",
      "custom-anon-key-12345",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
    expect(mod.supabase).toBeDefined();
    expect(mod.default).toBe(mod.supabase);
  });

  it("warns and uses placeholders when environment variables are missing", async () => {
    const mockCreateClient = vi.fn().mockReturnValue({ auth: {} });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: mockCreateClient,
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const mod = await import("../../lib/supabase.js");

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://placeholder.supabase.co",
      "placeholder-anon-key",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
    expect(mod.supabase).toBeDefined();
  });

  it("warns when only NEXT_PUBLIC_SUPABASE_URL is provided", async () => {
    const mockCreateClient = vi.fn().mockReturnValue({ auth: {} });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: mockCreateClient,
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://only-url.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("../../lib/supabase.js");

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://only-url.supabase.co",
      "placeholder-anon-key",
      expect.any(Object)
    );
  });

  it("warns when only NEXT_PUBLIC_SUPABASE_ANON_KEY is provided", async () => {
    const mockCreateClient = vi.fn().mockReturnValue({ auth: {} });
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: mockCreateClient,
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "only-key-12345");

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("../../lib/supabase.js");

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://placeholder.supabase.co",
      "only-key-12345",
      expect.any(Object)
    );
  });
});
