import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const UNKNOWN_ID = "C" + "0".repeat(55);
const ALT_USDC_ID = "C" + "1".repeat(55);
const ALT_NATIVE_ID = "C" + "2".repeat(55);

async function importConfig() {
  vi.resetModules();
  return import("../../../lib/stellar/config");
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("token registry defaults (testnet)", () => {
  it("defaults to USDC, which is first in the registry with 7 decimals", async () => {
    const config = await importConfig();
    expect(config.defaultToken()).toBe(config.SUPPORTED_TOKENS[0]);
    expect(config.defaultToken().symbol).toBe("USDC");
    expect(config.defaultToken().decimals).toBe(7);
    expect(config.USDC_DECIMALS).toBe(7);
  });

  it("includes a native XLM entry with 7 decimals", async () => {
    const config = await importConfig();
    const xlm = config.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.isNative).toBe(true);
    expect(xlm!.decimals).toBe(7);
  });

  it("resolves known contract ids and returns undefined for unknown ones", async () => {
    const config = await importConfig();
    expect(config.tokenForContract(config.USDC_CONTRACT_ID)?.symbol).toBe("USDC");
    expect(config.tokenForContract(config.NATIVE_ASSET_CONTRACT_ID)?.symbol).toBe(
      "XLM"
    );
    expect(config.tokenForContract(UNKNOWN_ID)).toBeUndefined();
  });
});

describe("env overrides rebuild the registry", () => {
  it("honours NEXT_PUBLIC_USDC_CONTRACT_ID after a fresh module import", async () => {
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", ALT_USDC_ID);
    const config = await importConfig();
    expect(config.USDC_CONTRACT_ID).toBe(ALT_USDC_ID);
    expect(config.tokenForContract(ALT_USDC_ID)?.symbol).toBe("USDC");
    expect(config.tokenForContract(config.TESTNET_USDC_CONTRACT_ID)).toBeUndefined();
  });

  it("honours NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID after a fresh module import", async () => {
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", ALT_NATIVE_ID);
    const config = await importConfig();
    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(ALT_NATIVE_ID);
    expect(config.tokenForContract(ALT_NATIVE_ID)?.symbol).toBe("XLM");
    expect(config.tokenForContract(config.TESTNET_NATIVE_ASSET_CONTRACT_ID)).toBe(
      undefined
    );
  });
});
