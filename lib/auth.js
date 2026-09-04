import { supabase } from "./supabase";

/**
 * Map Supabase user → app user shape used by Navbar / AdminGuard.
 */
export function mapAuthUser(supabaseUser) {
  if (!supabaseUser) return null;

  const meta = supabaseUser.user_metadata || {};
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
  };
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
};
