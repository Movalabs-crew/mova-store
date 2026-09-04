import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SUPPORTED_TOKENS,
  defaultToken,
  tokenForContract,
  USDC_CONTRACT_ID,
  NATIVE_ASSET_CONTRACT_ID,
  TESTNET_USDC_CONTRACT_ID,
  TESTNET_USDC_ISSUER,
  TESTNET_NATIVE_ASSET_CONTRACT_ID,
  MAINNET_NATIVE_ASSET_CONTRACT_ID,
  USDC_DECIMALS,
} from "../../../lib/stellar/config";

describe("token registry static assertions", () => {
  it("ensures defaultToken returns the first element of SUPPORTED_TOKENS", () => {
    expect(defaultToken()).toBe(SUPPORTED_TOKENS[0]);
  });

  it("ensures defaultToken returns USDC", () => {
    const token = defaultToken();
    expect(token.symbol).toBe("USDC");
    expect(token.name).toBe("USD Coin");
    expect(token.decimals).toBe(7);
    expect(token.decimals).toBe(USDC_DECIMALS);
    expect(token.contractId).toBe(USDC_CONTRACT_ID);
    expect(token.assetCode).toBe("USDC");
    expect(token.assetIssuer).toBe(TESTNET_USDC_ISSUER);
  });

  it("ensures both USDC and XLM declare 7 decimals", () => {
    const usdc = SUPPORTED_TOKENS.find((token) => token.symbol === "USDC");
    const xlm = SUPPORTED_TOKENS.find((token) => token.symbol === "XLM");

    expect(usdc).toBeDefined();
    expect(xlm).toBeDefined();
    expect(usdc?.decimals).toBe(7);
    expect(xlm?.decimals).toBe(7);
  });

  it("ensures the XLM entry is configured as native", () => {
    const xlm = SUPPORTED_TOKENS.find((token) => token.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm?.isNative).toBe(true);
    expect(xlm?.name).toBe("Stellar Lumens");
    expect(xlm?.contractId).toBe(NATIVE_ASSET_CONTRACT_ID);
  });

  it("resolves known contract identifiers using tokenForContract", () => {
    const usdc = tokenForContract(USDC_CONTRACT_ID);
    expect(usdc).toBeDefined();
    expect(usdc?.symbol).toBe("USDC");
    expect(usdc).toBe(SUPPORTED_TOKENS[0]);

    const xlm = tokenForContract(NATIVE_ASSET_CONTRACT_ID);
    expect(xlm).toBeDefined();
    expect(xlm?.symbol).toBe("XLM");
    expect(xlm).toBe(SUPPORTED_TOKENS[1]);
  });

  it("returns undefined for unknown contract identifiers in tokenForContract", () => {
    expect(tokenForContract("UNKNOWN_CONTRACT_ID")).toBeUndefined();
    expect(tokenForContract("non-existent-contract-id")).toBeUndefined();
    expect(tokenForContract("")).toBeUndefined();
  });
});

describe("dynamic environment overrides", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("updates USDC contract id and registry when NEXT_PUBLIC_USDC_CONTRACT_ID is overridden", async () => {
    const customUsdcId = "CCUSTOMUSDC0000000000000000000000000000000000000000000001";
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", customUsdcId);

    const config = await import("../../../lib/stellar/config");

    expect(config.USDC_CONTRACT_ID).toBe(customUsdcId);
    expect(config.SUPPORTED_TOKENS[0].contractId).toBe(customUsdcId);
    expect(config.defaultToken().contractId).toBe(customUsdcId);
    expect(config.tokenForContract(customUsdcId)?.symbol).toBe("USDC");
    expect(config.tokenForContract(TESTNET_USDC_CONTRACT_ID)).toBeUndefined();
  });

  it("updates native asset contract id and registry when NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID is overridden", async () => {
    const customNativeId = "CCUSTOMXLM000000000000000000000000000000000000000000000002";
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", customNativeId);

    const config = await import("../../../lib/stellar/config");

    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(customNativeId);
    expect(config.SUPPORTED_TOKENS[1].contractId).toBe(customNativeId);
    expect(config.tokenForContract(customNativeId)?.symbol).toBe("XLM");
    expect(config.tokenForContract(TESTNET_NATIVE_ASSET_CONTRACT_ID)).toBeUndefined();
  });

  it("defaults to mainnet native contract id when NEXT_PUBLIC_STELLAR_NETWORK is mainnet without explicit native asset contract", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");

    const config = await import("../../../lib/stellar/config");

    expect(config.IS_MAINNET).toBe(true);
    expect(config.NETWORK).toBe("mainnet");
    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(MAINNET_NATIVE_ASSET_CONTRACT_ID);
    expect(config.tokenForContract(MAINNET_NATIVE_ASSET_CONTRACT_ID)?.symbol).toBe("XLM");
  });
});
