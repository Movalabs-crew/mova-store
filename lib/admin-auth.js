/**
 * Server-side admin authorization for `/admin` routes.
 *
 * `components/AdminGuard.jsx` is a client component, so it can only hide the
 * admin UI after the browser has already downloaded it - a direct navigation to
 * `/admin` is never actually prevented by it. This module is the server-side
 * counterpart used by `middleware.js`: it reads the mirrored Supabase access
 * token cookie, verifies it with Supabase, and checks the resulting email
 * against the admin allow-list.
 *
 * Everything here is either pure or uses the global `fetch`, so the module is
 * safe in the Next.js Edge middleware runtime and unit-testable without it.
 */

import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };

/** Normalise a comma-separated allow-list into lowercase email addresses. */
export function parseAdminEmails(raw) {
  return String(raw || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Case-insensitive allow-list check. Fails closed for an empty email. */
export function isAdminEmail(email, raw) {
  if (!email) return false;
  return parseAdminEmails(raw).includes(String(email).trim().toLowerCase());
}

/** Read a single cookie value out of a raw `Cookie:` header. */
export function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of String(cookieHeader).split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/** Supabase project URL, preferring the server-only variable when present. */
export function resolveSupabaseUrl(env = process.env) {
  return env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
}

/**
 * Admin allow-list. `ADMIN_EMAILS` is server-only and takes precedence so the
 * list can be kept out of the client bundle; `NEXT_PUBLIC_ADMIN_EMAILS` is the
 * legacy value `AdminGuard` reads and remains supported.
 */
export function resolveAdminEmails(env = process.env) {
  return env.ADMIN_EMAILS || env.NEXT_PUBLIC_ADMIN_EMAILS || "";
}

/**
 * Decide whether a request may reach an `/admin` route.
 *
 * The access token is verified against Supabase's `/auth/v1/user` endpoint, so
 * a forged or forged-claim cookie cannot pass: only a token Supabase accepts,
 * whose email is on the allow-list, is allowed through.
 *
 * @returns {Promise<{allowed: boolean, reason: string, email: string|null}>}
 */
export async function authorizeAdminRequest({
  cookieHeader,
  supabaseUrl,
  anonKey,
  adminEmails,
  fetchImpl = fetch,
}) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return { allowed: false, reason: "unauthenticated", email: null };

  if (!supabaseUrl || !anonKey) {
    return { allowed: false, reason: "misconfigured", email: null };
  }

  let response;
  try {
    response = await fetchImpl(
      `${String(supabaseUrl).replace(/\/$/, "")}/auth/v1/user`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    return { allowed: false, reason: "verification_failed", email: null };
  }

  if (!response || !response.ok) {
    return { allowed: false, reason: "unauthenticated", email: null };
  }

  let user = null;
  try {
    user = await response.json();
  } catch {
    user = null;
  }

  const email = (user && user.email) || null;
  if (isAdminEmail(email, adminEmails)) {
    return { allowed: true, reason: "admin", email };
  }

  return { allowed: false, reason: "forbidden", email };
}

/**
 * Turn an authorization result into the gate decision used by the middleware.
 *
 * Kept pure (no `NextResponse`) so the denied case is unit-testable without the
 * Edge runtime: a blocked request always produces a login redirect that
 * preserves the original path in `redirect`.
 */
export function gateResponseFor({ allowed, reason, pathname, search }) {
  if (allowed) return { allowed: true, redirectTo: null };

  const params = new URLSearchParams();
  params.set("redirect", `${pathname}${search || ""}`);
  params.set("reason", reason || "unauthenticated");

  return { allowed: false, redirectTo: `/profile/login?${params.toString()}` };
}
