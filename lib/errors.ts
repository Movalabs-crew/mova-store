/**
 * Error Handling Utilities
 *
 * Provides user-friendly error messages and error classification
 * for the Mova Store application.
 */

import { WalletError } from "./stellar/freighter";

// =============================================================================
// Error Types
// =============================================================================

export type ErrorSeverity = "error" | "warning" | "info";

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  action?: string;
}

// =============================================================================
// Stellar/Soroban & Wallet Error Messages
// =============================================================================

export const STELLAR_ERRORS: Record<string, AppError> = {
  // Wallet & Freighter errors
  FREIGHTER_NOT_FOUND: {
    code: "WALLET_NOT_INSTALLED",
    message: "Freighter not installed",
    userMessage: "Please install the Freighter wallet extension to pay with Stellar.",
    severity: "warning",
    recoverable: true,
    action: "Install Freighter",
  },
  FREIGHTER_REQUEST_DENIED: {
    code: "WALLET_REQUEST_DENIED",
    message: "Wallet connection request denied",
    userMessage: "Freighter access was denied. Please allow access to continue.",
    severity: "warning",
    recoverable: true,
    action: "Connect wallet",
  },
  FREIGHTER_NETWORK_ERROR: {
    code: "WALLET_NETWORK_ERROR",
    message: "Network error in Freighter",
    userMessage: "Could not retrieve network settings from Freighter. Please check the extension.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
  WRONG_NETWORK: {
    code: "WALLET_WRONG_NETWORK",
    message: "Wrong network",
    userMessage: "Please switch your Freighter wallet to the correct network.",
    severity: "warning",
    recoverable: true,
    action: "Switch network",
  },
  FREIGHTER_SIGN_ERROR: {
    code: "WALLET_SIGN_ERROR",
    message: "Transaction signing failed",
    userMessage: "Could not complete transaction signature in Freighter. Please try again.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
  USER_REJECTED: {
    code: "WALLET_USER_REJECTED",
    message: "Transaction rejected by user",
    userMessage: "You cancelled the transaction. Click 'Pay' again when you're ready.",
    severity: "info",
    recoverable: true,
  },

  // Account readiness errors
  ACCOUNT_NOT_FOUND: {
    code: "ACCOUNT_NOT_FUNDED",
    message: "Account not funded",
    userMessage: "Your Stellar account needs to be funded before making payments.",
    severity: "warning",
    recoverable: true,
    action: "Fund account",
  },
  FRIENDBOT_ERROR: {
    code: "FRIENDBOT_FUNDING_FAILED",
    message: "Friendbot funding failed",
    userMessage: "Unable to fund testnet account automatically via Friendbot.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
  PAYMENT_NOT_READY: {
    code: "ACCOUNT_PAYMENT_NOT_READY",
    message: "Account payment not ready",
    userMessage: "Your account is not ready for payment. Please check balance and trustlines.",
    severity: "warning",
    recoverable: true,
    action: "Check balance",
  },
  INSUFFICIENT_BALANCE: {
    code: "ACCOUNT_INSUFFICIENT_BALANCE",
    message: "Insufficient balance",
    userMessage: "You don't have enough funds to complete this payment. Please add more to your wallet.",
    severity: "error",
    recoverable: true,
    action: "Add funds",
  },
  NO_TRUSTLINE: {
    code: "ACCOUNT_NO_TRUSTLINE",
    message: "No trustline for token",
    userMessage: "Your wallet needs to trust USDC before receiving payments. We'll set this up for you.",
    severity: "info",
    recoverable: true,
  },

  // Checkout & transaction errors
  CONTRACT_NOT_CONFIGURED: {
    code: "STELLAR_CONTRACT_NOT_CONFIGURED",
    message: "Checkout contract not configured",
    userMessage: "The payment system is not configured. Please contact support.",
    severity: "error",
    recoverable: false,
  },
  INVALID_AMOUNT: {
    code: "STELLAR_INVALID_AMOUNT",
    message: "Invalid payment amount",
    userMessage: "The payment amount is invalid. Please check your cart and try again.",
    severity: "error",
    recoverable: true,
    action: "Check cart total",
  },
  TX_SIMULATION_ERROR: {
    code: "TX_SIMULATION_FAILED",
    message: "Transaction simulation failed",
    userMessage: "We couldn't verify this transaction. Please check your balance and try again.",
    severity: "error",
    recoverable: true,
  },
  TX_SEND_ERROR: {
    code: "TX_FAILED",
    message: "Transaction failed",
    userMessage: "The payment couldn't be processed. Please try again.",
    severity: "error",
    recoverable: true,
    action: "Try again",
  },
  TX_TIMEOUT: {
    code: "TX_TIMEOUT",
    message: "Transaction timed out",
    userMessage: "The transaction is taking longer than expected. Please check your wallet for the status.",
    severity: "warning",
    recoverable: true,
    action: "Check wallet",
  },
};

// =============================================================================
// Auth Error Messages (Supabase)
// =============================================================================

const SUPABASE_AUTH_CODE_MAP: Record<string, string> = {
  user_already_exists: "User already registered",
  email_exists: "User already registered",
  invalid_credentials: "Invalid login credentials",
  email_not_confirmed: "Email not confirmed",
  weak_password: "Password should be at least 6 characters",
  validation_failed: "Unable to validate email address: invalid format",
};

const AUTH_ERRORS: Record<string, AppError> = {
  "User already registered": {
    code: "AUTH_EMAIL_EXISTS",
    message: "Email already in use",
    userMessage: "This email is already registered. Try logging in instead.",
    severity: "warning",
    recoverable: true,
    action: "Login",
  },
  "Invalid login credentials": {
    code: "AUTH_INVALID_CREDENTIALS",
    message: "Invalid credentials",
    userMessage: "Incorrect email or password. Please try again.",
    severity: "error",
    recoverable: true,
  },
  "Email not confirmed": {
    code: "AUTH_EMAIL_NOT_CONFIRMED",
    message: "Email not confirmed",
    userMessage: "Please confirm your email before signing in.",
    severity: "warning",
    recoverable: true,
  },
  "Password should be at least 6 characters": {
    code: "AUTH_WEAK_PASSWORD",
    message: "Weak password",
    userMessage: "Please choose a stronger password (at least 6 characters).",
    severity: "warning",
    recoverable: true,
  },
  "Unable to validate email address: invalid format": {
    code: "AUTH_INVALID_EMAIL",
    message: "Invalid email",
    userMessage: "Please enter a valid email address.",
    severity: "error",
    recoverable: true,
  },
};

// =============================================================================
// General Error Messages
// =============================================================================

const GENERAL_ERRORS: Record<string, AppError> = {
  ValidationError: {
    code: "VALIDATION_ERROR",
    message: "Validation error",
    userMessage: "Please check your input and try again.",
    severity: "warning",
    recoverable: true,
  },
  NotFound: {
    code: "NOT_FOUND",
    message: "Resource not found",
    userMessage: "We couldn't find what you're looking for.",
    severity: "error",
    recoverable: false,
  },
  Unauthorized: {
    code: "UNAUTHORIZED",
    message: "Unauthorized",
    userMessage: "Please log in to continue.",
    severity: "warning",
    recoverable: true,
    action: "Login",
  },
  Forbidden: {
    code: "FORBIDDEN",
    message: "Access denied",
    userMessage: "You don't have permission to access this.",
    severity: "error",
    recoverable: false,
  },
  ServerError: {
    code: "SERVER_ERROR",
    message: "Server error",
    userMessage: "Something went wrong on our end. Please try again later.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
  Unknown: {
    code: "UNKNOWN_ERROR",
    message: "Unknown error",
    userMessage: "Something unexpected happened. Please try again.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
};

// =============================================================================
// Error Parsing
// =============================================================================

/**
 * Parses an error and returns a user-friendly AppError object.
 */
export function parseError(error: unknown): AppError {
  // Handle null/undefined
  if (!error) {
    return GENERAL_ERRORS.Unknown;
  }

  // Handle string errors
  if (typeof error === "string") {
    return parseErrorMessage(error);
  }

  // Handle WalletError or Error with code property
  if (error instanceof WalletError || (error instanceof Error && "code" in error)) {
    const code = (error as { code?: string }).code;
    if (code && STELLAR_ERRORS[code]) {
      return STELLAR_ERRORS[code];
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Check for auth errors
    const authCode = (error as { code?: string }).code;
    if (authCode) {
      if (AUTH_ERRORS[authCode]) {
        return AUTH_ERRORS[authCode];
      }
      const mapped = SUPABASE_AUTH_CODE_MAP[authCode];
      if (mapped && AUTH_ERRORS[mapped]) {
        return AUTH_ERRORS[mapped];
      }
    }

    return parseErrorMessage(error.message);
  }

  // Handle objects with message or code property
  if (typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && STELLAR_ERRORS[code]) {
      return STELLAR_ERRORS[code];
    }
    if ("message" in error) {
      return parseErrorMessage(String((error as { message: unknown }).message));
    }
  }

  return GENERAL_ERRORS.Unknown;
}

/**
 * Parses an error message string and matches it to known errors.
 */
function parseErrorMessage(message: string): AppError {
  const lowerMessage = message.toLowerCase();

  // Check auth errors first so a phrase like
  // "Email not confirmed: you cancelled the verification request" is not
  // swallowed by the broad Stellar 'cancelled' heuristic below.
  for (const [key, appError] of Object.entries(AUTH_ERRORS)) {
    if (
      lowerMessage.includes(key.toLowerCase()) ||
      lowerMessage.includes(appError.code.toLowerCase())
    ) {
      return appError;
    }
  }

  // Check Stellar errors by key or code
  for (const [key, appError] of Object.entries(STELLAR_ERRORS)) {
    if (
      lowerMessage.includes(key.toLowerCase()) ||
      lowerMessage.includes(appError.code.toLowerCase())
    ) {
      return appError;
    }
  }

  // Check for common error patterns
  if (lowerMessage.includes("insufficient") || lowerMessage.includes("balance")) {
    return STELLAR_ERRORS.INSUFFICIENT_BALANCE;
  }
  if (lowerMessage.includes("rejected") || lowerMessage.includes("cancelled")) {
    return STELLAR_ERRORS.USER_REJECTED;
  }
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return STELLAR_ERRORS.TX_TIMEOUT;
  }
  if (lowerMessage.includes("freighter") && (lowerMessage.includes("install") || lowerMessage.includes("not installed"))) {
    return STELLAR_ERRORS.FREIGHTER_NOT_FOUND;
  }

  // Return generic error with original message
  return {
    ...GENERAL_ERRORS.Unknown,
    message,
    userMessage: message.length > 100 ? "An error occurred. Please try again." : message,
  };
}

/**
 * Creates a custom AppError with user-friendly message.
 */
export function createError(
  code: string,
  message: string,
  userMessage: string,
  options: Partial<AppError> = {}
): AppError {
  return {
    code,
    message,
    userMessage,
    severity: options.severity ?? "error",
    recoverable: options.recoverable ?? true,
    action: options.action,
  };
}

/**
 * Gets a user-friendly message from any error.
 */
export function getUserMessage(error: unknown): string {
  return parseError(error).userMessage;
}

/**
 * Checks if an error is recoverable (user can retry).
 */
export function isRecoverable(error: unknown): boolean {
  return parseError(error).recoverable;
}
