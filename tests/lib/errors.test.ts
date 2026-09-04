import { describe, it, expect } from "vitest";
import { parseError, createError, getUserMessage, isRecoverable } from "../../lib/errors";

describe("parseError precedence", () => {
  it("prioritizes auth email not confirmed over cancelled keyword heuristic", () => {
    const error = parseError("Email not confirmed: you cancelled the verification request");
    expect(error.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");
    expect(error.message).toBe("Email not confirmed");
    expect(error.userMessage).toBe("Please confirm your email before signing in.");
  });

  it("prioritizes auth user already registered over timeout keyword heuristic", () => {
    const error = parseError("User already registered: network request timed out");
    expect(error.code).toBe("AUTH_EMAIL_EXISTS");
  });

  it("prioritizes auth invalid credentials over rejected keyword heuristic", () => {
    const error = parseError("Invalid login credentials: authentication rejected by server");
    expect(error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("prioritizes auth weak password over insufficient balance keyword heuristic", () => {
    const error = parseError("Password should be at least 6 characters (insufficient entropy)");
    expect(error.code).toBe("AUTH_WEAK_PASSWORD");
  });

  it("prioritizes auth invalid email over freighter install keyword heuristic", () => {
    const error = parseError("Unable to validate email address: invalid format install freighter");
    expect(error.code).toBe("AUTH_INVALID_EMAIL");
  });

  it("maps pure Stellar cancellation message to UserRejected", () => {
    const error = parseError("Transaction cancelled by user");
    expect(error.code).toBe("WALLET_USER_REJECTED");
    expect(error.userMessage).toBe(
      "You cancelled the transaction. Click 'Pay' again when you're ready."
    );
  });

  it("maps pure Stellar rejection message to UserRejected", () => {
    const error = parseError("User rejected the signing request");
    expect(error.code).toBe("WALLET_USER_REJECTED");
  });

  it("maps pure Stellar insufficient balance message to InsufficientBalance", () => {
    const error = parseError("Account balance is insufficient to cover fees");
    expect(error.code).toBe("ACCOUNT_INSUFFICIENT_BALANCE");
  });

  it("maps pure Stellar timeout message to TransactionTimeout", () => {
    const error = parseError("Transaction timed out while waiting for ledger");
    expect(error.code).toBe("TX_TIMEOUT");
  });

  it("maps pure Stellar network error message to NetworkError", () => {
    const error = parseError("Lost network connection to Horizon");
    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("maps Freighter installation message to WalletNotInstalled", () => {
    const error = parseError("Please install freighter extension");
    expect(error.code).toBe("WALLET_NOT_INSTALLED");
  });
});

describe("parseError input types", () => {
  it("handles null and undefined input", () => {
    expect(parseError(null).code).toBe("UNKNOWN_ERROR");
    expect(parseError(undefined).code).toBe("UNKNOWN_ERROR");
  });

  it("handles Error instances with message matching auth errors", () => {
    const err = new Error("Email not confirmed: you cancelled the verification request");
    const parsed = parseError(err);
    expect(parsed.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");
  });

  it("handles Error instances with auth code property", () => {
    const err = Object.assign(new Error("Generic auth message"), {
      code: "Email not confirmed",
    });
    const parsed = parseError(err);
    expect(parsed.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");
  });

  it("handles objects with message property", () => {
    const errObj = { message: "Transaction cancelled by user" };
    const parsed = parseError(errObj);
    expect(parsed.code).toBe("WALLET_USER_REJECTED");
  });

  it("handles unknown string errors and preserves message if short", () => {
    const parsed = parseError("Some unrecognized error message");
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.message).toBe("Some unrecognized error message");
    expect(parsed.userMessage).toBe("Some unrecognized error message");
  });

  it("handles unknown string errors with fallback message when overly long", () => {
    const longMessage = "x".repeat(120);
    const parsed = parseError(longMessage);
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.userMessage).toBe("An error occurred. Please try again.");
  });

  it("handles non-object non-string primitives", () => {
    expect(parseError(12345).code).toBe("UNKNOWN_ERROR");
    expect(parseError(true).code).toBe("UNKNOWN_ERROR");
  });
});

describe("createError helper", () => {
  it("creates custom AppError with provided parameters and defaults", () => {
    const err = createError("CUSTOM_ERR", "Technical error", "User friendly error");
    expect(err.code).toBe("CUSTOM_ERR");
    expect(err.message).toBe("Technical error");
    expect(err.userMessage).toBe("User friendly error");
    expect(err.severity).toBe("error");
    expect(err.recoverable).toBe(true);
  });

  it("creates custom AppError with options", () => {
    const err = createError("CUSTOM_WARN", "Technical warn", "User friendly warn", {
      severity: "warning",
      recoverable: false,
      action: "Contact support",
    });
    expect(err.severity).toBe("warning");
    expect(err.recoverable).toBe(false);
    expect(err.action).toBe("Contact support");
  });
});

describe("getUserMessage helper", () => {
  it("returns userMessage from parsed error", () => {
    expect(getUserMessage("Email not confirmed: you cancelled the verification request")).toBe(
      "Please confirm your email before signing in."
    );
    expect(getUserMessage("Transaction cancelled by user")).toBe(
      "You cancelled the transaction. Click 'Pay' again when you're ready."
    );
  });
});

describe("isRecoverable helper", () => {
  it("returns recoverable status from parsed error", () => {
    expect(isRecoverable("Email not confirmed: you cancelled the verification request")).toBe(true);
    expect(isRecoverable("STELLAR_NOT_INITIALIZED")).toBe(false);
  });
});
