/**
 * Supabase access-token cookie.
 *
 * The Supabase JS client keeps the session in `localStorage`, which the server
 * cannot read. Mirroring the access token into a `SameSite=Lax` cookie lets
 * `middleware.js` verify the caller server-side before an `/admin` route is
 * ever rendered. The cookie carries only the access token the client already
 * holds; the middleware still verifies it with Supabase before trusting it.
 */

export const SESSION_COOKIE = "mova-sb-access-token";

/**
 * Roughly the Supabase access-token lifetime. The middleware re-verifies the
 * token on every request, so a stale cookie is rejected there regardless of
 * this value.
 */
const MAX_AGE_SECONDS = 60 * 60 * 8;

const isBrowser = () => typeof document !== "undefined";

export function setSessionCookie(token) {
  if (!isBrowser()) return;
  if (!token) {
    clearSessionCookie();
    return;
  }
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearSessionCookie() {
  if (!isBrowser()) return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
