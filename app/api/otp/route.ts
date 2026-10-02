import { NextResponse } from "next/server";

import { OtpStore } from "../../../lib/otp";

/**
 * Server-owned checkout OTP endpoint.
 *
 * The browser can only ask for a code to be sent and ask for a submitted code
 * to be checked — it can never read the code, and it can never decide that a
 * code is correct. Generation, storage, expiry and rate limiting all live here.
 */

export const runtime = "nodejs";

// Module-scoped so every request in this server instance shares the state.
const store = new OtpStore();

// Prefer server-only names; fall back to the historical NEXT_PUBLIC_* names so
// existing deployments keep working.
const EMAILJS_SERVICE_ID =
  process.env.EMAILJS_SERVICE_ID ?? process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID =
  process.env.EMAILJS_TEMPLATE_ID ?? process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY =
  process.env.EMAILJS_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    throw new Error("missing_emailjs_config");
  }

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        name: "",
        email,
        message: `You are about to checkout your cart on Mova Store. Your OTP is: ${code}`,
        recipient_email: email,
        subject: "YOUR ORDER CONFIRMATION",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`emailjs_${res.status}`);
  }
}

function readEmail(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as { email?: unknown }).email;
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = readEmail(payload);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const action = (payload as { action?: unknown }).action;

  if (action === "send") {
    const issued = store.issue(email);
    if (!issued.ok) {
      const retryAfterSeconds = Math.ceil(issued.retryAfterMs / 1000);
      return NextResponse.json(
        { ok: false, error: "rate_limited", retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    try {
      await sendOtpEmail(email, issued.code);
    } catch {
      return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, expiresInSeconds: 300 });
  }

  if (action === "verify") {
    const rawCode = (payload as { code?: unknown }).code;
    const code = typeof rawCode === "string" ? rawCode.trim() : "";
    const result = store.verify(email, code);

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    const status = result.reason === "too_many_attempts" ? 429 : 400;
    return NextResponse.json(
      { ok: false, error: result.reason, attemptsRemaining: result.attemptsRemaining },
      { status },
    );
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
