/**
 * Safe post-login redirect resolution.
 *
 * The `redirect` query parameter is attacker-controllable, so a prefix check
 * ("starts with /") is not enough: the protocol-relative URLs `//evil.com`
 * and `/\evil.com` both start with "/" but a browser resolves them to another
 * origin. The only reliable check is to resolve the value against the current
 * origin and compare the resulting origins.
 */

export const SAFE_REDIRECT_FALLBACK = "/shop";

/**
 * Resolve a redirect target to a same-origin path.
 *
 * @param {string | null | undefined} rawRedirect value of the `redirect` query param
 * @param {string} [origin] optional origin override (defaults to window.location.origin)
 * @returns {string} a same-origin path (with query/hash) or SAFE_REDIRECT_FALLBACK
 */
export function resolveInternalRedirect(rawRedirect, origin) {
  const fallback = SAFE_REDIRECT_FALLBACK;

  if (typeof rawRedirect !== "string") return fallback;
  const target = rawRedirect.trim();
  if (!target) return fallback;

  // Reject protocol-relative targets early; the origin check below also
  // catches them, but this keeps the intent obvious and cheap.
  if (target.startsWith("//") || target.startsWith("/\\")) return fallback;

  const base =
    origin ||
    (typeof window !== "undefined" && window.location ? window.location.origin : undefined);
  if (!base) return fallback;

  try {
    const baseUrl = new URL(base);
    const resolved = new URL(target, baseUrl);
    if (resolved.origin !== baseUrl.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export default resolveInternalRedirect;
