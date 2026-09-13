import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("lib/stellar/config — default behavior", () => {
  it("defaultToken returns USDC as the first supported token", async () => {
    const mod = await import("../../lib/stellar/config");
    expect(mod.defaultToken()).toBe(mod.SUPPORTED_TOKENS[0]);
    expect(mod.defaultToken().symbol).toBe("USDC");
  });

  it("tokenForContract resolves known contract IDs", async () => {
    const mod = await import("../../lib/stellar/config");
    const usdc = mod.tokenForContract(mod.SUPPORTED_TOKENS[0].contractId);
    expect(usdc).toBeDefined();
    expect(usdc?.symbol).toBe("USDC");

    const xlm = mod.tokenForContract(mod.SUPPORTED_TOKENS[1].contractId);
    expect(xlm).toBeDefined();
    expect(xlm?.symbol).toBe("XLM");
  });

  it("tokenForContract returns undefined for unknown contract id", async () => {
    const mod = await import("../../lib/stellar/config");
    expect(mod.tokenForContract("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")).toBeUndefined();
  });

  it("XLM entry is marked as native", async () => {
    const mod = await import("../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.isNative).toBe(true);
  });

  it("USDC and XLM both declare 7 decimals", async () => {
    const mod = await import("../../lib/stellar/config");
    expect(mod.SUPPORTED_TOKENS[0].decimals).toBe(7);
    expect(mod.SUPPORTED_TOKENS[1].decimals).toBe(7);
  });
});

describe("lib/stellar/config — env overrides", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("overriding NEXT_PUBLIC_USDC_CONTRACT_ID changes defaultToken symbol", async () => {
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "CUSTOM_USDC_CONTRACT_123");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    const mod = await import("../../lib/stellar/config");
    const defaultTok = mod.defaultToken();
    expect(defaultTok.contractId).toBe("CUSTOM_USDC_CONTRACT_123");
    expect(defaultTok.symbol).toBe("USDC");
  });

  it("overriding NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID changes XLM contract id", async () => {
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", "CUSTOM_NATIVE_CONTRACT_456");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    const mod = await import("../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.contractId).toBe("CUSTOM_NATIVE_CONTRACT_456");
  });

  it("env override does not affect already-imported modules", async () => {
    const mod1 = await import("../../lib/stellar/config");
    const originalUsdc = mod1.defaultToken().contractId;

    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "ANOTHER_CUSTOM_ID");
    const mod2 = await import("../../lib/stellar/config");
    expect(mod2.defaultToken().contractId).toBe("ANOTHER_CUSTOM_ID");
    expect(mod2.defaultToken().contractId).not.toBe(originalUsdc);
  });
});
