/**
 * Environment Configuration and Validation
 *
 * This module provides type-safe access to environment variables and validates
 * that required configuration is present at runtime.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface StellarConfig {
  network: "testnet" | "mainnet";
  rpcUrl: string;
  networkPassphrase: string;
  checkoutContractId: string;
  usdcContractId: string;
  nativeAssetContractId: string;
}

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  defaultRecipientEmail?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface AdminConfig {
  adminEmails: string[];
}

export interface EnvConfig {
  stellar: StellarConfig;
  emailjs: EmailJSConfig;
  supabase: SupabaseConfig;
  admin: AdminConfig;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const STELLAR_DEFAULTS = {
  testnet: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    usdcContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    nativeAssetContractId:
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  },
  mainnet: {
    rpcUrl: "https://soroban-rpc.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    usdcContractId: "", // Must be configured for mainnet
    nativeAssetContractId: "", // Must be configured for mainnet
  },
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

type ValidationError = {
  field: string;
  message: string;
};

/**
 * Validates that a required environment variable is set.
 */
function requireEnv(
  name: string,
  errors: ValidationError[],
  context: string
): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    errors.push({
      field: name,
      message: `${name} is required for ${context}`,
    });
    return "";
  }
  return value.trim();
}

/**
 * Gets an optional environment variable with a default value.
 */
function getEnv(name: string, defaultValue: string = ""): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : defaultValue;
}

// =============================================================================
// CONFIGURATION LOADERS
// =============================================================================

/**
 * Loads and validates Stellar configuration.
 */
export function loadStellarConfig(
  errors: ValidationError[] = []
): StellarConfig {
  const network = (getEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet") ||
    "testnet") as "testnet" | "mainnet";
  const defaults = STELLAR_DEFAULTS[network];

  const checkoutContractId = requireEnv(
    "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
    errors,
    "Stellar payments"
  );

  return {
    network,
    rpcUrl: getEnv("NEXT_PUBLIC_STELLAR_RPC_URL", defaults.rpcUrl),
    networkPassphrase: getEnv(
      "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE",
      defaults.networkPassphrase
    ),
    checkoutContractId,
    usdcContractId: getEnv(
      "NEXT_PUBLIC_USDC_CONTRACT_ID",
      defaults.usdcContractId
    ),
    nativeAssetContractId: getEnv(
      "NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID",
      defaults.nativeAssetContractId
    ),
  };
}

/**
 * Loads and validates EmailJS configuration.
 */
export function loadEmailJSConfig(
  errors: ValidationError[] = []
): EmailJSConfig {
  return {
    serviceId: requireEnv(
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      errors,
      "email notifications"
    ),
    templateId: requireEnv(
      "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      errors,
      "email notifications"
    ),
    publicKey: requireEnv(
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
      errors,
      "email notifications"
    ),
    defaultRecipientEmail: getEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL"),
  };
}

/**
 * Loads and validates Supabase configuration.
 */
export function loadSupabaseConfig(
  errors: ValidationError[] = []
): SupabaseConfig {
  return {
    url: requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      errors,
      "Supabase"
    ),
    anonKey: requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      errors,
      "Supabase"
    ),
  };
}

/**
 * Loads admin configuration.
 */
export function loadAdminConfig(): AdminConfig {
  const adminEmailsRaw = getEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
  const adminEmails = adminEmailsRaw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");

  return { adminEmails };
}

// =============================================================================
// MAIN VALIDATION
// =============================================================================

/**
 * Validates all required environment variables and returns the configuration.
 * Throws an error with details about missing configuration.
 */
export function validateEnv(): EnvConfig {
  const errors: ValidationError[] = [];

  const stellar = loadStellarConfig(errors);
  const emailjs = loadEmailJSConfig(errors);
  const supabase = loadSupabaseConfig(errors);
  const admin = loadAdminConfig();

  if (errors.length > 0) {
    const errorList = errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n");
    console.error(
      `\n⚠️  Environment Configuration Errors:\n${errorList}\n\n` +
        `Please copy .env.local.example to .env.local and fill in the required values.\n`
    );
    throw new Error(
      `Environment configuration errors:\n${errorList}\n\nPlease copy .env.local.example to .env.local and fill in the required values.`
    );
  }

  return { stellar, emailjs, supabase, admin };
}

/**
 * Checks if a user email is in the admin list.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const { adminEmails } = loadAdminConfig();
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Helper to check if we're in development mode.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Helper to check if we're in production mode.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
