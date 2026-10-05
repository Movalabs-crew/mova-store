/**
 * Canonical Soroban RPC endpoints (#691).
 *
 * These were previously written out twice, once in `lib/env.ts`
 * (`STELLAR_DEFAULTS`) and once in `lib/stellar/config.ts` (`RPC_URL`). Two
 * copies of one endpoint can drift, and they did: d5fb865 reconciled
 * `lib/env.ts` and `docs/MAINNET_DEPLOYMENT.md` onto the stellar.org host but
 * left `lib/stellar/config.ts` pointing at gateway.fm, so a mainnet build with
 * `NEXT_PUBLIC_STELLAR_RPC_URL` unset talked to a different RPC depending on
 * which module resolved the URL.
 *
 * Both modules now read the endpoint from here, and
 * `tests/lib/stellar/rpc-endpoint-single-source.test.ts` fails if the two
 * modules disagree or if the deployment guide stops naming the same endpoint.
 */
export const MAINNET_RPC_URL = "https://soroban-rpc.stellar.org";
export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
