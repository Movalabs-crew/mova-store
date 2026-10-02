"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "./supabase";
import { mapAuthUser } from "./auth";
import { isAdminEmail } from "./env";
import { setSessionCookie, clearSessionCookie } from "./session-cookie";

const AuthContext = createContext();

/**
 * Checks if an email is in the admin whitelist.
 * @param {string|null|undefined} email - User email to check
 * @returns {boolean} True if user is an admin
 */
const checkIsAdmin = (email) => {
  if (!email) return false;

  const adminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const adminEmails = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e !== "");

  return adminEmails.includes(email.toLowerCase());
};

/**
 * Mirror the Supabase access token into a readable cookie so `middleware.js`
 * can authorize `/admin` server-side (issue #489). The token stays in
 * localStorage as before; the cookie is only a transport for the server gate.
 */
const syncSessionCookie = (session) => {
  if (session && session.access_token) {
    setSessionCookie(session.access_token);
  } else {
    clearSessionCookie();
  }
};
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(mapAuthUser(session?.user));
        syncSessionCookie(session);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to retrieve auth session:", err);
        setUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(mapAuthUser(session?.user));
      syncSessionCookie(session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = useMemo(() => {
    // The server claim (admin_users / JWT) is the source of truth when it is
    // present. Otherwise delegate to the one shared helper, so the client and
    // the server's RLS policy cannot disagree about who is an admin.
    if (user?.isAdminClaim) return true;
    return isAdminEmail(user?.email);
  }, [user?.email, user?.isAdminClaim]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isAuthenticated: !!user,
    }),
    [user, loading, isAdmin]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => useContext(AuthContext);
