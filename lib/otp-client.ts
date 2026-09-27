/**
 * Browser-side helpers for the server-owned checkout OTP.
 *
 * The checkout UI never generates or compares a code itself — it only asks the
 * server to send one and to check the value the shopper typed in.
 */

export interface OtpClientResult {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

async function post(body: Record<string, unknown>): Promise<OtpClientResult> {
  try {
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: Boolean(json.ok),
      error: typeof json.error === "string" ? json.error : undefined,
      retryAfterSeconds:
        typeof json.retryAfterSeconds === "number" ? json.retryAfterSeconds : undefined,
      attemptsRemaining:
        typeof json.attemptsRemaining === "number" ? json.attemptsRemaining : undefined,
    };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

/** Ask the server to generate and email a fresh code for `email`. */
export function requestOtp(email: string): Promise<OtpClientResult> {
  return post({ action: "send", email });
}

/** Ask the server to verify `code` for `email`. */
export function verifyOtp(email: string, code: string): Promise<OtpClientResult> {
  return post({ action: "verify", email, code });
}
