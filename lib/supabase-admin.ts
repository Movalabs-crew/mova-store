import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase access for writes that must not be reachable from the
 * browser.
 *
 * The browser client (`lib/supabase.js`) is built with the public anon key, so
 * anything it writes is subject to RLS and can be triggered by any visitor.
 * Order rows are only written by the `/api/orders` route, which first verifies
 * the on-chain payment and then writes with the service-role key: that key
 * bypasses RLS and must therefore never leave the server.
 */

export interface ServiceRoleConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Resolve the service-role configuration, or `null` when it is not configured.
 *
 * Returning `null` instead of throwing lets the route fail closed with a clear
 * 503 rather than crash at import time, which matters because this module is
 * evaluated whenever the route module loads (including in environments where
 * Supabase is intentionally unset, such as local UI work and the test suite).
 */
export function resolveServiceRoleConfig(
  env: Record<string, string | undefined> = process.env
): ServiceRoleConfig | null {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

/**
 * Create a Supabase client authenticated as the service role, or `null` when
 * `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset.
 *
 * Never expose the returned client (or the key) to the browser.
 */
export function createServiceRoleClient(
  env: Record<string, string | undefined> = process.env
): SupabaseClient | null {
  const config = resolveServiceRoleConfig(env);
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
