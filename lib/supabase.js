import { createClient } from "@supabase/supabase-js";

// Required Supabase configuration. `.env.local.example` marks both of these as
// [REQUIRED]; a deployment without them must not boot against placeholder
// credentials, because every auth/data call would then fail against a fake
// project with confusing errors instead of a clear startup failure.
const REQUIRED_SUPABASE_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

/**
 * Resolve and validate the Supabase connection settings.
 *
 * Throws a clear, actionable error naming every missing variable instead of
 * silently falling back to placeholder credentials.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ url: string, ankey: string }}
 */
export function resolveSupabaseConfig(env = process.env) {
  const missing = REQUIRED_SUPABASE_ENV.filter((name) => {
    const value = env[name];
    return !value || String(value).trim() === "";
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required Supabase environment variable(s): ${missing.join(", ")}. ` +
        "Set them in .env.local (see .env.local.example) before starting the app."
    );
  }

  return {
    url: String(env.NEXT_PUBLIC_SUPABASE_URL).trim(),
    anonKey: String(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).trim(),
  };
}

/**
 * Resolve the server-side service-role credentials used to write orders.
 *
 * Order rows must only be written from a server route that has verified the
 * on-chain payment. The anon key is deliberately not accepted here, because
 * using it would re-open the client-write attack surface this fix closes.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ url: string, serviceRoleKey: string }}
 */
export function resolveSupabaseAdminConfig(env = process.env) {
  const { url } = resolveSupabaseConfig(env);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || String(serviceRoleKey).trim() === "") {
    throw new Error(
      "Missing required Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY. " +
        "Order writes must run on the server with the service-role key after verifying the on-chain payment."
    );
  }

  return { url, serviceRoleKey: String(serviceRoleKey).trim() };
}

const { url: supabaseUrl, ankey: supabaseAnonKey } = resolveSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Create a server-only Supabase client for writing orders.
 *
 * This must only be invoked from a route handler after the on-chain payment has
 * been verified against the checkout contract. Never expose the returned client
 * or the service-role key to the browser.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function createSupabaseAdminClient(env = process.env) {
  const { url, serviceRoleKey } = resolveSupabaseAdminConfig(env);

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export default supabase;
