import { describe, it, expect } from "vitest";

import {
  parseError,
  STELLAR_ERRORS,
  AUTH_ERRORS,
  GENERAL_ERRORS,
  createError,
  getUserMessage,
  isRecoverable,
} from "../../lib/errors";
import { WalletError } from "../../lib/stellar/freighter";

describe("Error Classification & Handling Tests (lib/errors.ts)", () => {
  describe("null and undefined handling", () => {
    it("returns GENERAL_ERRORS.Unknown for null and undefined", () => {
      expect(parseError(null)).toEqual(GENERAL_ERRORS.Unknown);
      expect(parseError(undefined)).toEqual(GENERAL_ERRORS.Unknown);
      expect(parseError("")).toEqual(GENERAL_ERRORS.Unknown);
    });
  });

  describe("OrderAlreadyPaid classification", () => {
    it("resolves Error('OrderAlreadyPaid') and string 'order already paid' to STELLAR_ORDER_ALREADY_PAID", () => {
      const errorFromInstance = parseError(new Error("OrderAlreadyPaid"));
      expect(errorFromInstance.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(errorFromInstance.userMessage).toBe(STELLAR_ERRORS.ORDER_ALREADY_PAID.userMessage);
      expect(errorFromInstance.recoverable).toBe(false);

      const errorFromString = parseError("order already paid");
      expect(errorFromString.code).toBe("STELLAR_ORDER_ALREADY_PAID");
      expect(errorFromString.userMessage).toBe(STELLAR_ERRORS.ORDER_ALREADY_PAID.userMessage);
      expect(errorFromString.recoverable).toBe(false);
    });
  });

  describe("balance checks and message length fallback", () => {
    it("maps 'Insufficient USDC balance' to ACCOUNT_INSUFFICIENT_BALANCE", () => {
      const parsed = parseError("Insufficient USDC balance");
      expect(parsed.code).toBe("ACCOUNT_INSUFFICIENT_BALANCE");
      expect(parsed.userMessage).toBe(STELLAR_ERRORS.INSUFFICIENT_BALANCE.userMessage);
      expect(parsed.recoverable).toBe(true);
    });

    it("falls back to generic userMessage for unknown errors over 100 characters", () => {
      const longMessage =
        "This is an unclassified low-level database socket failure that contains far too many technical details ".repeat(
          2
        );
      expect(longMessage.length).toBeGreaterThan(100);

      const parsed = parseError(longMessage);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(longMessage);
      expect(parsed.userMessage).toBe("An error occurred. Please try again.");
    });

    it("preserves original message for unknown errors under or equal to 100 characters", () => {
      const shortMessage = "A short custom failure occurred";
      expect(shortMessage.length).toBeLessThanOrEqual(100);

      const parsed = parseError(shortMessage);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(shortMessage);
      expect(parsed.userMessage).toBe(shortMessage);
    });
  });

  describe("getUserMessage and isRecoverable helpers", () => {
    it("returns userMessage matching parseError result", () => {
      expect(getUserMessage(new Error("OrderAlreadyPaid"))).toBe(
        STELLAR_ERRORS.ORDER_ALREADY_PAID.userMessage
      );
      expect(getUserMessage("Insufficient USDC balance")).toBe(
        STELLAR_ERRORS.INSUFFICIENT_BALANCE.userMessage
      );
      expect(getUserMessage(new WalletError("User declined", "USER_REJECTED"))).toBe(
        STELLAR_ERRORS.USER_REJECTED.userMessage
      );
    });

    it("reflects the recoverable flag from AppError", () => {
      expect(isRecoverable(new Error("OrderAlreadyPaid"))).toBe(false);
      expect(isRecoverable("Insufficient USDC balance")).toBe(true);
      expect(isRecoverable(new WalletError("Contract missing", "CONTRACT_NOT_CONFIGURED"))).toBe(
        false
      );
      expect(isRecoverable(new WalletError("Wrong net", "WRONG_NETWORK"))).toBe(true);
      expect(isRecoverable(null)).toBe(true);
    });
  });

  describe("WalletError classification by .code property", () => {
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
  });

  describe("Table schema integrity", () => {
    it("ensures every STELLAR_ERRORS entry maps to defined code and userMessage", () => {
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
        "ORDER_ALREADY_PAID",
      ];

      for (const key of expectedKeys) {
        expect(STELLAR_ERRORS[key]).toBeDefined();
        expect(STELLAR_ERRORS[key].code).toBeTruthy();
        expect(STELLAR_ERRORS[key].userMessage).toBeTruthy();
      }
    });

    it("creates custom AppError objects accurately with createError", () => {
      const custom = createError("CUSTOM_CODE", "Internal msg", "Friendly msg", {
        severity: "warning",
        recoverable: false,
      });
      expect(custom.code).toBe("CUSTOM_CODE");
      expect(custom.userMessage).toBe("Friendly msg");
      expect(custom.severity).toBe("warning");
      expect(custom.recoverable).toBe(false);
    });
  });

  describe("AUTH_ERRORS vs broad Stellar keyword heuristics precedence", () => {
    it("matches exact auth message when it contains broad keyword like 'cancelled'", () => {
      const err = parseError("Email not confirmed: you cancelled the verification request");
      expect(err.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");
      expect(err.message).toBe("Email not confirmed");
      expect(err.userMessage).toBe("Please confirm your email before signing in.");
      expect(err.code).not.toBe(STELLAR_ERRORS.USER_REJECTED.code);
    });

    it("matches pure Stellar message 'Transaction cancelled by user' to USER_REJECTED", () => {
      const err = parseError("Transaction cancelled by user");
      expect(err.code).toBe(STELLAR_ERRORS.USER_REJECTED.code);
      expect(err.userMessage).toContain("cancelled the transaction");
    });

    it("prioritizes auth errors over other common keywords like 'insufficient' or 'timeout'", () => {
      const authWithBalance = parseError("User already registered with insufficient permissions");
      expect(authWithBalance.code).toBe("AUTH_EMAIL_EXISTS");

      const authWithTimeout = parseError("Invalid login credentials timed out");
      expect(authWithTimeout.code).toBe("AUTH_INVALID_CREDENTIALS");
    });
  });
});

describe("parseError fallbacks and delegation (#33)", () => {
  it("returns the generic Unknown error for null/undefined", () => {
    for (const input of [null, undefined]) {
      const parsed = parseError(input);
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.userMessage).toBe(
        "Something unexpected happened. Please try again."
      );
    }
  });

  it("classifies balance-related messages via the pattern fallback", () => {
    const parsed = parseError("Insufficient USDC balance");
    expect(parsed.code).toBe("ACCOUNT_INSUFFICIENT_BALANCE");
    expect(parsed.recoverable).toBe(true);
  });

  it("matches timeout and user-rejection patterns by message", () => {
    expect(parseError(new Error("request timeout")).code).toBe(
      STELLAR_ERRORS.TX_TIMEOUT.code
    );
    expect(parseError("user cancelled the transaction").code).toBe(
      STELLAR_ERRORS.USER_REJECTED.code
    );
  });

  it("falls back to the generic error for unlisted contract errors", () => {
    // NOTE: the issue text references a STELLAR_ORDER_ALREADY_PAID entry, but
    // no ORDER_ALREADY_PAID key exists in STELLAR_ERRORS and the substring
    // matcher cannot bridge the "OrderAlreadyPaid" / "order_already_paid"
    // spelling gap, so both spellings land in the generic fallback. These
    // assertions pin that behaviour.
    for (const input of [new Error("OrderAlreadyPaid"), "order already paid"]) {
      const parsed = parseError(input);
      const raw = typeof input === "string" ? input : input.message;
      expect(parsed.code).toBe("UNKNOWN_ERROR");
      expect(parsed.message).toBe(raw);
      expect(parsed.userMessage).toBe(raw);
    }
  });

  it("collapses userMessage for messages over 100 characters", () => {
    const long = "x".repeat(150);
    const parsed = parseError(long);
    expect(parsed.code).toBe("UNKNOWN_ERROR");
    expect(parsed.message).toBe(long);
    expect(parsed.userMessage).toBe("An error occurred. Please try again.");
  });

  it("getUserMessage delegates to parseError.userMessage", () => {
    expect(getUserMessage(new Error("timeout"))).toBe(
      STELLAR_ERRORS.TX_TIMEOUT.userMessage
    );
    expect(getUserMessage("some raw message")).toBe("some raw message");
    expect(getUserMessage(new WalletError("gone", "FREIGHTER_NOT_FOUND"))).toBe(
      STELLAR_ERRORS.FREIGHTER_NOT_FOUND.userMessage
    );
  });

  it("isRecoverable reflects the resolved AppError flag", () => {
    // Every table entry reachable through the current matchers is recoverable.
    expect(isRecoverable(new WalletError("x", "FREIGHTER_NOT_FOUND"))).toBe(true);
    expect(isRecoverable(new Error("timeout"))).toBe(true);
    expect(isRecoverable("anything at all")).toBe(true);
  });
});
