import { describe, it, expect, beforeEach } from "vitest";

import {
  OTP_MAX_ATTEMPTS,
  OTP_REQUEST_WINDOW_MS,
  OTP_TTL_MS,
  OtpStore,
} from "../../lib/otp";

describe("OtpStore", () => {
  let clock: number;
  let store: OtpStore;

  beforeEach(() => {
    clock = 1_700_000_000_000;
    store = new OtpStore(() => clock);
  });

  it("issues a zero-padded 6-digit code", () => {
    const issued = store.issue("buyer@example.com");
    expect(issued.ok).toBe(true);
    if (issued.ok) {
      expect(issued.code).toMatch(/^\d{6}$/);
    }
  });

  it("accepts the issued code once and rejects the replay", () => {
    const issued = store.issue("buyer@example.com");
    if (!issued.ok) throw new Error("expected issue to succeed");

    expect(store.verify("buyer@example.com", issued.code)).toEqual({ ok: true });
    expect(store.verify("buyer@example.com", issued.code)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("expires a code after the TTL", () => {
    const issued = store.issue("buyer@example.com");
    if (!issued.ok) throw new Error("expected issue to succeed");

    clock += OTP_TTL_MS - 1;
    expect(store.verify("buyer@example.com", issued.code)).toEqual({ ok: true });

    const second = store.issue("buyer@example.com");
    if (!second.ok) throw new Error("expected second issue to succeed");
    clock += OTP_TTL_MS + 1;
    expect(store.verify("buyer@example.com", second.code)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("burns the code after too many wrong attempts", () => {
    const issued = store.issue("buyer@example.com");
    if (!issued.ok) throw new Error("expected issue to succeed");

    const wrong = issued.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i += 1) {
      expect(store.verify("buyer@example.com", wrong)).toEqual({
        ok: false,
        reason: "mismatch",
        attemptsRemaining: OTP_MAX_ATTEMPTS - (i + 1),
      });
    }

    expect(store.verify("buyer@example.com", wrong)).toEqual({
      ok: false,
      reason: "too_many_attempts",
    });
    // Even the correct code is dead once the attempt budget is spent.
    expect(store.verify("buyer@example.com", issued.code)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("throttles issue requests per key within the window", () => {
    expect(store.issue("buyer@example.com").ok).toBe(true);
    expect(store.issue("buyer@example.com").ok).toBe(true);
    expect(store.issue("buyer@example.com").ok).toBe(true);

    const throttled = store.issue("buyer@example.com");
    expect(throttled.ok).toBe(false);
    if (!throttled.ok) {
      expect(throttled.reason).toBe("rate_limited");
      expect(throttled.retryAfterMs).toBeLessThanOrEqual(OTP_REQUEST_WINDOW_MS);
    }

    // A different key is unaffected.
    expect(store.issue("other@example.com").ok).toBe(true);

    // Once the window rolls over the key may issue again.
    clock += OTP_REQUEST_WINDOW_MS + 1;
    expect(store.issue("buyer@example.com").ok).toBe(true);
  });

  it("treats keys case-insensitively", () => {
    const issued = store.issue("Buyer@Example.com");
    if (!issued.ok) throw new Error("expected issue to succeed");
    expect(store.verify("buyer@example.com", issued.code)).toEqual({ ok: true });
  });
});
