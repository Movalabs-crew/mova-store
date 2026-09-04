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
