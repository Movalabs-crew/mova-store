import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as config from "../../../lib/stellar/config";

describe("lib/stellar/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("defaultToken", () => {
    it("returns SUPPORTED_TOKENS[0] and resolves to USDC with 7 decimals", () => {
      const token = config.defaultToken();
      expect(token).toBe(config.SUPPORTED_TOKENS[0]);
      expect(token.symbol).toBe("USDC");
      expect(token.decimals).toBe(7);
    });
  });

  describe("decimals and native asset flags", () => {
    it("declares 7 decimals for both USDC and XLM", () => {
      const usdc = config.tokenForContract(config.USDC_CONTRACT_ID);
      const xlm = config.tokenForContract(config.NATIVE_ASSET_CONTRACT_ID);

      expect(usdc?.decimals).toBe(7);
      expect(xlm?.decimals).toBe(7);
    });

    it("identifies XLM as a native asset", () => {
      const xlm = config.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
      expect(xlm?.isNative).toBe(true);
    });
  });

  describe("tokenForContract", () => {
    it("resolves known contract ids", () => {
      const usdc = config.tokenForContract(config.USDC_CONTRACT_ID);
      expect(usdc?.symbol).toBe("USDC");
      expect(usdc?.contractId).toBe(config.USDC_CONTRACT_ID);

      const xlm = config.tokenForContract(config.NATIVE_ASSET_CONTRACT_ID);
      expect(xlm?.symbol).toBe("XLM");
      expect(xlm?.contractId).toBe(config.NATIVE_ASSET_CONTRACT_ID);
    });

    it("returns undefined for unknown contract ids", () => {
      expect(config.tokenForContract("unknown_contract_id")).toBeUndefined();
    });
  });

  describe("environment overrides", () => {
    it("updates registry when contract ids are overridden via env", async () => {
      const customUsdc = "CCUSTOMUSDCCONTRACTID1234567890";
      const customNative = "CCUSTOMNATIVECONTRACTID1234567890";

      vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", customUsdc);
      vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", customNative);
      vi.resetModules();

      const reloadedConfig = await import("../../../lib/stellar/config");

      expect(reloadedConfig.USDC_CONTRACT_ID).toBe(customUsdc);
      expect(reloadedConfig.NATIVE_ASSET_CONTRACT_ID).toBe(customNative);

      expect(reloadedConfig.SUPPORTED_TOKENS[0].contractId).toBe(customUsdc);
      expect(reloadedConfig.SUPPORTED_TOKENS[1].contractId).toBe(customNative);

      const resolvedUsdc = reloadedConfig.tokenForContract(customUsdc);
      expect(resolvedUsdc?.symbol).toBe("USDC");
      expect(resolvedUsdc?.contractId).toBe(customUsdc);

      const resolvedXlm = reloadedConfig.tokenForContract(customNative);
      expect(resolvedXlm?.symbol).toBe("XLM");
      expect(resolvedXlm?.contractId).toBe(customNative);
    });
  });
});
