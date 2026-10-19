import { Networks, StrKey } from "@stellar/stellar-sdk";

import { MAINNET_RPC_URL, TESTNET_RPC_URL } from "./endpoints";

// ---------------------------------------------------------------------------
// Network + contract configuration.
//
// Set these in `.env.local` (see `.env.local.example`):
//   NEXT_PUBLIC_STELLAR_NETWORK        = "testnet" | "mainnet"
//   NEXT_PUBLIC_STELLAR_RPC_URL        = RPC endpoint
//   NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = network passphrase
//   NEXT_PUBLIC_CHECKOUT_CONTRACT_ID   = deployed checkout contract id (C...)
//   NEXT_PUBLIC_USDC_CONTRACT_ID       = USDC token contract id (C...)
//   NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID = native XLM SAC contract id (C...)
// ---------------------------------------------------------------------------

/**
 * Configuration enums fail closed (#706): only the documented network values
 * are accepted. Unset (or empty) still defaults to testnet for local dev.
 */
export const ALLOWED_NETWORKS = ["testnet", "mainnet"] as const;
export type StellarNetwork = (typeof ALLOWED_NETWORKS)[number];

function resolveNetwork(raw: string | undefined): StellarNetwork {
  if (raw === undefined || raw.trim() === "") return "testnet";
  const trimmed = raw.trim();
  if ((ALLOWED_NETWORKS as readonly string[]).includes(trimmed)) {
    return trimmed as StellarNetwork;
  }
  throw new Error(
    `Invalid NEXT_PUBLIC_STELLAR_NETWORK "${raw}". ` +
      `Accepted values: ${ALLOWED_NETWORKS.join(", ")}. ` +
      `Unset (or empty) falls back to "testnet".`
  );
}

export const NETWORK: StellarNetwork = resolveNetwork(process.env.NEXT_PUBLIC_STELLAR_NETWORK);
export const IS_MAINNET = NETWORK === "mainnet";

// Mainnet default matches lib/env.ts STELLAR_DEFAULTS.mainnet and the endpoint
// docs/MAINNET_DEPLOYMENT.md tells operators to configure. Keep the three in
// step: this value is what an operator gets when the env var is unset.
//
// d5fb865 reconciled env.ts and the deployment guide onto the stellar.org
// endpoint but left this module behind, so an operator who left the variable
// unset talked to gateway.fm from here and stellar.org from lib/env — two
// different RPCs depending on which module resolved it. Both modules now read
// the endpoint from lib/stellar/endpoints.ts, so the two cannot drift again,
// and tests/lib/stellar/rpc-endpoint-single-source.test.ts checks the doc still
// names the same endpoint.
export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? (IS_MAINNET ? MAINNET_RPC_URL : TESTNET_RPC_URL);

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
  (IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET);

// Deployed checkout contract (see contracts/checkout + README).
export const CHECKOUT_CONTRACT_ID = process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID ?? "";

// USDC via the Stellar Asset Contract.
export const TESTNET_USDC_CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
// Set NEXT_PUBLIC_USDC_CONTRACT_ID to the mainnet USDC SAC contract id.
export const USDC_CONTRACT_ID =
  process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ?? TESTNET_USDC_CONTRACT_ID;

// Testnet USDC is issued by Circle's classic testnet issuer (trustline only
// needed for non-native assets; native XLM needs no trustline).
export const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// Native XLM Stellar Asset Contract ids.
//
// Testnet value is empirically verified (balance/decimals simulated against
// soroban-testnet.stellar.gateway.fm; see docs/ARCHITECTURE.md). The mainnet value
// comes from the stellar-cli `native` built-in alias table and should be
// confirmed against the live mainnet RPC before first use.
export const TESTNET_NATIVE_ASSET_CONTRACT_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const MAINNET_NATIVE_ASSET_CONTRACT_ID =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
export const NATIVE_ASSET_CONTRACT_ID =
  process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID ??
  (IS_MAINNET ? MAINNET_NATIVE_ASSET_CONTRACT_ID : TESTNET_NATIVE_ASSET_CONTRACT_ID);

// All tokens accepted by the checkout contract's whitelist. The merchant adds
// each token on-chain via `add_token`; the frontend uses this registry for
// trustline/balance checks and for building `pay` invocations.
export interface TokenConfig {
  contractId: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Native XLM needs no trustline. */
  isNative?: boolean;
  /** Classic asset code + issuer used for trustline checks. */
  assetCode?: string;
  assetIssuer?: string;
}

/**
 * A lookup table keyed by identifier must be unique by construction (#705).
 * Validates SUPPORTED_TOKENS at module load so a duplicate or empty contract
 * id fails immediately instead of silently resolving payments to the wrong
 * token.
 */
function validateSupportedTokens(tokens: TokenConfig[]): TokenConfig[] {
  const seen = new Map<string, string>();
  for (const token of tokens) {
    const label = token.symbol || token.contractId || "<unnamed>";
    if (!token.contractId || token.contractId.trim() === "") {
      throw new Error(
        `SUPPORTED_TOKENS entry "${label}" has an empty contractId. ` +
          `Every token must declare a non-empty contract id.`
      );
    }
    if (!StrKey.isValidContract(token.contractId)) {
      throw new Error(
        `SUPPORTED_TOKENS entry "${label}" has an invalid contract id: ${token.contractId}. ` +
          `Contract ids must be valid C... StrKeys.`
      );
    }
    const previous = seen.get(token.contractId);
    if (previous !== undefined) {
      throw new Error(
        `SUPPORTED_TOKENS entries "${previous}" and "${label}" share contract id ` +
          `${token.contractId}. Token registry contractIds must be unique.`
      );
    }
    seen.set(token.contractId, label);
  }
  return tokens;
}

export const SUPPORTED_TOKENS: TokenConfig[] = validateSupportedTokens([
  {
    contractId: USDC_CONTRACT_ID,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
    assetCode: "USDC",
    assetIssuer: TESTNET_USDC_ISSUER,
  },
  {
    contractId: NATIVE_ASSET_CONTRACT_ID,
    symbol: "XLM",
    name: "Stellar Lumens",
    decimals: 7,
    isNative: true,
  },
]);

/** Default payment token (used by the checkout flow unless overridden). */
export function defaultToken(): TokenConfig {
  return SUPPORTED_TOKENS[0];
}

export function tokenForContract(contractId: string): TokenConfig | undefined {
  return SUPPORTED_TOKENS.find((t) => t.contractId === contractId);
}

// USDC uses 7 decimals (nativeToScVal / i128 amounts are raw units).
export const USDC_DECIMALS = 7;

// How many seconds to wait for a transaction to reach a final state.
export const TX_TIMEOUT_SECONDS = 60;
// How many seconds between getTransaction polls.
export const TX_POLL_INTERVAL_MS = 2500;

// Meridian / friendbot for funding testnet accounts.
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

// Event indexing (lib/stellar/indexer.ts).
export const EVENT_POLL_INTERVAL_MS = 4000;
// How many ledgers behind the tip to start scanning on first connect. This is a
// rolling window: fine for a live confirmation watch, but an operations view
// that must show older history needs a durable start ledger instead (see
// CHECKOUT_START_LEDGER below).
export const EVENT_START_LEDGER_BACKFILL = 100;

// Durable start ledger for history-sensitive views (the admin orders table).
//
// Set `NEXT_PUBLIC_CHECKOUT_START_LEDGER` to the ledger the checkout contract
// was deployed in so the admin scan reaches orders paid before the rolling
// backfill window. A value of 0 (or unset) keeps the rolling backfill, i.e.
// today's behaviour.
const parsedCheckoutStartLedger = Number(process.env.NEXT_PUBLIC_CHECKOUT_START_LEDGER);
export const CHECKOUT_START_LEDGER =
  Number.isFinite(parsedCheckoutStartLedger) && parsedCheckoutStartLedger > 0
    ? Math.floor(parsedCheckoutStartLedger)
    : 0;

// localStorage key under which the admin orders indexer persists its resume
// cursor, so a reload continues the scan instead of restarting the window.
export const ADMIN_ORDERS_CURSOR_STORAGE_KEY = "mova:admin-orders:cursor:v1";

// Pre-flight simulation (lib/stellar/simulate.ts).
// Safety buffer added on top of the simulated resource fee so the tx has
// headroom to cover fees that drift between simulation and inclusion.
export const FEE_BUFFER_STROOPS = BigInt(500000);
