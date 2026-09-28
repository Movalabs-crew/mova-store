import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("lib/stellar/config — default behavior", () => {
  it("defaultToken returns USDC as the first supported token", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.defaultToken()).toBe(mod.SUPPORTED_TOKENS[0]);
    expect(mod.defaultToken().symbol).toBe("USDC");
  });

  it("tokenForContract resolves known contract IDs", async () => {
    const mod = await import("../../../lib/stellar/config");
    const usdc = mod.tokenForContract(mod.SUPPORTED_TOKENS[0].contractId);
    expect(usdc).toBeDefined();
    expect(usdc?.symbol).toBe("USDC");

    const xlm = mod.tokenForContract(mod.SUPPORTED_TOKENS[1].contractId);
    expect(xlm).toBeDefined();
    expect(xlm?.symbol).toBe("XLM");
  });

  it("tokenForContract returns undefined for unknown contract id", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(
      mod.tokenForContract("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")
    ).toBeUndefined();
  });

  it("XLM entry is marked as native", async () => {
    const mod = await import("../../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.isNative).toBe(true);
  });

  it("USDC and XLM both declare 7 decimals", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.SUPPORTED_TOKENS[0].decimals).toBe(7);
    expect(mod.SUPPORTED_TOKENS[1].decimals).toBe(7);
  });
});

describe("lib/stellar/config — env overrides", () => {
  beforeEach(() => {
    // config.ts reads process.env at module-evaluation time, so a fresh
    // import is required for a stubbed value to be observed.
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("overriding NEXT_PUBLIC_USDC_CONTRACT_ID changes defaultToken symbol", async () => {
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "CUSTOM_USDC_CONTRACT_123");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    const mod = await import("../../../lib/stellar/config");
    const defaultTok = mod.defaultToken();
    expect(defaultTok.contractId).toBe("CUSTOM_USDC_CONTRACT_123");
    expect(defaultTok.symbol).toBe("USDC");
  });

  it("overriding NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID changes XLM contract id", async () => {
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", "CUSTOM_NATIVE_CONTRACT_456");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    const mod = await import("../../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.contractId).toBe("CUSTOM_NATIVE_CONTRACT_456");
  });

  it("env override does not affect already-imported modules", async () => {
    const mod1 = await import("../../../lib/stellar/config");
    const originalUsdc = mod1.defaultToken().contractId;

    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "ANOTHER_CUSTOM_ID");
    // Discard the cached module so the re-import re-reads the environment;
    // mod1 must keep the value it was originally loaded with.
    vi.resetModules();
    const mod2 = await import("../../../lib/stellar/config");
    expect(mod2.defaultToken().contractId).toBe("ANOTHER_CUSTOM_ID");
    expect(mod2.defaultToken().contractId).not.toBe(originalUsdc);
  });
});

describe("lib/stellar/config — canonical RPC defaults", () => {
  const RPC_KEY = "NEXT_PUBLIC_STELLAR_RPC_URL";
  let savedRpc: string | undefined;

  beforeEach(() => {
    savedRpc = process.env[RPC_KEY];
    // `??` only falls back on undefined, so the variable has to be absent
    // rather than empty for the module defaults to be exercised.
    delete process.env[RPC_KEY];
  });

  afterEach(() => {
    if (savedRpc === undefined) {
      delete process.env[RPC_KEY];
    } else {
      process.env[RPC_KEY] = savedRpc;
    }
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("pins the mainnet default to the documented canonical endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.resetModules();

    const mod = await import("../../../lib/stellar/config");

    // Canonical per docs/MAINNET_DEPLOYMENT.md and lib/env.ts
    // STELLAR_DEFAULTS.mainnet (issue #531). If this fails, the code default
    // has drifted from the documented endpoint again.
    expect(mod.RPC_URL).toBe("https://soroban-rpc.stellar.org");
  });

  it("pins the testnet default to the documented canonical endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    vi.resetModules();

    const mod = await import("../../../lib/stellar/config");

    expect(mod.RPC_URL).toBe("https://soroban-testnet.stellar.org");
  });

  it("resolves the same endpoint as loadStellarConfig() on both networks", async () => {
    for (const network of ["testnet", "mainnet"] as const) {
      vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", network);
      vi.resetModules();

      const { loadStellarConfig } = await import("../../../lib/env");
      const mod = await import("../../../lib/stellar/config");

      expect(mod.RPC_URL).toBe(loadStellarConfig().rpcUrl);
    }
  });
});
