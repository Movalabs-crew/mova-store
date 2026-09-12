import { describe, it, expect, vi, afterEach } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import {
  SUPPORTED_TOKENS,
  defaultToken,
  tokenForContract,
  USDC_CONTRACT_ID,
  TESTNET_USDC_CONTRACT_ID,
  NATIVE_ASSET_CONTRACT_ID,
  TESTNET_NATIVE_ASSET_CONTRACT_ID,
  MAINNET_NATIVE_ASSET_CONTRACT_ID,
  USDC_DECIMALS,
  IS_MAINNET,
  RPC_URL,
  NETWORK_PASSPHRASE,
  CHECKOUT_CONTRACT_ID,
} from "../../../lib/stellar/config";

describe("Stellar token registry (static baseline)", () => {
  it("defaultToken returns the first entry in SUPPORTED_TOKENS", () => {
    expect(defaultToken()).toBe(SUPPORTED_TOKENS[0]);
    expect(defaultToken().symbol).toBe("USDC");
    expect(defaultToken().name).toBe("USD Coin");
  });

  it("both USDC and XLM tokens declare 7 decimals", () => {
    const usdc = SUPPORTED_TOKENS.find((t) => t.symbol === "USDC");
    const xlm = SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");

    expect(usdc).toBeDefined();
    expect(xlm).toBeDefined();
    expect(usdc?.decimals).toBe(7);
    expect(xlm?.decimals).toBe(7);
    expect(USDC_DECIMALS).toBe(7);
  });

  it("identifies native XLM and non-native USDC correctly", () => {
    const usdc = SUPPORTED_TOKENS.find((t) => t.symbol === "USDC");
    const xlm = SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");

    expect(xlm?.isNative).toBe(true);
    expect(usdc?.isNative).toBeFalsy();
    expect(usdc?.assetCode).toBe("USDC");
    expect(usdc?.assetIssuer).toBeDefined();
  });

  it("tokenForContract resolves known contract IDs", () => {
    const usdcToken = tokenForContract(USDC_CONTRACT_ID);
    expect(usdcToken).toBeDefined();
    expect(usdcToken?.symbol).toBe("USDC");
    expect(usdcToken?.contractId).toBe(USDC_CONTRACT_ID);

    const xlmToken = tokenForContract(NATIVE_ASSET_CONTRACT_ID);
    expect(xlmToken).toBeDefined();
    expect(xlmToken?.symbol).toBe("XLM");
    expect(xlmToken?.contractId).toBe(NATIVE_ASSET_CONTRACT_ID);
  });

  it("tokenForContract returns undefined for unknown contract IDs", () => {
    expect(tokenForContract("CUNKNOWN_NONEXISTENT_CONTRACT_ID_1234567890")).toBeUndefined();
    expect(tokenForContract("")).toBeUndefined();
    expect(tokenForContract("INVALID_ID")).toBeUndefined();
  });
});

describe("Stellar config dynamic env overrides", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
    delete process.env.NEXT_PUBLIC_USDC_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID;
    vi.resetModules();
  });

  it("overriding NEXT_PUBLIC_USDC_CONTRACT_ID updates the USDC registry", async () => {
    const customUsdc = "CCUSTOM_USDC_CONTRACT_ID_999999999999999999999";
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", customUsdc);
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");
    expect(config.USDC_CONTRACT_ID).toBe(customUsdc);
    expect(config.SUPPORTED_TOKENS[0].contractId).toBe(customUsdc);
    expect(config.defaultToken().contractId).toBe(customUsdc);
    expect(config.tokenForContract(customUsdc)?.symbol).toBe("USDC");
  });

  it("overriding NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID updates the XLM registry", async () => {
    const customNative = "CCUSTOM_NATIVE_XLM_CONTRACT_ID_888888888888888";
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", customNative);
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");
    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(customNative);
    expect(config.SUPPORTED_TOKENS[1].contractId).toBe(customNative);
    expect(config.tokenForContract(customNative)?.symbol).toBe("XLM");
    expect(config.tokenForContract(customNative)?.isNative).toBe(true);
  });

  it("switches to mainnet defaults when NEXT_PUBLIC_STELLAR_NETWORK is mainnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
    delete process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID;
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");
    expect(config.NETWORK).toBe("mainnet");
    expect(config.IS_MAINNET).toBe(true);
    expect(config.RPC_URL).toBe("https://soroban-rpc.stellar.org");
    expect(config.NETWORK_PASSPHRASE).toBe(Networks.PUBLIC);
    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(config.MAINNET_NATIVE_ASSET_CONTRACT_ID);
  });

  it("reverts to testnet defaults when NEXT_PUBLIC_STELLAR_NETWORK is testnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
    delete process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID;
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");
    expect(config.NETWORK).toBe("testnet");
    expect(config.IS_MAINNET).toBe(false);
    expect(config.RPC_URL).toBe("https://soroban-testnet.stellar.org");
    expect(config.NETWORK_PASSPHRASE).toBe(Networks.TESTNET);
    expect(config.NATIVE_ASSET_CONTRACT_ID).toBe(config.TESTNET_NATIVE_ASSET_CONTRACT_ID);
  });

  it("respects custom RPC_URL, NETWORK_PASSPHRASE, and CHECKOUT_CONTRACT_ID overrides", async () => {
    const customRpc = "https://custom-rpc.example.com";
    const customPassphrase = "Custom Network Passphrase ; September 2026";
    const customCheckout = "CCHECKOUT_CONTRACT_CUSTOM_123456789";

    vi.stubEnv("NEXT_PUBLIC_STELLAR_RPC_URL", customRpc);
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE", customPassphrase);
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", customCheckout);
    vi.resetModules();

    const config = await import("../../../lib/stellar/config");
    expect(config.RPC_URL).toBe(customRpc);
    expect(config.NETWORK_PASSPHRASE).toBe(customPassphrase);
    expect(config.CHECKOUT_CONTRACT_ID).toBe(customCheckout);
  });
});
