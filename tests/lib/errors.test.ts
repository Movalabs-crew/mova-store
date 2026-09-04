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
