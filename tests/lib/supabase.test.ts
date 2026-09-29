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

  // `lib/supabase.js` no longer falls back to placeholder credentials: a missing
  // variable throws instead, so a misconfigured deployment fails at startup
  // rather than booting against a fake project. Capture the message rather than
  // the import, because the throw happens at module-evaluation time.
  const importError = async () => {
    try {
      await import("../../lib/supabase.js");
      return "";
    } catch (error) {
      return (error as Error).message;
    }
  };

  it("fails fast naming both variables when the environment is missing", async () => {
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn().mockReturnValue({ auth: {} }),
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const message = await importError();

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("throws when only NEXT_PUBLIC_SUPABASE_URL is provided, and falls back to no placeholder", async () => {
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn().mockReturnValue({ auth: {} }),
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://only-url.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const message = await importError();

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(message).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("throws when only NEXT_PUBLIC_SUPABASE_ANON_KEY is provided, and falls back to no placeholder", async () => {
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn().mockReturnValue({ auth: {} }),
    }));

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "only-key-12345");

    const message = await importError();

    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(message).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
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

describe("mapAuthUser admin claim mapping", () => {
  it("extracts isAdminClaim from app_metadata", async () => {
    // `lib/auth.js` pulls in the Supabase client, which now fails fast without
    // configuration, so the module needs a valid environment to load at all.
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example-project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-12345");
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn().mockReturnValue({ auth: {} }),
    }));

    const { mapAuthUser } = await import("../../lib/auth.js");

    const nonAdmin = mapAuthUser({
      id: "u1",
      email: "user@test.com",
      user_metadata: { full_name: "Test User" },
      app_metadata: {},
    });
    expect(nonAdmin?.isAdminClaim).toBe(false);

    const admin = mapAuthUser({
      id: "u2",
      email: "admin@test.com",
      user_metadata: { full_name: "Admin User" },
      app_metadata: { is_admin: true },
    });
    expect(admin?.isAdminClaim).toBe(true);

    const missingMeta = mapAuthUser({
      id: "u3",
      email: "plain@test.com",
    });
    expect(missingMeta?.isAdminClaim).toBe(false);
  });
});
