import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Stellar token registry in lib/stellar/config.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("defaultToken() returns SUPPORTED_TOKENS[0] and both USDC and XLM declare 7 decimals", async () => {
    const config = await import("../../../lib/stellar/config");

    expect(config.defaultToken()).toBe(config.SUPPORTED_TOKENS[0]);
    expect(config.defaultToken().symbol).toBe("USDC");
    expect(config.defaultToken().decimals).toBe(7);

    const xlmToken = config.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlmToken).toBeDefined();
    expect(xlmToken?.decimals).toBe(7);
    expect(xlmToken?.isNative).toBe(true);
  });

  it("tokenForContract resolves known contract ids correctly", async () => {
    const config = await import("../../../lib/stellar/config");

    const usdc = config.tokenForContract(config.USDC_CONTRACT_ID);
    expect(usdc).toBeDefined();
    expect(usdc?.symbol).toBe("USDC");

    const xlm = config.tokenForContract(config.NATIVE_ASSET_CONTRACT_ID);
    expect(xlm).toBeDefined();
    expect(xlm?.symbol).toBe("XLM");
  });

  it("tokenForContract returns undefined for an unknown contract id", async () => {
    const config = await import("../../../lib/stellar/config");

    const unknown = config.tokenForContract("CUNKNOWN1234567890ABCDEFGH");
    expect(unknown).toBeUndefined();
  });

  it("updates registry when NEXT_PUBLIC_USDC_CONTRACT_ID env var is overridden", async () => {
    const customUsdcId = "CCUSTOMUSDC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12";
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", customUsdcId);
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");

    expect(config.USDC_CONTRACT_ID).toBe(customUsdcId);
    expect(config.defaultToken().contractId).toBe(customUsdcId);
    expect(config.tokenForContract(customUsdcId)?.symbol).toBe("USDC");
  });

  it("updates registry when NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID env var is overridden", async () => {
    const customNativeId = "CCUSTOMNATIVE1234567890ABCDEFGHIJKLMNOPQRSTUVWXY";
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", customNativeId);
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");

    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(customNativeId);
    const xlmToken = config.tokenForContract(customNativeId);
    expect(xlmToken).toBeDefined();
    expect(xlmToken?.symbol).toBe("XLM");
    expect(xlmToken?.isNative).toBe(true);
  });

  it("configures mainnet contracts and RPC defaults when NEXT_PUBLIC_STELLAR_NETWORK is mainnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");

    expect(config.IS_MAINNET).toBe(true);
    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(config.MAINNET_NATIVE_ASSET_CONTRACT_ID);
    expect(config.RPC_URL).toBe("https://soroban-rpc.stellar.org");
  });
});
