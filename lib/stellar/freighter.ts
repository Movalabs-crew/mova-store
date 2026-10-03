import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
  WatchWalletChanges,
} from "@stellar/freighter-api";

import { NETWORK, NETWORK_PASSPHRASE } from "./config";

// ---------------------------------------------------------------------------
// Freighter wallet helpers.
// ---------------------------------------------------------------------------

export class WalletError extends Error {
  code: string;

  constructor(message: string, code = "WALLET_ERROR") {
    super(message);
    this.name = "WalletError";
    this.code = code;
  }
}

export async function freighterAvailable(): Promise<boolean> {
  try {
    const res = await isConnected();
    return Boolean(res.isConnected);
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<string> {
  if (!(await freighterAvailable())) {
    throw new WalletError(
      "Freighter is not installed. Install the Freighter wallet extension to pay with USDC.",
      "FREIGHTER_NOT_FOUND"
    );
  }
  const res = await requestAccess();
  if (res.error) {
    throw new WalletError(res.error.toString(), "FREIGHTER_REQUEST_DENIED");
  }
  return res.address;
}

export async function currentAddress(): Promise<string | null> {
  if (!(await freighterAvailable())) return null;
  const res = await getAddress();
  if (res.error || !res.address) return null;
  return res.address;
}

/**
 * Subscribe to Freighter account/network changes so callers can invalidate a
 * cached address as soon as the user switches accounts or disconnects.
 * Returns an unsubscribe function that stops the underlying watcher.
 */
export function watchWalletChanges(
  onChange: (info: { address: string; network: string }) => void,
  timeout = 3000
): () => void {
  const watcher = new WatchWalletChanges(timeout);
  watcher.watch((params) => {
    onChange({ address: params.address ?? "", network: params.network ?? "" });
  });
  return () => watcher.stop();
}

export async function ensureNetwork(): Promise<string> {
  const res = await getNetwork();
  if (res.error) {
    throw new WalletError(res.error.toString(), "FREIGHTER_NETWORK_ERROR");
  }
  const detected = res.network;
  // The network name is only a label; the value that actually determines
  // whether a signature is valid is the passphrase. Compare that, so any
  // network whose passphrase does not match ours (including unexpected ones
  // like "STANDALONE") is rejected before the user is asked to sign.
  const detectedPassphrase = res.networkPassphrase;
  if (!detectedPassphrase || detectedPassphrase !== NETWORK_PASSPHRASE) {
    throw new WalletError(
      `Freighter is on "${detected || "an unknown network"}" but this store expects "${NETWORK}". ` +
        "Switch your Freighter network and try again.",
      "WRONG_NETWORK"
    );
  }
  return detected;
}

export async function signWithFreighter(
  transactionXdr: string,
  publicKey: string
): Promise<string> {
  const res = await signTransaction(transactionXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: publicKey,
  });
  if (res.error) {
    throw new WalletError(res.error.toString(), "FREIGHTER_SIGN_ERROR");
  }
  if (!res.signedTxXdr) {
    throw new WalletError("Freighter did not return a signed transaction.", "FREIGHTER_SIGN_ERROR");
  }
  return res.signedTxXdr;
}

export function shortAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address ?? "";
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
