import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Coverage for #707: the explorer link must be derived from the configured
 * network rather than a hardcoded `testnet`.
 *
 * `NETWORK` is resolved from the environment at module load, so each case stubs
 * the variable and re-imports the module (the same pattern as
 * `config.test.ts`).
 */
const TX_HASH =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("explorerTxUrl (#707)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it(
    "builds a testnet explorer link for a testnet build",
    { timeout: 30000 },
    async () => {
      vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

      const { explorerTxUrl } = await import("../../../lib/stellar/explorer");

      expect(explorerTxUrl(TX_HASH)).toBe(
        `https://stellar.expert/explorer/testnet/tx/${TX_HASH}`
      );
    }
  );

  it(
    "builds a mainnet explorer link for a mainnet build",
    { timeout: 30000 },
    async () => {
      vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");

      const { explorerTxUrl } = await import("../../../lib/stellar/explorer");

      // Before #707 the checkout receipt was pinned to `testnet` regardless of
      // the configured network.
      expect(explorerTxUrl(TX_HASH)).toBe(
        `https://stellar.expert/explorer/mainnet/tx/${TX_HASH}`
      );
    }
  );
});
