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
    expect(mod.tokenForContract("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")).toBeUndefined();
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
  // SUPPORTED_TOKENS is derived from the environment at module load, so each
  // case has to drop the cached module before importing it — otherwise the
  // import returns the instance a previous test already evaluated and the
  // stubEnv call has no effect.
  beforeEach(() => {
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
    vi.resetModules();
    const mod2 = await import("../../../lib/stellar/config");
    expect(mod2.defaultToken().contractId).toBe("ANOTHER_CUSTOM_ID");
    expect(mod2.defaultToken().contractId).not.toBe(originalUsdc);
  });

  it("throws when NEXT_PUBLIC_USDC_CONTRACT_ID is unset on mainnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "");
    delete process.env.NEXT_PUBLIC_USDC_CONTRACT_ID;

    await expect(import("../../../lib/stellar/config")).rejects.toThrow("NEXT_PUBLIC_USDC_CONTRACT_ID is required on mainnet");
  });

  it("resolves USDC issuer dynamically per-network", async () => {
    // 1. Testnet default
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    const modTest = await import("../../../lib/stellar/config");
    expect(modTest.SUPPORTED_TOKENS[0].assetIssuer).toBe("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

    vi.resetModules();

    // 2. Mainnet (with custom contract to avoid the throw)
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "CUSTOM_MAINNET_USDC");
    const modMain = await import("../../../lib/stellar/config");
    expect(modMain.SUPPORTED_TOKENS[0].assetIssuer).toBe("GA5ZSEJYB37JRC52ZMRGKEZ2O6TKTHTEBZ5MM2KHYL3Q6XIXT6E7BW5U");

    vi.resetModules();

    // 3. Environment override
    vi.stubEnv("NEXT_PUBLIC_USDC_ISSUER", "CUSTOM_ISSUER");
    const modCustom = await import("../../../lib/stellar/config");
    expect(modCustom.SUPPORTED_TOKENS[0].assetIssuer).toBe("CUSTOM_ISSUER");
  });
});
