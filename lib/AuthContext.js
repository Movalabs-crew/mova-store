"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "./supabase";
import { mapAuthUser } from "./auth";
import { isAdminEmail } from "./env";

const AuthContext = createContext();

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
