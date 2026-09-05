import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @emailjs/browser
const mockSend = vi.fn();
vi.mock("@emailjs/browser", () => ({
  default: {
    send: (...args: unknown[]) => mockSend(...args),
  },
}));

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

  describe("sendMail execution", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "srv_test_id");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "tmpl_test_id");
      vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "pub_key_test");
      vi.stubEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL", "default_recipient@example.com");
    });

    it("resolves the emailjs response and passes correct service, template, params, and key", async () => {
      mockSend.mockResolvedValueOnce({
        status: 200,
        text: "OK",
      });

      const { default: sendMail } = await import("../../lib/sendmail");

      const result = await sendMail({
        name: "Carol",
        email: "carol@example.com",
        message: "Message text here",
        recipientEmail: "custom_dest@example.com",
        subject: "Custom Subject",
      });

      expect(result).toEqual({ status: 200, text: "OK" });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        "srv_test_id",
        "tmpl_test_id",
        {
          name: "Carol",
          email: "carol@example.com",
          message: "Message text here",
          recipient_email: "custom_dest@example.com",
          subject: "Custom Subject",
        },
        "pub_key_test"
      );
    });

    it("falls back recipient_email to NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL when recipientEmail is omitted", async () => {
      mockSend.mockResolvedValueOnce({
        status: 200,
        text: "OK",
      });

      const { default: sendMail } = await import("../../lib/sendmail");

      const result = await sendMail({
        name: "Dave",
        email: "dave@example.com",
        message: "Default recipient test",
        subject: "Default Recipient",
      });

      expect(result).toEqual({ status: 200, text: "OK" });
      expect(mockSend).toHaveBeenCalledWith(
        "srv_test_id",
        "tmpl_test_id",
        {
          name: "Dave",
          email: "dave@example.com",
          message: "Default recipient test",
          recipient_email: "default_recipient@example.com",
          subject: "Default Recipient",
        },
        "pub_key_test"
      );
    });

    it("handles default empty strings for omitted optional arguments", async () => {
      mockSend.mockResolvedValueOnce({
        status: 200,
        text: "OK",
      });

      const { default: sendMail } = await import("../../lib/sendmail");

      // @ts-expect-error test optional fields defaulting
      const result = await sendMail({});

      expect(result).toEqual({ status: 200, text: "OK" });
      expect(mockSend).toHaveBeenCalledWith(
        "srv_test_id",
        "tmpl_test_id",
        {
          name: "",
          email: "",
          message: "",
          recipient_email: "default_recipient@example.com",
          subject: undefined,
        },
        "pub_key_test"
      );
    });

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
