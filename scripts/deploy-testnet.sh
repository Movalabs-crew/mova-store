#!/usr/bin/env bash
#
# Deploy the Mova Store checkout contract to Stellar testnet and initialize it.
#
# Requires:
#   - Rust + wasm32v1-none target  (rustup target add wasm32v1-none)
#   - Stellar CLI                   (brew install stellar-cli, or see
#                                    https://github.com/stellar/stellar-cli)
#   - A funded testnet keypair      (stellar keys generate --fund)
#
# Usage:
#   scripts/deploy-testnet.sh [MERCHANT_G_ADDRESS]
#
# If no merchant address is given, the script uses the deploying account's
# public key as the merchant. After initialize it whitelists USDC and native
# XLM so payments with either token are accepted.

set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
SOURCE_ACCOUNT="${STELLAR_SOURCE_ACCOUNT:-alice}"
CONTRACT_DIR="contracts/checkout"
MERCHANT="${1:-$(stellar keys address "${SOURCE_ACCOUNT}")}"

echo "==> Building contract (wasm32v1-none)…"
(cd "${CONTRACT_DIR}" && cargo build --target wasm32v1-none --release)

WASM="${CONTRACT_DIR}/target/wasm32v1-none/release/movastore_checkout.wasm"
if [[ ! -f "${WASM}" ]]; then
  echo "error: ${WASM} not found. Is your toolchain configured for wasm32v1-none?" >&2
  exit 1
fi

echo "==> Deploying to ${NETWORK}…"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "${WASM}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  --alias movastore_checkout)
echo "    contract id: ${CONTRACT_ID}"

echo "==> Initializing with merchant ${MERCHANT}…"
stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- \
  initialize \
  --merchant "${MERCHANT}"

# Whitelist the default supported tokens (testnet USDC SAC + native XLM SAC).
# Override with TESTNET_USDC_CONTRACT_ID / TESTNET_NATIVE_CONTRACT_ID.
USDC_CONTRACT="${TESTNET_USDC_CONTRACT_ID:-CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA}"
NATIVE_CONTRACT="${TESTNET_NATIVE_CONTRACT_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

echo "==> Whitelisting USDC (${USDC_CONTRACT})…"
stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- \
  add_token \
  --token "${USDC_CONTRACT}"

echo "==> Whitelisting native XLM (${NATIVE_CONTRACT})…"
stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source-account "${SOURCE_ACCOUNT}" \
  --network "${NETWORK}" \
  -- \
  add_token \
  --token "${NATIVE_CONTRACT}"

echo
echo "Done. Add this to your .env.local:"
echo "  NEXT_PUBLIC_CHECKOUT_CONTRACT_ID=${CONTRACT_ID}"
