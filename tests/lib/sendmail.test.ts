import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @emailjs/browser
const mockSend = vi.fn();
vi.mock("@emailjs/browser", () => ({
  default: {
    send: (...args: unknown[]) => mockSend(...args),
  },
}));

const BASE_ENV = {
  NEXT_PUBLIC_EMAILJS_SERVICE_ID: "srv_test_id",
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: "tmpl_test_id",
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: "pub_key_test",
  NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL: "default_recipient@example.com",
};

const stubBaseEnv = () => {
  for (const [key, value] of Object.entries(BASE_ENV)) vi.stubEnv(key, value);
};

describe("lib/sendmail.js", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("validateEmailConfig / missing env vars", () => {
    it("throws naming all missing NEXT_PUBLIC_EMAILJS_* variables when none are set", async () => {
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");
      vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "");

      const { default: sendMail } = await import("../../lib/sendmail");

      await expect(
        sendMail({
          name: "Alice",
          email: "alice@example.com",
          message: "Hello world",
          subject: "Test Subject",
        })
      ).rejects.toThrow(
        /Missing required EmailJS configuration.*NEXT_PUBLIC_EMAILJS_SERVICE_ID.*NEXT_PUBLIC_EMAILJS_TEMPLATE_ID.*NEXT_PUBLIC_EMAILJS_PUBLIC_KEY/
      );
    });

    it("throws naming specific missing variables when only some are unset", async () => {
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service_123");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");

      const { default: sendMail } = await import("../../lib/sendmail");

      await expect(
        sendMail({
          name: "Bob",
          email: "bob@example.com",
          message: "Testing partial config",
          subject: "Partial Config",
        })
      ).rejects.toThrow(
        /Missing required EmailJS configuration\. Please set the following environment variables: NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, NEXT_PUBLIC_EMAILJS_PUBLIC_KEY\./
      );
    });
  });

  describe("recipient pinning and header injection", () => {
    beforeEach(stubBaseEnv);

    it("sends to the validated sender and ignores a caller-chosen recipient", async () => {
      mockSend.mockResolvedValueOnce({ status: 200, text: "OK" });

      const { default: sendMail } = await import("../../lib/sendmail");

      const result = await sendMail({
        name: "Carol",
        email: "Carol@Example.com",
        message: "Message text here",
        // Legacy caller-supplied recipient must not be honoured.
        recipientEmail: "attacker@evil.example",
        subject: "Custom Subject",
      } as Parameters<typeof sendMail>[0] & { recipientEmail: string });

      expect(result).toEqual({ status: 200, text: "OK" });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0][2]).toMatchObject({
        name: "Carol",
        email: "carol@example.com",
        recipient_email: "carol@example.com",
      });
      expect(mockSend.mock.calls[0][2].recipient_email).not.toBe("attacker@evil.example");
    });

    it("strips CRLF from the subject so it cannot inject a header", async () => {
      mockSend.mockResolvedValueOnce({ status: 200, text: "OK" });

      const { default: sendMail } = await import("../../lib/sendmail");

      await sendMail({
        name: "Carol",
        email: "carol@example.com",
        message: "Hi",
        subject: "Hello\r\nBcc: evil@evil.example",
      });

      const params = mockSend.mock.calls[0][2];
      expect(params.subject).toBe("Hello Bcc: evil@evil.example");
      expect(params.subject).not.toMatch(/[\r\n]/);
    });

    it("rejects a name carrying a header-injection payload", async () => {
      const { default: sendMail } = await import("../../lib/sendmail");

      await expect(
        sendMail({
          name: "Carol\r\nBcc: evil@evil.example",
          email: "carol@example.com",
          message: "Hi",
        })
      ).rejects.toThrow(/Name/);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("rejects an invalid sender email", async () => {
      const { default: sendMail } = await import("../../lib/sendmail");

      await expect(
        sendMail({ name: "Carol", email: "not-an-email", message: "Hi" })
      ).rejects.toThrow(/valid email/i);

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("rate limiting", () => {
    beforeEach(() => {
      stubBaseEnv();
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_RATE_LIMIT_MAX", "1");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_RATE_LIMIT_WINDOW_MS", "60000");
    });

    it("blocks a burst beyond the configured send budget", async () => {
      mockSend.mockResolvedValue({ status: 200, text: "OK" });

      const { default: sendMail } = await import("../../lib/sendmail");

      await sendMail({ name: "Carol", email: "carol@example.com", message: "one" });
      await expect(
        sendMail({ name: "Carol", email: "carol@example.com", message: "two" })
      ).rejects.toThrow(/Too many email requests/i);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("sendMail execution", () => {
    beforeEach(stubBaseEnv);

    it("rejects and rethrows when emailjs.send fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const errorObj = new Error("Network / SMTP error");
      mockSend.mockRejectedValueOnce(errorObj);

      const { default: sendMail } = await import("../../lib/sendmail");

      await expect(
        sendMail({
          name: "Eve",
          email: "eve@example.com",
          message: "Fail test",
          subject: "Failure",
        })
      ).rejects.toThrow("Network / SMTP error");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error sending email:", errorObj);
      consoleErrorSpy.mockRestore();
    });
  });
});
