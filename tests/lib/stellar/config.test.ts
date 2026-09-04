import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as config from "../../../lib/stellar/config";

describe("Stellar Configuration Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // Test Case 1: Default Token Configuration
  it("should return the first supported token configuration as the default token", () => {
    const defaultToken = config.defaultToken();

    // Assert that defaultToken() is strictly equal to SUPPORTED_TOKENS[0]
    expect(defaultToken).toBe(config.SUPPORTED_TOKENS[0]);
    expect(typeof defaultToken).toBe("object");
    expect(defaultToken).not.toBeNull();
  });

  // Test Case 2: Decimal Verification for Specific Tokens
  it("should assert that USDC and XLM tokens declare 7 decimals", () => {
    const usdcConfig = config.tokenForContract(config.USDC_CONTRACT_ID);
    const xlmConfig = config.tokenForContract(config.NATIVE_ASSET_CONTRACT_ID);

    expect(usdcConfig).toBeDefined();
    expect(usdcConfig?.decimals).toBe(7);

    expect(xlmConfig).toBeDefined();
    expect(xlmConfig?.decimals).toBe(7);
  });

  // Test Case 3: Token Resolution Functionality
  it("should correctly resolve token configurations by contract ID", () => {
    // Test USDC resolution
    const usdcResolved = config.tokenForContract(config.USDC_CONTRACT_ID);
    expect(usdcResolved?.symbol).toBe("USDC");
    expect(usdcResolved?.contractId).toBe(config.USDC_CONTRACT_ID);

    // Test XLM resolution
    const xlmResolved = config.tokenForContract(config.NATIVE_ASSET_CONTRACT_ID);
    expect(xlmResolved?.symbol).toBe("XLM");
    expect(xlmResolved?.contractId).toBe(config.NATIVE_ASSET_CONTRACT_ID);
  });

  it("should return undefined when tokenForContract receives an unknown contract ID", () => {
    const unknownId = "unknown_contract_id";
    const result = config.tokenForContract(unknownId);
    expect(result).toBeUndefined();
  });

  // Test Case 4: Native Asset Identification
  it("should correctly identify the native asset (XLM) as having isNative set to true", () => {
    const xlmToken = config.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");

    expect(xlmToken).toBeDefined();
    expect(xlmToken?.isNative).toBe(true);
  });

  // Test Case 5: Environment Variable Override and Dynamic Import
  it("should dynamically load and reflect configuration changes when environment variables are overridden", async () => {
    const newUsdcId = "0xNEW_USDC_CONTRACT_ID";
    const newNativeId = "0xNEW_NATIVE_ASSET_CONTRACT_ID";

    // 1. Stub the environment variables
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", newUsdcId);
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", newNativeId);

    // 2. Reset modules to force re-evaluation of the configuration file with new env vars
    vi.resetModules();

    // 3. Re-import the module to capture the new state
    const dynamicConfig = await import("../../../lib/stellar/config");

    // 4. Verify the configuration reflects the overrides
    expect(dynamicConfig.USDC_CONTRACT_ID).toBe(newUsdcId);
    expect(dynamicConfig.NATIVE_ASSET_CONTRACT_ID).toBe(newNativeId);

    // 5. Verify tokenForContract reflects the new IDs
    const resolvedUsdc = dynamicConfig.tokenForContract(newUsdcId);
    expect(resolvedUsdc?.symbol).toBe("USDC");
    expect(resolvedUsdc?.contractId).toBe(newUsdcId);

    const resolvedXlm = dynamicConfig.tokenForContract(newNativeId);
    expect(resolvedXlm?.symbol).toBe("XLM");
    expect(resolvedXlm?.contractId).toBe(newNativeId);
  });
});
