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

describe("supabase/schema.sql RLS policies", () => {
  it("enforces admin-only writes and public reads for products and storage", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const schemaPath = path.resolve(__dirname, "../../supabase/schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");

    // Table definitions
    expect(sql).toContain("create table if not exists public.products");
    expect(sql).toContain("create table if not exists public.admin_users");
    expect(sql).toContain("alter table public.admin_users enable row level security;");
    expect(sql).toContain("alter table public.products enable row level security;");

    // Server-side helper function
    expect(sql).toContain("create or replace function public.is_admin()");
    expect(sql).toContain("security definer");

    // Products table policies
    expect(sql).toContain('create policy "Public can read products"');
    expect(sql).toContain('create policy "Admins can insert products"');
    expect(sql).toContain('create policy "Admins can update products"');
    expect(sql).toContain('create policy "Admins can delete products"');
    expect(sql).toContain("with check (public.is_admin())");

    // Permissive policies are explicitly dropped
    expect(sql).toContain('drop policy if exists "Authenticated users can insert products"');
    expect(sql).toContain('drop policy if exists "Authenticated users can update products"');
    expect(sql).toContain('drop policy if exists "Authenticated users can delete products"');

    // Storage bucket and object policies
    expect(sql).toContain("insert into storage.buckets");
    expect(sql).toContain('create policy "Public can view product images"');
    expect(sql).toContain('create policy "Admins can upload product images"');
    expect(sql).toContain('create policy "Admins can update product images"');
    expect(sql).toContain('create policy "Admins can delete product images"');
    expect(sql).toContain("bucket_id = 'products' and public.is_admin()");
  });
});
