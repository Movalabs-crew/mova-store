"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "./supabase";
import { mapAuthUser } from "./auth";

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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(mapAuthUser(session?.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapAuthUser(session?.user));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = useMemo(() => {
    return user?.email ? checkIsAdmin(user.email) : false;
  }, [user?.email]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isAuthenticated: !!user,
    }),
    [user, loading, isAdmin]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
