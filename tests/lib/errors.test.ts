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

describe("parseErrorMessage precedence: exact AUTH_ERRORS before broad heuristics", () => {
  it("classifies an auth message containing 'cancelled' as the auth error, not USER_REJECTED", () => {
    const parsed = parseError(
      "Email not confirmed: you cancelled the verification request"
    );
    expect(parsed.code).toBe("AUTH_EMAIL_NOT_CONFIRMED");
    expect(parsed.userMessage).toBe("Please confirm your email before signing in.");
  });

  it("still maps a pure Stellar cancellation message to USER_REJECTED", () => {
    const parsed = parseError("Transaction cancelled by user");
    expect(parsed.code).toBe("WALLET_USER_REJECTED");
  });

  it("classifies an auth message containing 'timeout' as the auth error, not TX_TIMEOUT", () => {
    const parsed = parseError(
      "Invalid login credentials: the request timed out before the server responded"
    );
    expect(parsed.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("still maps a pure Stellar timeout message to TX_TIMEOUT", () => {
    const parsed = parseError("Transaction submission timed out");
    expect(parsed.code).toBe("TX_TIMEOUT");
  });

  it("classifies an auth weak-password message containing 'balance'-like words correctly", () => {
    const parsed = parseError(
      "Password should be at least 6 characters: insufficient strength"
    );
    expect(parsed.code).toBe("AUTH_WEAK_PASSWORD");
  });
});
