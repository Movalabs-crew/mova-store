import { NextResponse } from "next/server";
import {
  authorizeAdminRequest,
  gateResponseFor,
  resolveAdminEmails,
  resolveSupabaseUrl,
} from "./lib/admin-auth";

/**
 * Server-side gate for the admin area.
 *
 * This runs before any `/admin` page is rendered or downloaded, so a
 * non-admin who types the URL directly is redirected at the edge instead of
 * being handed the admin bundle and stopped by `AdminGuard` afterwards.
 * `AdminGuard` stays in place as defence in depth (it also hides the UI for
 * authenticated non-admins), and Supabase RLS remains the data-layer control.
 */
export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  const decision = await authorizeAdminRequest({
    cookieHeader: request.headers.get("cookie"),
    supabaseUrl: resolveSupabaseUrl(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    adminEmails: resolveAdminEmails(),
  });

  const gate = gateResponseFor({
    allowed: decision.allowed,
    reason: decision.reason,
    pathname,
    search,
  });

  if (gate.allowed) return NextResponse.next();

  const response = NextResponse.redirect(new URL(gate.redirectTo, request.url));
  // A gate decision must never be cached and replayed.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export default middleware;
