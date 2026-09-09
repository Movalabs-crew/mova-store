import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The token registry is assembled at module load from process.env, so each case
// sets the environment, resets the module graph and imports config fresh.
//
// config.ts reads its overrides with `??`, which only falls back on undefined.
// An empty string would therefore be used literally, so "unset" here means the
// key is deleted rather than stubbed empty.

const OVERRIDE_KEYS = [
  "NEXT_PUBLIC_STELLAR_NETWORK",
  "NEXT_PUBLIC_USDC_CONTRACT_ID",
  "NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID",
];

const saved: Record<string, string | undefined> = {};

async function loadConfig(overrides: Record<string, string> = {}) {
  for (const key of OVERRIDE_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
  vi.resetModules();
  return import("../../../lib/stellar/config");
}

beforeEach(() => {
  for (const key of OVERRIDE_KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of OVERRIDE_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key] as string;
  }
  vi.resetModules();
});

describe("token registry", () => {
  it("lists USDC first and XLM second", async () => {
    const { SUPPORTED_TOKENS } = await loadConfig();

    expect(SUPPORTED_TOKENS.map((t) => t.symbol)).toEqual(["USDC", "XLM"]);
  });

  it("defaults to the first entry", async () => {
    const { defaultToken, SUPPORTED_TOKENS } = await loadConfig();

    expect(defaultToken()).toBe(SUPPORTED_TOKENS[0]);
    expect(defaultToken().symbol).toBe("USDC");
  });

  it("declares seven decimals for both tokens", async () => {
    const { SUPPORTED_TOKENS } = await loadConfig();

    for (const token of SUPPORTED_TOKENS) {
      expect(token.decimals).toBe(7);
    }
  });

  it("marks only XLM as native", async () => {
    const { SUPPORTED_TOKENS } = await loadConfig();
    const [usdc, xlm] = SUPPORTED_TOKENS;

    // isNative drives whether a trustline check is required, so the absence on
    // USDC matters as much as the flag on XLM.
    expect(xlm.isNative).toBe(true);
    expect(usdc.isNative).toBeUndefined();
  });

  it("carries the classic asset code and issuer on USDC only", async () => {
    const { SUPPORTED_TOKENS } = await loadConfig();
    const [usdc, xlm] = SUPPORTED_TOKENS;

    expect(usdc.assetCode).toBe("USDC");
    expect(usdc.assetIssuer).toBeTruthy();
    expect(xlm.assetCode).toBeUndefined();
    expect(xlm.assetIssuer).toBeUndefined();
  });
});

describe("tokenForContract", () => {
  it("resolves every registered contract id", async () => {
    const { SUPPORTED_TOKENS, tokenForContract } = await loadConfig();

    for (const token of SUPPORTED_TOKENS) {
      expect(tokenForContract(token.contractId)).toBe(token);
    }
  });

  it("returns undefined for an unknown contract id", async () => {
    const { tokenForContract } = await loadConfig();

    expect(tokenForContract("CNOTAREGISTEREDCONTRACTID")).toBeUndefined();
  });

  it("returns undefined for an empty contract id", async () => {
    const { tokenForContract } = await loadConfig();

    expect(tokenForContract("")).toBeUndefined();
  });

  it("matches exactly rather than case-insensitively", async () => {
    const { SUPPORTED_TOKENS, tokenForContract } = await loadConfig();

    expect(tokenForContract(SUPPORTED_TOKENS[0].contractId.toLowerCase())).toBeUndefined();
  });
});

describe("environment overrides", () => {
  it("uses an overridden USDC contract id", async () => {
    const override = "CUSDCOVERRIDECONTRACTID";
    const { SUPPORTED_TOKENS, tokenForContract } = await loadConfig({
      NEXT_PUBLIC_USDC_CONTRACT_ID: override,
    });

    expect(SUPPORTED_TOKENS[0].contractId).toBe(override);
    expect(tokenForContract(override)?.symbol).toBe("USDC");
  });

  it("uses an overridden native asset contract id", async () => {
    const override = "CXLMOVERRIDECONTRACTID";
    const { SUPPORTED_TOKENS, tokenForContract } = await loadConfig({
      NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID: override,
    });

    expect(SUPPORTED_TOKENS[1].contractId).toBe(override);
    expect(tokenForContract(override)?.isNative).toBe(true);
  });

  it("falls back to the testnet native id when the network is unset", async () => {
    const { SUPPORTED_TOKENS, TESTNET_NATIVE_ASSET_CONTRACT_ID } = await loadConfig();

    expect(SUPPORTED_TOKENS[1].contractId).toBe(TESTNET_NATIVE_ASSET_CONTRACT_ID);
  });

  it("switches the native id to mainnet when the network says mainnet", async () => {
    const { SUPPORTED_TOKENS, MAINNET_NATIVE_ASSET_CONTRACT_ID } = await loadConfig({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });

    expect(SUPPORTED_TOKENS[1].contractId).toBe(MAINNET_NATIVE_ASSET_CONTRACT_ID);
  });

  it("keeps an explicit native override ahead of the network default", async () => {
    const override = "CEXPLICITNATIVEOVERRIDE";
    const { SUPPORTED_TOKENS } = await loadConfig({
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
      NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID: override,
    });

    expect(SUPPORTED_TOKENS[1].contractId).toBe(override);
  });
});
