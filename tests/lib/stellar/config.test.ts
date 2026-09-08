import { describe, it, expect, vi, beforeEach } from "vitest";

// ponytail: static import for baseline tests, dynamic import for env override tests

import {
  SUPPORTED_TOKENS,
  USDC_CONTRACT_ID,
  NATIVE_ASSET_CONTRACT_ID,
  TESTNET_USDC_CONTRACT_ID,
  TESTNET_NATIVE_ASSET_CONTRACT_ID,
  MAINNET_NATIVE_ASSET_CONTRACT_ID,
  TESTNET_USDC_ISSUER,
  NETWORK,
  IS_MAINNET,
  RPC_URL,
  NETWORK_PASSPHRASE,
  USDC_DECIMALS,
  TX_TIMEOUT_SECONDS,
  TX_POLL_INTERVAL_MS,
  FEE_BUFFER_STROOPS,
  defaultToken,
  tokenForContract,
  type TokenConfig,
} from "../../../lib/stellar/config";

// ---------------------------------------------------------------------------
// Baseline token registry (default testnet env)
// ---------------------------------------------------------------------------

describe("token registry – baseline", () => {
  it("SUPPORTED_TOKENS has exactly 2 entries", () => {
    expect(SUPPORTED_TOKENS).toHaveLength(2);
  });

  it("first token is USDC with correct shape", () => {
    const usdc = SUPPORTED_TOKENS[0];
    expect(usdc.symbol).toBe("USDC");
    expect(usdc.name).toBe("USD Coin");
    expect(usdc.decimals).toBe(7);
    expect(usdc.contractId).toBe(USDC_CONTRACT_ID);
    expect(usdc.assetCode).toBe("USDC");
    expect(usdc.assetIssuer).toBe(TESTNET_USDC_ISSUER);
    expect(usdc.isNative).toBeUndefined();
  });

  it("second token is XLM with isNative true", () => {
    const xlm = SUPPORTED_TOKENS[1];
    expect(xlm.symbol).toBe("XLM");
    expect(xlm.name).toBe("Stellar Lumens");
    expect(xlm.decimals).toBe(7);
    expect(xlm.contractId).toBe(NATIVE_ASSET_CONTRACT_ID);
    expect(xlm.isNative).toBe(true);
    // XLM should NOT have assetCode/assetIssuer
    expect(xlm.assetCode).toBeUndefined();
    expect(xlm.assetIssuer).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// defaultToken + tokenForContract
// ---------------------------------------------------------------------------

describe("defaultToken()", () => {
  it("returns the first supported token (USDC)", () => {
    const token = defaultToken();
    expect(token).toBe(SUPPORTED_TOKENS[0]);
    expect(token.symbol).toBe("USDC");
  });
});

describe("tokenForContract()", () => {
  it("resolves USDC by contract id", () => {
    const token = tokenForContract(USDC_CONTRACT_ID);
    expect(token).toBeDefined();
    expect(token!.symbol).toBe("USDC");
  });

  it("resolves XLM by contract id", () => {
    const token = tokenForContract(NATIVE_ASSET_CONTRACT_ID);
    expect(token).toBeDefined();
    expect(token!.symbol).toBe("XLM");
    expect(token!.isNative).toBe(true);
  });

  it("returns undefined for unknown contract id", () => {
    expect(tokenForContract("CUNKNOWN")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Default network constants (testnet, no env overrides)
// ---------------------------------------------------------------------------

describe("network defaults (testnet)", () => {
  it("NETWORK defaults to testnet", () => {
    expect(NETWORK).toBe("testnet");
  });

  it("IS_MAINNET is false on testnet", () => {
    expect(IS_MAINNET).toBe(false);
  });

  it("RPC_URL points to testnet RPC", () => {
    expect(RPC_URL).toContain("testnet");
  });

  it("USDC_CONTRACT_ID equals testnet default", () => {
    expect(USDC_CONTRACT_ID).toBe(TESTNET_USDC_CONTRACT_ID);
  });

  it("NATIVE_ASSET_CONTRACT_ID equals testnet default", () => {
    expect(NATIVE_ASSET_CONTRACT_ID).toBe(TESTNET_NATIVE_ASSET_CONTRACT_ID);
  });
});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe("exported constants", () => {
  it("USDC_DECIMALS is 7", () => {
    expect(USDC_DECIMALS).toBe(7);
  });

  it("TX_TIMEOUT_SECONDS is 60", () => {
    expect(TX_TIMEOUT_SECONDS).toBe(60);
  });

  it("TX_POLL_INTERVAL_MS is 2500", () => {
    expect(TX_POLL_INTERVAL_MS).toBe(2500);
  });

  it("FEE_BUFFER_STROOPS is BigInt(500000)", () => {
    expect(FEE_BUFFER_STROOPS).toBe(BigInt(500000));
  });

  it("TESTNET_USDC_CONTRACT_ID is a valid Stellar contract id", () => {
    expect(TESTNET_USDC_CONTRACT_ID).toMatch(/^C[A-Z0-9]{55}$/);
  });

  it("MAINNET_NATIVE_ASSET_CONTRACT_ID is a valid Stellar contract id", () => {
    expect(MAINNET_NATIVE_ASSET_CONTRACT_ID).toMatch(/^C[A-Z0-9]{55}$/);
  });
});

// ---------------------------------------------------------------------------
// Environment overrides (dynamic re-import)
// ---------------------------------------------------------------------------

describe("environment overrides", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("switches to mainnet when NEXT_PUBLIC_STELLAR_NETWORK=mainnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");

    const mod = await import("../../../lib/stellar/config");

    expect(mod.NETWORK).toBe("mainnet");
    expect(mod.IS_MAINNET).toBe(true);
    expect(mod.RPC_URL).toContain("soroban-rpc.stellar.org");
    expect(mod.RPC_URL).not.toContain("testnet");
    expect(mod.NATIVE_ASSET_CONTRACT_ID).toBe(
      mod.MAINNET_NATIVE_ASSET_CONTRACT_ID
    );

    vi.unstubAllEnvs();
  });

  it("overrides USDC contract id from env", async () => {
    const customUsdc = "CCUSTOMUSDCCONTRACTIDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", customUsdc);

    const mod = await import("../../../lib/stellar/config");

    expect(mod.USDC_CONTRACT_ID).toBe(customUsdc);
    // SUPPORTED_TOKENS[0] should use the overridden contract id
    expect(mod.SUPPORTED_TOKENS[0].contractId).toBe(customUsdc);

    vi.unstubAllEnvs();
  });

  it("overrides RPC URL from env", async () => {
    const customRpc = "https://custom-rpc.example.com";
    vi.stubEnv("NEXT_PUBLIC_STELLAR_RPC_URL", customRpc);

    const mod = await import("../../../lib/stellar/config");

    expect(mod.RPC_URL).toBe(customRpc);

    vi.unstubAllEnvs();
  });

  it("overrides native asset contract id from env", async () => {
    const customNative =
      "CCUSTOMNATIVEASSETCONTRACTIDXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", customNative);

    const mod = await import("../../../lib/stellar/config");

    expect(mod.NATIVE_ASSET_CONTRACT_ID).toBe(customNative);
    // XLM token in registry uses the overridden id
    expect(mod.SUPPORTED_TOKENS[1].contractId).toBe(customNative);

    vi.unstubAllEnvs();
  });
});
