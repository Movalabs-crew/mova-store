// @vitest-environment node
/**
 * Tests for the server-owned POST /api/otp route.
 *
 * This endpoint decides whether a code is sent, whether it is throttled, and
 * whether a submitted code is accepted — so every outcome below is an access
 * control decision, not just a status code:
 *   - the browser can never be told the code,
 *   - issuing is rate limited per email,
 *   - a wrong code is rejected and the attempt is counted,
 *   - a burnt code cannot be retried.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Set before the route module is evaluated: it snapshots the EmailJS config
// into module constants at import time.
vi.hoisted(() => {
  process.env.EMAILJS_SERVICE_ID = "svc_test";
  process.env.EMAILJS_TEMPLATE_ID = "tmpl_test";
  process.env.EMAILJS_PUBLIC_KEY = "key_test";
});

/**
 * The route's responsibility is transport + policy, not code generation. Stand
 * in a deterministic store so every branch can be driven from a test; the real
 * `OtpStore` has its own suite in tests/lib/otp.test.ts.
 */
const store = vi.hoisted(() => ({
  issue: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("../../../lib/otp", () => ({
  OtpStore: class {
    issue(key: string) {
      return store.issue(key);
    }
    verify(key: string, code: string) {
      return store.verify(key, code);
    }
  },
}));

import { POST } from "../../../app/api/otp/route";

const EMAIL = "shopper@example.com";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function stubEmailJs(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("POST /api/otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.issue.mockReturnValue({ ok: true, code: "123456" });
    store.verify.mockReturnValue({ ok: true });
    stubEmailJs(async () => ({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("request validation", () => {
    it("rejects a body that is not valid JSON", async () => {
      const res = await POST(makeRequest("not-json"));

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_json" });
      expect(store.issue).not.toHaveBeenCalled();
    });

    it("rejects a missing or malformed email before touching the store", async () => {
      for (const payload of [
        { action: "send" },
        { action: "send", email: 42 },
        { action: "send", email: "not-an-email" },
        null,
      ]) {
        const res = await POST(makeRequest(payload));

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ ok: false, error: "invalid_email" });
      }
      expect(store.issue).not.toHaveBeenCalled();
    });

    it("rejects an unknown action", async () => {
      const res = await POST(makeRequest({ action: "delete-everything", email: EMAIL }));

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ ok: false, error: "unknown_action" });
      expect(store.issue).not.toHaveBeenCalled();
      expect(store.verify).not.toHaveBeenCalled();
    });
  });

  describe("action=send", () => {
    it("issues a code, emails it, and never returns it to the caller", async () => {
      const fetchMock = stubEmailJs(async () => ({ ok: true }));

      const res = await POST(makeRequest({ action: "send", email: EMAIL }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true, expiresInSeconds: 300 });
      // The code is delivered out of band (email) and must not be in the body.
      expect(JSON.stringify(body)).not.toContain("123456");
      expect(store.issue).toHaveBeenCalledWith(EMAIL);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("normalises the email before issuing so casing cannot spawn a second key", async () => {
      const res = await POST(makeRequest({ action: "send", email: "  ShOpper@Example.COM  " }));

      expect(res.status).toBe(200);
      expect(store.issue).toHaveBeenCalledWith("shopper@example.com");
    });

    it("answers 429 with retry hints when the issue rate limit is hit", async () => {
      store.issue.mockReturnValue({
        ok: false,
        reason: "rate_limited",
        retryAfterMs: 12_000,
      });
      const fetchMock = stubEmailJs(async () => ({ ok: true }));

      const res = await POST(makeRequest({ action: "send", email: EMAIL }));

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("12");
      await expect(res.json()).resolves.toEqual({
        ok: false,
        error: "rate_limited",
        retryAfterSeconds: 12,
      });
      // A throttled request must not reach the mail provider.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rounds the retry hint up so it is never reported as zero seconds", async () => {
      store.issue.mockReturnValue({ ok: false, reason: "rate_limited", retryAfterMs: 400 });

      const res = await POST(makeRequest({ action: "send", email: EMAIL }));

      expect(res.headers.get("Retry-After")).toBe("1");
      expect((await res.json()).retryAfterSeconds).toBe(1);
    });

    it("reports send_failed when the mail provider rejects the request", async () => {
      stubEmailJs(async () => ({ ok: false, status: 500 }));

      const res = await POST(makeRequest({ action: "send", email: EMAIL }));

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({ ok: false, error: "send_failed" });
    });

    it("reports send_failed when the mail provider cannot be reached", async () => {
      stubEmailJs(async () => {
        throw new Error("network down");
      });

      const res = await POST(makeRequest({ action: "send", email: EMAIL }));

      expect(res.status).toBe(502);
      await expect(res.json()).resolves.toEqual({ ok: false, error: "send_failed" });
    });
  });

  describe("action=verify", () => {
    it("accepts a correct code", async () => {
      store.verify.mockReturnValue({ ok: true });

      const res = await POST(makeRequest({ action: "verify", email: EMAIL, code: "123456" }));

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
      expect(store.verify).toHaveBeenCalledWith(EMAIL, "123456");
    });

    it("rejects a wrong code with the attempts left", async () => {
      store.verify.mockReturnValue({ ok: false, reason: "mismatch", attemptsRemaining: 3 });

      const res = await POST(makeRequest({ action: "verify", email: EMAIL, code: "000000" }));

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        ok: false,
        error: "mismatch",
        attemptsRemaining: 3,
      });
    });

    it("rejects a code for an email that was never issued one", async () => {
      store.verify.mockReturnValue({ ok: false, reason: "not_found" });

      const res = await POST(makeRequest({ action: "verify", email: EMAIL, code: "123456" }));

      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ ok: false, error: "not_found" });
    });

    it("answers 429 once the attempt budget is exhausted", async () => {
      store.verify.mockReturnValue({ ok: false, reason: "too_many_attempts" });

      const res = await POST(makeRequest({ action: "verify", email: EMAIL, code: "000000" }));

      expect(res.status).toBe(429);
      await expect(res.json()).resolves.toEqual({ ok: false, error: "too_many_attempts" });
    });

    it("treats a missing or non-string code as an empty attempt rather than throwing", async () => {
      store.verify.mockReturnValue({ ok: false, reason: "mismatch", attemptsRemaining: 4 });

      const res = await POST(makeRequest({ action: "verify", email: EMAIL }));

      expect(res.status).toBe(400);
      expect(store.verify).toHaveBeenCalledWith(EMAIL, "");
    });

    it("trims whitespace around the submitted code", async () => {
      await POST(makeRequest({ action: "verify", email: EMAIL, code: "  123456  " }));

      expect(store.verify).toHaveBeenCalledWith(EMAIL, "123456");
    });
  });
});
