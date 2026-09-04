import { describe, it, expect } from "vitest";
import { parseError, createError, getUserMessage, isRecoverable } from "../../lib/errors";

describe("parseError", () => {
  describe("null, undefined, and falsy handling", () => {
    it("returns UNKNOWN_ERROR for null", () => {
      const error = parseError(null);
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.message).toBe("Unknown error");
      expect(error.userMessage).toBe("Something unexpected happened. Please try again.");
      expect(error.severity).toBe("error");
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Retry");
    });

    it("returns UNKNOWN_ERROR for undefined", () => {
      const error = parseError(undefined);
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.message).toBe("Unknown error");
      expect(error.userMessage).toBe("Something unexpected happened. Please try again.");
      expect(error.severity).toBe("error");
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Retry");
    });

    it("returns UNKNOWN_ERROR for falsy non-string inputs", () => {
      expect(parseError(0).code).toBe("UNKNOWN_ERROR");
      expect(parseError(false).code).toBe("UNKNOWN_ERROR");
      expect(parseError("").code).toBe("UNKNOWN_ERROR");
    });

    it("returns UNKNOWN_ERROR for empty objects lacking a message property", () => {
      expect(parseError({}).code).toBe("UNKNOWN_ERROR");
      expect(parseError({ code: "SOME_UNRECOGNIZED_CODE" }).code).toBe("UNKNOWN_ERROR");
    });
  });

  describe("Stellar error resolution and case insensitivity", () => {
    it("resolves OrderAlreadyPaid from an Error instance", () => {
      const error = parseError(new Error("OrderAlreadyPaid"));
      expect(error.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(error.message).toBe("Order already paid");
      expect(error.userMessage).toBe(
        "This order has already been paid. If you believe this is an error, please contact support."
      );
      expect(error.severity).toBe("warning");
      expect(error.recoverable).toBe(false);
    });

    it("resolves OrderAlreadyPaid from lower-case string", () => {
      const error = parseError("order already paid");
      expect(error.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(error.message).toBe("Order already paid");
      expect(error.userMessage).toBe(
        "This order has already been paid. If you believe this is an error, please contact support."
      );
      expect(error.severity).toBe("warning");
      expect(error.recoverable).toBe(false);
    });

    it("resolves Stellar error by code matching", () => {
      const error = parseError("STELLAR_NOT_INITIALIZED");
      expect(error.code).toBe("STELLAR_NOT_INITIALIZED");
      expect(error.message).toBe("Contract not initialized");
      expect(error.userMessage).toBe(
        "The payment system is not configured. Please contact support."
      );
      expect(error.recoverable).toBe(false);
    });

    it("resolves NotInitialized error by key", () => {
      const error = parseError("NotInitialized");
      expect(error.code).toBe("STELLAR_NOT_INITIALIZED");
      expect(error.recoverable).toBe(false);
    });

    it("resolves AlreadyInitialized error", () => {
      const error = parseError("AlreadyInitialized");
      expect(error.code).toBe("STELLAR_ALREADY_INITIALIZED");
      expect(error.severity).toBe("warning");
      expect(error.recoverable).toBe(false);
    });

    it("resolves InvalidAmount error", () => {
      const error = parseError("InvalidAmount");
      expect(error.code).toBe("STELLAR_INVALID_AMOUNT");
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Check cart total");
    });

    it("resolves OrderNotFound error", () => {
      const error = parseError("OrderNotFound");
      expect(error.code).toBe("STELLAR_ORDER_NOT_FOUND");
      expect(error.recoverable).toBe(false);
    });

    it("resolves TokenNotAllowed error", () => {
      const error = parseError("TokenNotAllowed");
      expect(error.code).toBe("STELLAR_TOKEN_NOT_ALLOWED");
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Try different token");
    });

    it("resolves InvalidOrderStatus error", () => {
      const error = parseError("InvalidOrderStatus");
      expect(error.code).toBe("STELLAR_INVALID_ORDER_STATUS");
      expect(error.recoverable).toBe(false);
    });
  });

  describe("Common Stellar error message patterns", () => {
    it("maps Insufficient USDC balance to ACCOUNT_INSUFFICIENT_BALANCE", () => {
      const error = parseError("Insufficient USDC balance");
      expect(error.code).toBe("ACCOUNT_INSUFFICIENT_BALANCE");
      expect(error.message).toBe("Insufficient balance");
      expect(error.userMessage).toBe(
        "You don't have enough funds to complete this payment. Please add more to your wallet."
      );
      expect(error.severity).toBe("error");
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Add funds");
    });

    it("maps balance keywords to ACCOUNT_INSUFFICIENT_BALANCE", () => {
      const error = parseError("Current balance is too low");
      expect(error.code).toBe("ACCOUNT_INSUFFICIENT_BALANCE");
      expect(error.recoverable).toBe(true);
    });

    it("maps rejected or cancelled keywords to WALLET_USER_REJECTED", () => {
      const rejectedError = parseError("Transaction was rejected by user");
      expect(rejectedError.code).toBe("WALLET_USER_REJECTED");
      expect(rejectedError.severity).toBe("info");
      expect(rejectedError.recoverable).toBe(true);

      const cancelledError = parseError("Payment cancelled");
      expect(cancelledError.code).toBe("WALLET_USER_REJECTED");
      expect(cancelledError.recoverable).toBe(true);
    });

    it("maps timeout or timed out keywords to TX_TIMEOUT", () => {
      const timeoutError = parseError("Request timeout reached");
      expect(timeoutError.code).toBe("TX_TIMEOUT");
      expect(timeoutError.action).toBe("Check wallet");

      const timedOutError = parseError("The transaction timed out");
      expect(timedOutError.code).toBe("TX_TIMEOUT");
    });

    it("maps network or connection keywords to NETWORK_ERROR", () => {
      const networkError = parseError("Stellar network is unreachable");
      expect(networkError.code).toBe("NETWORK_ERROR");
      expect(networkError.action).toBe("Retry");

      const connectionError = parseError("Lost connection to Horizon RPC");
      expect(connectionError.code).toBe("NETWORK_ERROR");
    });

    it("maps freighter and install combined keywords to WALLET_NOT_INSTALLED", () => {
      const error = parseError("Please install Freighter wallet extension");
      expect(error.code).toBe("WALLET_NOT_INSTALLED");
      expect(error.action).toBe("Install Freighter");
    });

    it("does not match WALLET_NOT_INSTALLED if freighter keyword is present without install", () => {
      const error = parseError("Freighter error occurred");
      expect(error.code).not.toBe("WALLET_NOT_INSTALLED");
    });
  });

  describe("Auth error resolution and error.code precedence", () => {
    it("prioritizes error.code matching AUTH_ERRORS on Error objects", () => {
      const authError = Object.assign(new Error("Custom wrapped failure"), {
        code: "User already registered",
      });
      const parsed = parseError(authError);
      expect(parsed.code).toBe("AUTH_EMAIL_EXISTS");
      expect(parsed.message).toBe("Email already in use");
      expect(parsed.userMessage).toBe("This email is already registered. Try logging in instead.");
      expect(parsed.severity).toBe("warning");
      expect(parsed.recoverable).toBe(true);
      expect(parsed.action).toBe("Login");
    });

    it("falls back to message parsing if error.code does not match AUTH_ERRORS", () => {
      const genericWithUnmatchedCode = Object.assign(new Error("OrderAlreadyPaid"), {
        code: "UNKNOWN_CUSTOM_CODE",
      });
      const parsed = parseError(genericWithUnmatchedCode);
      expect(parsed.code).toBe("STELLAR_ORDER_ALREADY_PAID");
    });

    it("matches Auth error messages by substring", () => {
      const invalidCreds = parseError("Invalid login credentials provided");
      expect(invalidCreds.code).toBe("AUTH_INVALID_CREDENTIALS");
      expect(invalidCreds.userMessage).toBe("Incorrect email or password. Please try again.");

      const unconfirmed = parseError("Email not confirmed yet");
      expect(unconfirmed.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");

      const weakPass = parseError("Password should be at least 6 characters");
      expect(weakPass.code).toBe("AUTH_WEAK_PASSWORD");

      const invalidEmail = parseError("Unable to validate email address: invalid format");
      expect(invalidEmail.code).toBe("AUTH_INVALID_EMAIL");
    });

    it("matches Auth errors by code string", () => {
      expect(parseError("AUTH_EMAIL_EXISTS").code).toBe("AUTH_EMAIL_EXISTS");
      expect(parseError("AUTH_INVALID_CREDENTIALS").code).toBe("AUTH_INVALID_CREDENTIALS");
      expect(parseError("AUTH_WEAK_PASSWORD").code).toBe("AUTH_WEAK_PASSWORD");
    });
  });

  describe("Objects with message property", () => {
    it("parses error from a plain object with message property", () => {
      const obj = { message: "OrderAlreadyPaid" };
      const parsed = parseError(obj);
      expect(parsed.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(parsed.userMessage).toBe(
        "This order has already been paid. If you believe this is an error, please contact support."
      );
    });

    it("coerces non-string message property to string", () => {
      const obj = { message: 500 };
      const parsed = parseError(obj);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe("500");
    });
  });

  describe("Fallback behavior and character length threshold", () => {
    it("preserves original userMessage for unclassified errors of 100 characters or fewer", () => {
      const shortMessage = "Database row was temporarily locked by another transaction";
      expect(shortMessage.length).toBeLessThanOrEqual(100);

      const parsed = parseError(shortMessage);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(shortMessage);
      expect(parsed.userMessage).toBe(shortMessage);
      expect(parsed.severity).toBe("error");
      expect(parsed.recoverable).toBe(true);
      expect(parsed.action).toBe("Retry");
    });

    it("preserves original userMessage at exactly 100 characters", () => {
      const boundaryMessage = "a".repeat(100);
      const parsed = parseError(boundaryMessage);
      expect(parsed.message).toBe(boundaryMessage);
      expect(parsed.userMessage).toBe(boundaryMessage);
    });

    it("falls back to generic userMessage when message exceeds 100 characters", () => {
      const longMessage =
        "This is an unclassified database transaction serialization failure with extra diagnostic telemetry that exceeds one hundred chars";
      expect(longMessage.length).toBeGreaterThan(100);

      const parsed = parseError(longMessage);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(longMessage);
      expect(parsed.userMessage).toBe("An error occurred. Please try again.");
      expect(parsed.recoverable).toBe(true);
    });
  });
});

describe("getUserMessage", () => {
  it("extracts userMessage from known Stellar error strings", () => {
    expect(getUserMessage("order already paid")).toBe(
      "This order has already been paid. If you believe this is an error, please contact support."
    );
  });

  it("extracts userMessage from Insufficient USDC balance", () => {
    expect(getUserMessage("Insufficient USDC balance")).toBe(
      "You don't have enough funds to complete this payment. Please add more to your wallet."
    );
  });

  it("extracts userMessage from null", () => {
    expect(getUserMessage(null)).toBe("Something unexpected happened. Please try again.");
  });

  it("extracts userMessage from undefined", () => {
    expect(getUserMessage(undefined)).toBe("Something unexpected happened. Please try again.");
  });

  it("extracts userMessage from Error instances", () => {
    const error = new Error("TokenNotAllowed");
    expect(getUserMessage(error)).toBe(
      "This payment token is not accepted. Please try a different payment method."
    );
  });

  it("returns fallback userMessage for errors exceeding 100 characters", () => {
    const longError = "Z".repeat(101);
    expect(getUserMessage(longError)).toBe("An error occurred. Please try again.");
  });
});

describe("isRecoverable", () => {
  it("returns false for non-recoverable Stellar errors", () => {
    expect(isRecoverable("OrderAlreadyPaid")).toBe(false);
    expect(isRecoverable("order already paid")).toBe(false);
    expect(isRecoverable("NotInitialized")).toBe(false);
    expect(isRecoverable("OrderNotFound")).toBe(false);
    expect(isRecoverable("InvalidOrderStatus")).toBe(false);
  });

  it("returns true for recoverable Stellar errors", () => {
    expect(isRecoverable("Insufficient USDC balance")).toBe(true);
    expect(isRecoverable("Network error")).toBe(true);
    expect(isRecoverable("Transaction timed out")).toBe(true);
    expect(isRecoverable("InvalidAmount")).toBe(true);
    expect(isRecoverable("Wallet not connected")).toBe(true);
  });

  it("returns true for default unknown and null errors", () => {
    expect(isRecoverable(null)).toBe(true);
    expect(isRecoverable(undefined)).toBe(true);
    expect(isRecoverable("Custom unexpected error")).toBe(true);
  });
});

describe("createError", () => {
  it("creates custom AppError with default severity and recoverable flags", () => {
    const custom = createError(
      "CUSTOM_PAYMENT_ERROR",
      "Payment channel saturated",
      "Payment could not be processed at this time."
    );
    expect(custom.code).toBe("CUSTOM_PAYMENT_ERROR");
    expect(custom.message).toBe("Payment channel saturated");
    expect(custom.userMessage).toBe("Payment could not be processed at this time.");
    expect(custom.severity).toBe("error");
    expect(custom.recoverable).toBe(true);
    expect(custom.action).toBeUndefined();
  });

  it("accepts custom option overrides", () => {
    const custom = createError(
      "DEPOSIT_PENDING",
      "Deposit awaiting confirmation",
      "Your deposit is being verified.",
      {
        severity: "warning",
        recoverable: false,
        action: "View status",
      }
    );
    expect(custom.severity).toBe("warning");
    expect(custom.recoverable).toBe(false);
    expect(custom.action).toBe("View status");
  });
});
