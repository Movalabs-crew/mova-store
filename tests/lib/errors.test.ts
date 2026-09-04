import { describe, it, expect } from "vitest";

import {
  parseError,
  STELLAR_ERRORS,
  createError,
  getUserMessage,
  isRecoverable,
} from "../../lib/errors";
import { WalletError } from "../../lib/stellar/freighter";

describe("Error Handling & Stellar Error Reconciliation Tests", () => {
  it("classifies WalletError instances by their .code property", () => {
    const errFreighterNotFound = new WalletError("Extension missing", "FREIGHTER_NOT_FOUND");
    const parsedFreighterNotFound = parseError(errFreighterNotFound);
    expect(parsedFreighterNotFound.code).toBe("WALLET_NOT_INSTALLED");
    expect(parsedFreighterNotFound.userMessage).toContain("Freighter wallet extension");

    const errWrongNetwork = new WalletError("Wrong net detected", "WRONG_NETWORK");
    const parsedWrongNetwork = parseError(errWrongNetwork);
    expect(parsedWrongNetwork.code).toBe("WALLET_WRONG_NETWORK");

    const errTxSend = new WalletError("Tx failed", "TX_SEND_ERROR");
    const parsedTxSend = parseError(errTxSend);
    expect(parsedTxSend.code).toBe("TX_FAILED");

    const errSim = new WalletError("Sim failed", "TX_SIMULATION_ERROR");
    const parsedSim = parseError(errSim);
    expect(parsedSim.code).toBe("TX_SIMULATION_FAILED");

    const errContract = new WalletError("No contract ID", "CONTRACT_NOT_CONFIGURED");
    const parsedContract = parseError(errContract);
    expect(parsedContract.code).toBe("STELLAR_CONTRACT_NOT_CONFIGURED");
  });

  it("ensures every STELLAR_ERRORS code maps to a defined and emitted code key", () => {
    const expectedKeys = [
      "FREIGHTER_NOT_FOUND",
      "FREIGHTER_REQUEST_DENIED",
      "FREIGHTER_NETWORK_ERROR",
      "WRONG_NETWORK",
      "FREIGHTER_SIGN_ERROR",
      "USER_REJECTED",
      "ACCOUNT_NOT_FOUND",
      "FRIENDBOT_ERROR",
      "PAYMENT_NOT_READY",
      "INSUFFICIENT_BALANCE",
      "NO_TRUSTLINE",
      "CONTRACT_NOT_CONFIGURED",
      "INVALID_AMOUNT",
      "TX_SIMULATION_ERROR",
      "TX_SEND_ERROR",
      "TX_TIMEOUT",
    ];

    for (const key of expectedKeys) {
      expect(STELLAR_ERRORS[key]).toBeDefined();
      expect(STELLAR_ERRORS[key].code).toBeTruthy();
      expect(STELLAR_ERRORS[key].userMessage).toBeTruthy();
    }
  });

  it("handles string messages, null/undefined, and custom AppErrors properly", () => {
    expect(parseError(null).code).toBe("UNKNOWN_ERROR");
    expect(parseError(undefined).code).toBe("UNKNOWN_ERROR");

    const custom = createError("CUSTOM_CODE", "Internal msg", "Friendly msg", {
      severity: "warning",
      recoverable: false,
    });
    expect(custom.code).toBe("CUSTOM_CODE");
    expect(custom.userMessage).toBe("Friendly msg");
    expect(custom.severity).toBe("warning");
    expect(custom.recoverable).toBe(false);

    expect(getUserMessage(new WalletError("Funds low", "INSUFFICIENT_BALANCE"))).toContain(
      "don't have enough funds"
    );
    expect(isRecoverable(new WalletError("Wrong net", "WRONG_NETWORK"))).toBe(true);
  });
});

describe("parseError", () => {
  describe("null and undefined inputs", () => {
    it("returns GENERAL_ERRORS.Unknown for null", () => {
      const error = parseError(null);
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.message).toBe("Unknown error");
      expect(error.userMessage).toBe("Something unexpected happened. Please try again.");
      expect(error.severity).toBe("error");
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Retry");
    });

    it("returns GENERAL_ERRORS.Unknown for undefined", () => {
      const error = parseError(undefined);
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.message).toBe("Unknown error");
      expect(error.userMessage).toBe("Something unexpected happened. Please try again.");
      expect(error.recoverable).toBe(true);
    });

    it("returns GENERAL_ERRORS.Unknown for non-string, non-error primitives", () => {
      expect(parseError(0).code).toBe("UNKNOWN_ERROR");
      expect(parseError(false).code).toBe("UNKNOWN_ERROR");
      expect(parseError({}).code).toBe("UNKNOWN_ERROR");
    });
  });

  describe("Stellar error matching and precedence", () => {
    it("resolves OrderAlreadyPaid from Error instance and raw string", () => {
      const errFromInstance = parseError(new Error("OrderAlreadyPaid"));
      expect(errFromInstance.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(errFromInstance.message).toBe("Order already paid");
      expect(errFromInstance.userMessage).toBe(
        "This order has already been paid. If you believe this is an error, please contact support."
      );
      expect(errFromInstance.recoverable).toBe(false);

      const errFromString = parseError("order already paid");
      expect(errFromString.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(errFromString.userMessage).toBe(
        "This order has already been paid. If you believe this is an error, please contact support."
      );
      expect(errFromString.recoverable).toBe(false);
    });

    it("maps 'Insufficient USDC balance' to ACCOUNT_INSUFFICIENT_BALANCE", () => {
      const error = parseError("Insufficient USDC balance");
      expect(error.code).toBe("ACCOUNT_INSUFFICIENT_BALANCE");
      expect(error.message).toBe("Insufficient balance");
      expect(error.userMessage).toBe(
        "You don't have enough funds to complete this payment. Please add more to your wallet."
      );
      expect(error.recoverable).toBe(true);
      expect(error.action).toBe("Add funds");
    });

    it("matches common Stellar error patterns", () => {
      expect(parseError("Transaction rejected by user").code).toBe("WALLET_USER_REJECTED");
      expect(parseError("User cancelled transaction").code).toBe("WALLET_USER_REJECTED");
      expect(parseError("Transaction timed out").code).toBe("TX_TIMEOUT");
      expect(parseError("Connection timeout occurred").code).toBe("TX_TIMEOUT");
      expect(parseError("Network error occurred").code).toBe("NETWORK_ERROR");
      expect(parseError("Please install freighter extension").code).toBe("WALLET_NOT_INSTALLED");
      expect(parseError("Wallet not connected").code).toBe("WALLET_NOT_CONNECTED");
      expect(parseError("Wrong network selected").code).toBe("WALLET_WRONG_NETWORK");
      expect(parseError("Token not allowed").code).toBe("STELLAR_TOKEN_NOT_ALLOWED");
      expect(parseError("Invalid payment amount").code).toBe("STELLAR_INVALID_AMOUNT");
    });
  });

  describe("Auth error matching", () => {
    it("resolves auth error by error.code property", () => {
      const authError = Object.assign(new Error("Registration failed"), {
        code: "User already registered",
      });
      const parsed = parseError(authError);
      expect(parsed.code).toBe("AUTH_EMAIL_EXISTS");
      expect(parsed.message).toBe("Email already in use");
      expect(parsed.userMessage).toBe("This email is already registered. Try logging in instead.");
      expect(parsed.action).toBe("Login");
      expect(parsed.recoverable).toBe(true);
    });

    it("resolves auth error by message substring", () => {
      const parsed = parseError("Invalid login credentials provided");
      expect(parsed.code).toBe("AUTH_INVALID_CREDENTIALS");
      expect(parsed.userMessage).toBe("Incorrect email or password. Please try again.");

      const unconfirmed = parseError("Email not confirmed yet");
      expect(unconfirmed.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");

      const weakPass = parseError("Password should be at least 6 characters");
      expect(weakPass.code).toBe("AUTH_WEAK_PASSWORD");

      const invalidEmail = parseError("Unable to validate email address: invalid format");
      expect(invalidEmail.code).toBe("AUTH_INVALID_EMAIL");
    });
  });

  describe("Object with message property", () => {
    it("parses error from plain object with message", () => {
      const obj = { message: "order already paid" };
      const parsed = parseError(obj);
      expect(parsed.code).toBe("STELLAR_ORDER_ALREADY_PAID");
    });
  });

  describe("Fallback behavior and message length threshold", () => {
    it("preserves original userMessage for unclassified messages of <= 100 characters", () => {
      const msg = "A short custom server failure notice";
      expect(msg.length).toBeLessThanOrEqual(100);
      const parsed = parseError(msg);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(msg);
      expect(parsed.userMessage).toBe(msg);
      expect(parsed.recoverable).toBe(true);
    });

    it("preserves original message at exactly 100 characters", () => {
      const msg = "x".repeat(100);
      const parsed = parseError(msg);
      expect(parsed.userMessage).toBe(msg);
    });

    it("falls back to generic userMessage for unclassified messages exceeding 100 characters", () => {
      const longMsg =
        "This is an extremely long and obscure internal database stack trace error that definitely exceeds one hundred characters in total length.";
      expect(longMsg.length).toBeGreaterThan(100);
      const parsed = parseError(longMsg);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(longMsg);
      expect(parsed.userMessage).toBe("An error occurred. Please try again.");
    });
  });
});

describe("getUserMessage", () => {
  it("delegates to parseError and extracts userMessage", () => {
    expect(getUserMessage("order already paid")).toBe(
      "This order has already been paid. If you believe this is an error, please contact support."
    );
    expect(getUserMessage(null)).toBe("Something unexpected happened. Please try again.");
    expect(getUserMessage("Insufficient USDC balance")).toBe(
      "You don't have enough funds to complete this payment. Please add more to your wallet."
    );
  });
});

describe("isRecoverable", () => {
  it("delegates to parseError and reflects recoverable flag", () => {
    expect(isRecoverable("Insufficient USDC balance")).toBe(true);
    expect(isRecoverable("Network error")).toBe(true);
    expect(isRecoverable("order already paid")).toBe(false);
    expect(isRecoverable(null)).toBe(true);
  });
});

describe("createError", () => {
  it("creates custom AppError with sensible defaults", () => {
    const error = createError("CUSTOM_CODE", "Internal dev message", "User-facing notification");
    expect(error.code).toBe("CUSTOM_CODE");
    expect(error.message).toBe("Internal dev message");
    expect(error.userMessage).toBe("User-facing notification");
    expect(error.severity).toBe("error");
    expect(error.recoverable).toBe(true);
    expect(error.action).toBeUndefined();
  });

  it("applies custom options overrides", () => {
    const error = createError("WARNING_CODE", "Warning message", "Caution notice", {
      severity: "warning",
      recoverable: false,
      action: "Go back",
    });
    expect(error.severity).toBe("warning");
    expect(error.recoverable).toBe(false);
    expect(error.action).toBe("Go back");
  });
});
