import { afterEach, describe, expect, it, vi } from "vitest";
import { StrKey } from "@stellar/stellar-sdk";

const USDC_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const XLM_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const OTHER_ID = "CBAU4T2UJBCVEX2DKVJVIT2NL5EUIX2YLBMFQAAAAAAAAAAAAAAAAAT5";

type ConfigModule = typeof import("../../../lib/stellar/config");

async function loadConfig(
  overrides: Record<string, string | undefined> = {}
): Promise<ConfigModule> {
  vi.resetModules();
  process.env = { ...process.env };
  if (overrides.NEXT_PUBLIC_STELLAR_NETWORK !== undefined) {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = overrides.NEXT_PUBLIC_STELLAR_NETWORK;
  } else {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  }
  if (overrides.NEXT_PUBLIC_USDC_CONTRACT_ID !== undefined) {
    process.env.NEXT_PUBLIC_USDC_CONTRACT_ID = overrides.NEXT_PUBLIC_USDC_CONTRACT_ID;
  } else {
    delete process.env.NEXT_PUBLIC_USDC_CONTRACT_ID;
  }
  if (overrides.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID !== undefined) {
    process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID =
      overrides.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID;
  } else {
    delete process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID;
  }
  return import("../../../lib/stellar/config");
}

describe("stellar config network validation", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  it("defaults to testnet when unset", async () => {
    const config = await loadConfig({});
    expect(config.NETWORK).toBe("testnet");
    expect(config.IS_MAINNET).toBe(false);
  });

  it("defaults to testnet when empty string", async () => {
    const config = await loadConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "" });
    expect(config.NETWORK).toBe("testnet");
  });

  it("accepts mainnet", async () => {
    const config = await loadConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" });
    expect(config.NETWORK).toBe("mainnet");
    expect(config.IS_MAINNET).toBe(true);
  });

  it("rejects unrecognised network values with a clear error", { timeout: 20000 }, async () => {
    await expect(loadConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "foo" })).rejects.toThrow(
      /Invalid NEXT_PUBLIC_STELLAR_NETWORK "foo"/
    );
    await expect(loadConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "TESTNET" })).rejects.toThrow(
      /Invalid NEXT_PUBLIC_STELLAR_NETWORK/
    );
    await expect(loadConfig({ NEXT_PUBLIC_STELLAR_NETWORK: "pubnet" })).rejects.toThrow(
      /Invalid NEXT_PUBLIC_STELLAR_NETWORK/
    );
  });
});

describe("stellar config SUPPORTED_TOKENS validation", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_USDC_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  it("exports unique valid contract ids for USDC and XLM", async () => {
    const config = await loadConfig({});
    expect(config.SUPPORTED_TOKENS).toHaveLength(2);
    expect(config.SUPPORTED_TOKENS[0].contractId).toBe(USDC_ID);
    expect(config.SUPPORTED_TOKENS[1].contractId).toBe(XLM_ID);
    expect(new Set(config.SUPPORTED_TOKENS.map((t) => t.contractId)).size).toBe(2);
  });

  it("rejects duplicate contract ids in the token registry", async () => {
    await expect(
      loadConfig({
        NEXT_PUBLIC_USDC_CONTRACT_ID: OTHER_ID,
        NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID: OTHER_ID,
      })
    ).rejects.toThrow(/must be unique/);
  });

  it("rejects invalid C... StrKey values in the token registry", async () => {
    await expect(
      loadConfig({
        NEXT_PUBLIC_USDC_CONTRACT_ID: "not-a-contract",
        NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID: XLM_ID,
      })
    ).rejects.toThrow(/invalid contract id/);
  });

  it("rejects invalid XLM contract ids in the token registry", async () => {
    await expect(
      loadConfig({
        NEXT_PUBLIC_USDC_CONTRACT_ID: USDC_ID,
        NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID: "not-a-contract",
      })
    ).rejects.toThrow(/invalid contract id/);
  });

  it("StrKey.isValidContract rejects non C... values", () => {
    expect(StrKey.isValidContract(USDC_ID)).toBe(true);
    expect(StrKey.isValidContract("not-a-contract")).toBe(false);
  });

  it("defaultToken and tokenForContract operate on the validated registry", async () => {
    const config = await loadConfig({});
    expect(config.defaultToken().symbol).toBe("USDC");
    expect(config.tokenForContract(XLM_ID)?.symbol).toBe("XLM");
    expect(config.tokenForContract("CBOGUS")).toBeUndefined();
  });
});
