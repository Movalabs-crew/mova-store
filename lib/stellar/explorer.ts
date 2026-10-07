import { NETWORK } from "./config";

/**
 * Stellar Expert explorer links.
 *
 * The network has to come from configuration: the checkout receipt used to
 * hardcode `testnet` while the admin orders table interpolated `NETWORK`, so on
 * a mainnet deployment the buyer was sent to a testnet explorer page that can
 * never resolve (#707). Both call sites now share this helper.
 */
const EXPLORER_BASE_URL = "https://stellar.expert/explorer";

/** Explorer URL for a transaction hash on the configured Stellar network. */
export function explorerTxUrl(hash: string): string {
  // Read `NETWORK` at call time so the link always reflects the active network.
  return `${EXPLORER_BASE_URL}/${NETWORK}/tx/${hash}`;
}
