import { describe, it, expect } from "vitest";
import {
  parseError,
  createError,
  getUserMessage,
  isRecoverable,
  STELLAR_ERRORS,
} from "../lib/errors";
import { WalletError } from "../lib/stellar/freighter";

describe("Error Classification and Helpers (lib/errors.ts)", () => {
  describe("createError", () => {
    it("creates an AppError with default options", () => {
      const err = createError("CUSTOM_ERR", "Something went wrong", "Please try again.");
      expect(err).toEqual({
        code: "CUSTOM_ERR",
        message: "Something went wrong",
        userMessage: "Please try again.",
        severity: "error",
        recoverable: true,
        action: undefined,
      });
    });

    it("creates an AppError with custom options", () => {
      const err = createError(
        "FATAL_ERR",
        "Unrecoverable failure",
        "Please contact support.",
        {
          severity: "warning",
          recoverable: false,
          action: "Contact Support",
        }
      );
      expect(err).toEqual({
        code: "FATAL_ERR",
        message: "Unrecoverable failure",
        userMessage: "Please contact support.",
        severity: "warning",
        recoverable: false,
        action: "Contact Support",
      });
    });
  });

  describe("parseError", () => {
    it("handles null and undefined gracefully", () => {
      const nullErr = parseError(null);
      expect(nullErr.code).toBe("UNKNOWN_ERROR");
      expect(nullErr.userMessage).toContain("An unexpected error occurred");

      const undefErr = parseError(undefined);
      expect(undefErr.code).toBe("UNKNOWN_ERROR");
    });

    it("parses WalletError with recognized code", () => {
      const walletErr = new WalletError("FREIGHTER_NOT_FOUND", "Freighter extension missing");
      const parsed = parseError(walletErr);
      expect(parsed.code).toBe("WALLET_NOT_INSTALLED");
      expect(parsed.userMessage).toContain("Freighter");
      expect(parsed.recoverable).toBe(true);
    });

    it("parses Error objects with code property", () => {
      const customErr = Object.assign(new Error("Denied"), { code: "FREIGHTER_REQUEST_DENIED" });
      const parsed = parseError(customErr);
      expect(parsed.code).toBe("WALLET_REQUEST_DENIED");
      expect(parsed.recoverable).toBe(true);
    });

    it("parses string error messages by substring", () => {
      const parsed = parseError("User declined the transaction");
      expect(parsed.userMessage).toBeDefined();
    });

    it("falls back to generic error for unknown error string", () => {
      const parsed = parseError("Some very random non-matching error");
      expect(parsed.message).toBe("Some very random non-matching error");
      expect(parsed.userMessage).toBe("Some very random non-matching error");
    });

    it("handles plain objects with message property", () => {
      const objErr = { message: "Network connection lost" };
      const parsed = parseError(objErr);
      expect(parsed.message).toBe("Network connection lost");
    });
  });

  describe("getUserMessage", () => {
    it("returns userMessage from string error", () => {
      const msg = getUserMessage("Simple error");
      expect(msg).toBe("Simple error");
    });

    it("returns userMessage from WalletError", () => {
      const walletErr = new WalletError("FREIGHTER_NOT_FOUND", "Wallet missing");
      const msg = getUserMessage(walletErr);
      expect(msg).toContain("install the Freighter wallet");
    });

    it("returns fallback message for null input", () => {
      const msg = getUserMessage(null);
      expect(msg).toContain("An unexpected error occurred");
    });
  });

  describe("isRecoverable", () => {
    it("returns true for recoverable errors like FREIGHTER_NOT_FOUND", () => {
      const walletErr = new WalletError("FREIGHTER_NOT_FOUND", "Wallet missing");
      expect(isRecoverable(walletErr)).toBe(true);
    });

    it("returns recoverable property for parsed error objects", () => {
      expect(isRecoverable(null)).toBe(true);
    });
  });
});
