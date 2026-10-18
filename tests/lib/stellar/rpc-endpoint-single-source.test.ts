import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadStellarConfig } from "../../../lib/env";
import { MAINNET_RPC_URL, TESTNET_RPC_URL } from "../../../lib/stellar/endpoints";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const DEPLOYMENT_DOC = "docs/MAINNET_DEPLOYMENT.md";

/**
 * Issue #691: one endpoint, one truth.
 *
 * `lib/env.ts` and `lib/stellar/config.ts` each used to hold their own copy of
 * the RPC endpoint, and each had a test pinning its own copy. That is exactly
 * how the drift in #691 survived the suite: both copies could disagree and both
 * tests stayed green, because neither module was ever compared with the other
 * or with the deployment guide.
 *
 * These tests compare the three places an operator can read the endpoint from.
 */
describe("RPC endpoint single source of truth (Issue #691)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** `lib/env.ts` default, resolved the way a mainnet deploy resolves it. */
  function envDefault(network: "mainnet" | "testnet"): string {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", network);
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "CCONTRACT123");
    const errors: Array<{ field: string; message: string }> = [];
    const config = loadStellarConfig(errors);
    return config.rpcUrl;
  }

  /** `lib/stellar/config.ts` default, resolved the way the app resolves it. */
  async function configDefault(network: "mainnet" | "testnet"): Promise<string> {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", network);
    const mod = await import("../../../lib/stellar/config");
    return mod.RPC_URL;
  }

  it("pins the canonical mainnet endpoint", () => {
    expect(MAINNET_RPC_URL).toBe("https://soroban-rpc.stellar.org");
    expect(MAINNET_RPC_URL).not.toContain("testnet");
  });

  it("lib/env.ts defaults mainnet and testnet to the canonical endpoints", () => {
    expect(envDefault("mainnet")).toBe(MAINNET_RPC_URL);
    expect(envDefault("testnet")).toBe(TESTNET_RPC_URL);
  });

  it("lib/stellar/config.ts defaults mainnet and testnet to the canonical endpoints", async () => {
    expect(await configDefault("mainnet")).toBe(MAINNET_RPC_URL);
    expect(await configDefault("testnet")).toBe(TESTNET_RPC_URL);
  });

  it("both modules resolve the same endpoint for the same network", async () => {
    // The drift in #691 was exactly this: the two modules disagreeing while
    // each module's own test still passed.
    expect(envDefault("mainnet")).toBe(await configDefault("mainnet"));
    expect(envDefault("testnet")).toBe(await configDefault("testnet"));
  });

  it("the deployment guide tells operators to configure the canonical endpoint", () => {
    const doc = readFileSync(join(REPO_ROOT, DEPLOYMENT_DOC), "utf8");
    const assignment = new RegExp(
      `^NEXT_PUBLIC_STELLAR_RPC_URL=(\\S+)$`,
      "m"
    ).exec(doc);

    expect(assignment, `${DEPLOYMENT_DOC} no longer documents NEXT_PUBLIC_STELLAR_RPC_URL`).not.toBeNull();
    expect(assignment?.[1]).toBe(MAINNET_RPC_URL);
  });

  it("neither module keeps a private copy of the endpoints", () => {
    // The literals live in lib/stellar/endpoints.ts only, so the values cannot
    // drift apart again.
    for (const file of ["lib/env.ts", "lib/stellar/config.ts"]) {
      const source = readFileSync(join(REPO_ROOT, file), "utf8");
      expect(source, `${file} should import the canonical endpoints`).toContain(
        file === "lib/env.ts" ? "./stellar/endpoints" : "./endpoints"
      );
      expect(source, `${file} still hardcodes the mainnet endpoint`).not.toContain(
        `"${MAINNET_RPC_URL}"`
      );
      expect(source, `${file} still hardcodes the testnet endpoint`).not.toContain(
        `"${TESTNET_RPC_URL}"`
      );
    }
  });
});
