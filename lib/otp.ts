import { createHash, randomInt, timingSafeEqual } from "crypto";

/**
 * Server-side checkout OTP.
 *
 * Security properties this module guarantees:
 * - Codes are drawn from a CSPRNG (`crypto.randomInt`), never `Math.random()`.
 * - Only a SHA-256 hash of the code is kept in memory; the plaintext code is
 *   returned exactly once so the caller can email it.
 * - Codes expire (OTP_TTL_MS) and are single-use.
 * - Verification is attempt-limited (OTP_MAX_ATTEMPTS), then the code is burnt.
 * - Issuing is throttled per key (OTP_MAX_REQUESTS_PER_WINDOW / window).
 *
 * The store is in-process. A multi-instance deployment should swap `OtpStore`
 * for a shared backing store (Redis/Upstash) behind the same interface.
 */

/** How long an issued OTP stays valid. */
export const OTP_TTL_MS = 5 * 60 * 1000;

/** Failed verification attempts allowed before the code is discarded. */
export const OTP_MAX_ATTEMPTS = 5;

/** Sliding window used to throttle issue requests for a single key. */
export const OTP_REQUEST_WINDOW_MS = 60 * 1000;

/** Issue requests allowed per key within the window. */
export const OTP_MAX_REQUESTS_PER_WINDOW = 3;

export type OtpIssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "rate_limited"; retryAfterMs: number };

export type OtpVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "expired" | "too_many_attempts" | "mismatch";
      attemptsRemaining?: number;
    };

interface OtpRecord {
  hash: string;
  expiresAt: number;
  attempts: number;
}

interface RateRecord {
  windowStart: number;
  count: number;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export class OtpStore {
  private readonly records = new Map<string, OtpRecord>();
  private readonly requests = new Map<string, RateRecord>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Generate, store (hashed) and return a fresh 6-digit code. */
  issue(rawKey: string): OtpIssueResult {
    const key = normalizeKey(rawKey);
    const now = this.now();

    const rate = this.requests.get(key);
    if (rate && now - rate.windowStart < OTP_REQUEST_WINDOW_MS) {
      if (rate.count >= OTP_MAX_REQUESTS_PER_WINDOW) {
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterMs: rate.windowStart + OTP_REQUEST_WINDOW_MS - now,
        };
      }
      rate.count += 1;
    } else {
      this.requests.set(key, { windowStart: now, count: 1 });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    this.records.set(key, {
      hash: hashCode(code),
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
    });
    return { ok: true, code };
  }

  /** Verify a submitted code. Successful verification consumes the code. */
  verify(rawKey: string, input: string): OtpVerifyResult {
    const key = normalizeKey(rawKey);
    const record = this.records.get(key);
    if (!record) {
      return { ok: false, reason: "not_found" };
    }

    const now = this.now();
    if (now >= record.expiresAt) {
      this.records.delete(key);
      return { ok: false, reason: "expired" };
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      this.records.delete(key);
      return { ok: false, reason: "too_many_attempts" };
    }

    const expected = Buffer.from(record.hash, "hex");
    const actual = Buffer.from(hashCode(input.trim()), "hex");
    const matches =
      expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      record.attempts += 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        this.records.delete(key);
        return { ok: false, reason: "too_many_attempts" };
      }
      return {
        ok: false,
        reason: "mismatch",
        attemptsRemaining: OTP_MAX_ATTEMPTS - record.attempts,
      };
    }

    // Codes are single-use: a verified code can never be replayed.
    this.records.delete(key);
    return { ok: true };
  }

  /** Drop all records (used by tests). */
  clear(): void {
    this.records.clear();
    this.requests.clear();
  }
}
