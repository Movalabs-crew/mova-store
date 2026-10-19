import { supabase } from "./supabase";
import { clearCachedBuyerOrders } from "./buyer-orders";

/**
 * Map Supabase user → app user shape used by Navbar / AdminGuard.
 */
export function mapAuthUser(supabaseUser) {
  if (!supabaseUser) return null;

  const meta = supabaseUser.user_metadata || {};
  const appMeta = supabaseUser.app_metadata || {};
  return {
    id: supabaseUser.id,
    uid: supabaseUser.id,
    email: supabaseUser.email || "",
    displayName:
      meta.full_name ||
      meta.name ||
      meta.display_name ||
      (supabaseUser.email ? supabaseUser.email.split("@")[0] : "User"),
    photoURL: meta.avatar_url || meta.picture || null,
    isAdminClaim: Boolean(appMeta.is_admin),
  };
}

/**
 * Single source of truth for the client-side admin gate.
 *
 * Mirrors the server: `app_metadata.is_admin` is granted from the
 * `admin_users` table and travels inside the signed Supabase JWT, which is the
 * same fact RLS authorizes on. Deriving the UI gate from that claim keeps the
 * client and the database in agreement — an operator who is listed in
 * `admin_users` sees the panel, and an operator who is not sees the denial
 * screen instead of a panel whose every write fails.
 *
 * Deliberately never reads a `NEXT_PUBLIC_*` allowlist: those values are
 * inlined into the client bundle at build time, so an env-based list would
 * publish every admin address to any visitor who opens devtools.
 *
 * @param {{ isAdminClaim?: boolean } | null | undefined} user App user from {@link mapAuthUser}.
 * @returns {boolean} True only when the server marked the session as an admin.
 */
export function isAdminUser(user) {
  return Boolean(user?.isAdminClaim);
}

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/profile/login` : undefined,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw new Error(`Error logging in with Google: ${error.message}`);
  }

  return data;
};

export const signup = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(`Error signing up: ${error.message}`);
  }

  return mapAuthUser(data.user);
};

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Error logging in: ${error.message}`);
  }

  return mapAuthUser(data.user);
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Error logging out: ${error.message}`);
  }

  // Drop the shared local cache so the next account on this browser cannot read
  // the previous buyer's order history.
  clearCachedBuyerOrders();
};
