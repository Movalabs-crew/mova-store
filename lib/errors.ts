/**
 * Error Handling Utilities
 *
 * Provides user-friendly error messages and error classification
 * for the ShoeSafari application.
 */

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
// Stellar/Soroban Error Messages
// =============================================================================

const STELLAR_ERRORS: Record<string, AppError> = {
  // Contract errors
  NotInitialized: {
    code: "STELLAR_NOT_INITIALIZED",
    message: "Contract not initialized",
    userMessage: "The payment system is not configured. Please contact support.",
    severity: "error",
    recoverable: false,
  },
  AlreadyInitialized: {
    code: "STELLAR_ALREADY_INITIALIZED",
    message: "Contract already initialized",
    userMessage: "The payment system is already set up.",
    severity: "warning",
    recoverable: false,
  },
  InvalidAmount: {
    code: "STELLAR_INVALID_AMOUNT",
    message: "Invalid payment amount",
    userMessage: "The payment amount is invalid. Please check your cart and try again.",
    severity: "error",
    recoverable: true,
    action: "Check cart total",
  },
  OrderAlreadyPaid: {
    code: "STELLAR_ORDER_ALREADY_PAID",
    message: "Order already paid",
    userMessage: "This order has already been paid. If you believe this is an error, please contact support.",
    severity: "warning",
    recoverable: false,
  },
  OrderNotFound: {
    code: "STELLAR_ORDER_NOT_FOUND",
    message: "Order not found",
    userMessage: "We couldn't find this order. It may have expired or been processed.",
    severity: "error",
    recoverable: false,
  },
  TokenNotAllowed: {
    code: "STELLAR_TOKEN_NOT_ALLOWED",
    message: "Token not allowed",
    userMessage: "This payment token is not accepted. Please try a different payment method.",
    severity: "error",
    recoverable: true,
    action: "Try different token",
  },
  InvalidOrderStatus: {
    code: "STELLAR_INVALID_ORDER_STATUS",
    message: "Invalid order status",
    userMessage: "This order cannot be processed in its current state.",
    severity: "error",
    recoverable: false,
  },

  // Wallet errors
  WalletNotConnected: {
    code: "WALLET_NOT_CONNECTED",
    message: "Wallet not connected",
    userMessage: "Please connect your Freighter wallet to continue.",
    severity: "warning",
    recoverable: true,
    action: "Connect wallet",
  },
  WalletNotInstalled: {
    code: "WALLET_NOT_INSTALLED",
    message: "Freighter not installed",
    userMessage: "Please install the Freighter wallet extension to pay with Stellar.",
    severity: "warning",
    recoverable: true,
    action: "Install Freighter",
  },
  WrongNetwork: {
    code: "WALLET_WRONG_NETWORK",
    message: "Wrong network",
    userMessage: "Please switch your Freighter wallet to the correct network.",
    severity: "warning",
    recoverable: true,
    action: "Switch network",
  },
  UserRejected: {
    code: "WALLET_USER_REJECTED",
    message: "Transaction rejected by user",
    userMessage: "You cancelled the transaction. Click 'Pay' again when you're ready.",
    severity: "info",
    recoverable: true,
  },

  // Account errors
  AccountNotFunded: {
    code: "ACCOUNT_NOT_FUNDED",
    message: "Account not funded",
    userMessage: "Your Stellar account needs to be funded before making payments.",
    severity: "warning",
    recoverable: true,
    action: "Fund account",
  },
  InsufficientBalance: {
    code: "ACCOUNT_INSUFFICIENT_BALANCE",
    message: "Insufficient balance",
    userMessage: "You don't have enough funds to complete this payment. Please add more to your wallet.",
    severity: "error",
    recoverable: true,
    action: "Add funds",
  },
  NoTrustline: {
    code: "ACCOUNT_NO_TRUSTLINE",
    message: "No trustline for token",
    userMessage: "Your wallet needs to trust USDC before receiving payments. We'll set this up for you.",
    severity: "info",
    recoverable: true,
  },

  // Transaction errors
  TransactionFailed: {
    code: "TX_FAILED",
    message: "Transaction failed",
    userMessage: "The payment couldn't be processed. Please try again.",
    severity: "error",
    recoverable: true,
    action: "Try again",
  },
  TransactionTimeout: {
    code: "TX_TIMEOUT",
    message: "Transaction timed out",
    userMessage: "The transaction is taking longer than expected. Please check your wallet for the status.",
    severity: "warning",
    recoverable: true,
    action: "Check wallet",
  },
  SimulationFailed: {
    code: "TX_SIMULATION_FAILED",
    message: "Transaction simulation failed",
    userMessage: "We couldn't verify this transaction. Please check your balance and try again.",
    severity: "error",
    recoverable: true,
  },

  // Network errors
  NetworkError: {
    code: "NETWORK_ERROR",
    message: "Network error",
    userMessage: "We're having trouble connecting to the Stellar network. Please check your internet connection.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
  RpcError: {
    code: "RPC_ERROR",
    message: "RPC server error",
    userMessage: "The payment server is temporarily unavailable. Please try again in a moment.",
    severity: "error",
    recoverable: true,
    action: "Retry",
  },
};

// =============================================================================
// Firebase Error Messages
// =============================================================================

const FIREBASE_ERRORS: Record<string, AppError> = {
  "auth/email-already-in-use": {
    code: "AUTH_EMAIL_EXISTS",
    message: "Email already in use",
    userMessage: "This email is already registered. Try logging in instead.",
    severity: "warning",
    recoverable: true,
    action: "Login",
  },
  "auth/invalid-email": {
    code: "AUTH_INVALID_EMAIL",
    message: "Invalid email",
    userMessage: "Please enter a valid email address.",
    severity: "error",
    recoverable: true,
  },
  "auth/weak-password": {
    code: "AUTH_WEAK_PASSWORD",
    message: "Weak password",
    userMessage: "Please choose a stronger password (at least 6 characters).",
    severity: "warning",
    recoverable: true,
  },
  "auth/user-not-found": {
    code: "AUTH_USER_NOT_FOUND",
    message: "User not found",
    userMessage: "No account found with this email. Would you like to create one?",
    severity: "warning",
    recoverable: true,
    action: "Sign up",
  },
  "auth/wrong-password": {
    code: "AUTH_WRONG_PASSWORD",
    message: "Wrong password",
    userMessage: "Incorrect password. Please try again.",
    severity: "error",
    recoverable: true,
  },
  "auth/too-many-requests": {
    code: "AUTH_TOO_MANY_REQUESTS",
    message: "Too many attempts",
    userMessage: "Too many failed attempts. Please wait a moment before trying again.",
    severity: "warning",
    recoverable: true,
  },
  "auth/popup-closed-by-user": {
    code: "AUTH_POPUP_CLOSED",
    message: "Popup closed",
    userMessage: "Sign-in was cancelled. Click the button to try again.",
    severity: "info",
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

  // Handle Error objects
  if (error instanceof Error) {
    // Check for Firebase errors
    const firebaseCode = (error as { code?: string }).code;
    if (firebaseCode && FIREBASE_ERRORS[firebaseCode]) {
      return FIREBASE_ERRORS[firebaseCode];
    }

    return parseErrorMessage(error.message);
  }

  // Handle objects with message property
  if (typeof error === "object" && "message" in error) {
    return parseErrorMessage(String((error as { message: unknown }).message));
  }

  return GENERAL_ERRORS.Unknown;
}

/**
 * Parses an error message string and matches it to known errors.
 */
function parseErrorMessage(message: string): AppError {
  const lowerMessage = message.toLowerCase();

  // Check Stellar errors
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
    return STELLAR_ERRORS.InsufficientBalance;
  }
  if (lowerMessage.includes("rejected") || lowerMessage.includes("cancelled")) {
    return STELLAR_ERRORS.UserRejected;
  }
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return STELLAR_ERRORS.TransactionTimeout;
  }
  if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
    return STELLAR_ERRORS.NetworkError;
  }
  if (lowerMessage.includes("freighter") && lowerMessage.includes("install")) {
    return STELLAR_ERRORS.WalletNotInstalled;
  }

  // Check Firebase errors
  for (const appError of Object.values(FIREBASE_ERRORS)) {
    if (lowerMessage.includes(appError.code.toLowerCase())) {
      return appError;
    }
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
