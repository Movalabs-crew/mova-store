// @vitest-environment node
/**
 * Tests for the browser-side OTP client.
 *
 * The checkout UI relies on this to talk to /api/otp, so what matters here is
 * that every server answer — including a malformed or unreachable one — is
 * mapped onto a predictable result instead of throwing into React.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestOtp, verifyOtp } from "../../lib/otp-client";

function stubFetch(response: unknown) {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lib/otp-client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks the server to send a code for the given email", async () => {
    const fetchMock = stubFetch({ json: async () => ({ ok: true }) });

    const result = await requestOtp("shopper@example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/otp",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "send", email: "shopper@example.com" }),
      })
    );
    expect(result.ok).toBe(true);
  });

  it("asks the server to verify a code, sending the action and code", async () => {
    const fetchMock = stubFetch({ json: async () => ({ ok: true }) });

    await verifyOtp("shopper@example.com", "123456");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/otp",
      expect.objectContaining({
        body: JSON.stringify({
          action: "verify",
          email: "shopper@example.com",
          code: "123456",
        }),
      })
    );
  });

  it("surfaces the error and the retry hint from a rate-limited send", async () => {
    stubFetch({
      json: async () => ({ ok: false, error: "rate_limited", retryAfterSeconds: 30 }),
    });

    const result = await requestOtp("shopper@example.com");

    expect(result).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 30,
      attemptsRemaining: undefined,
    });
  });

  it("surfaces the attempts left after a mismatch", async () => {
    stubFetch({
      json: async () => ({ ok: false, error: "mismatch", attemptsRemaining: 4 }),
    });

    const result = await verifyOtp("shopper@example.com", "000000");

    expect(result).toEqual({
      ok: false,
      error: "mismatch",
      retryAfterSeconds: undefined,
      attemptsRemaining: 4,
    });
  });

  it("reports a network error instead of throwing when the request fails", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestOtp("shopper@example.com");

    expect(result).toEqual({ ok: false, error: "network_error" });
  });

  it("reports a failure when the response body is not JSON", async () => {
    stubFetch({
      json: async () => {
        throw new Error("Unexpected token < in JSON");
      },
    });

    const result = await verifyOtp("shopper@example.com", "123456");

    // A 502 HTML error page must not be mistaken for an accepted code.
    expect(result.ok).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("ignores fields of the wrong type rather than trusting the payload", async () => {
    stubFetch({
      json: async () => ({
        ok: 1,
        error: 42,
        retryAfterSeconds: "30",
        attemptsRemaining: null,
      }),
    });

    const result = await requestOtp("shopper@example.com");

    expect(result).toEqual({
      ok: true,
      error: undefined,
      retryAfterSeconds: undefined,
      attemptsRemaining: undefined,
    });
  });

  it("treats a response with no ok field as a failure", async () => {
    stubFetch({ json: async () => ({}) });

    const result = await requestOtp("shopper@example.com");

    expect(result.ok).toBe(false);
  });
});
