import { describe, it, expect } from "vitest";
import { resolveInternalRedirect, SAFE_REDIRECT_FALLBACK } from "../../lib/safe-redirect";

const ORIGIN = "https://mova.store";

describe("resolveInternalRedirect", () => {
  it("rejects the protocol-relative //evil.com redirect", () => {
    expect(resolveInternalRedirect("//evil.com", ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
  });

  it("rejects the backslash-normalised /\\evil.com redirect", () => {
    expect(resolveInternalRedirect("/\\evil.com", ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
  });

  it("rejects absolute cross-origin redirects", () => {
    expect(resolveInternalRedirect("https://evil.com/steal", ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
  });

  it("rejects non-http(s) schemes", () => {
    expect(resolveInternalRedirect("javascript:alert(1)", ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
  });

  it("keeps legitimate internal paths, including query and hash", () => {
    expect(resolveInternalRedirect("/shop", ORIGIN)).toBe("/shop");
    expect(resolveInternalRedirect("/orders?status=paid", ORIGIN)).toBe("/orders?status=paid");
    expect(resolveInternalRedirect("/collections#featured", ORIGIN)).toBe("/collections#featured");
  });

  it("falls back when the redirect is missing, empty or not a string", () => {
    expect(resolveInternalRedirect(null, ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
    expect(resolveInternalRedirect(undefined, ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
    expect(resolveInternalRedirect("", ORIGIN)).toBe(SAFE_REDIRECT_FALLBACK);
  });
});
