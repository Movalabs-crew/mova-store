import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("lib/stellar/config — default behavior", () => {
  it("defaultToken returns USDC as the first supported token", { timeout: 15000 }, async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.defaultToken()).toBe(mod.SUPPORTED_TOKENS[0]);
    expect(mod.defaultToken().symbol).toBe("USDC");
  });

  it("tokenForContract resolves known contract IDs", async () => {
    const mod = await import("../../../lib/stellar/config");
    const usdc = mod.tokenForContract(mod.SUPPORTED_TOKENS[0].contractId);
    expect(usdc).toBeDefined();
    expect(usdc?.symbol).toBe("USDC");

    const xlm = mod.tokenForContract(mod.SUPPORTED_TOKENS[1].contractId);
    expect(xlm).toBeDefined();
    expect(xlm?.symbol).toBe("XLM");
  });

  it("tokenForContract returns undefined for unknown contract id", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(
      mod.tokenForContract("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")
    ).toBeUndefined();
  });

  it("XLM entry is marked as native", async () => {
    const mod = await import("../../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.isNative).toBe(true);
  });

  it("USDC and XLM both declare 7 decimals", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.SUPPORTED_TOKENS[0].decimals).toBe(7);
    expect(mod.SUPPORTED_TOKENS[1].decimals).toBe(7);
  });
});

describe("lib/stellar/config — mainnet resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("selects the mainnet RPC URL", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.IS_MAINNET).toBe(true);
    // The mainnet endpoint is https://soroban-rpc.stellar.org, which does not
    // contain the word "mainnet" — asserting that substring tests the hostname's
    // spelling rather than the thing we care about. Pin the endpoint and assert it
    // is not the testnet one.
    expect(mod.RPC_URL).toBe("https://soroban-rpc.stellar.org");
    expect(mod.RPC_URL).not.toContain("testnet");
  });

  it("selects the mainnet network passphrase", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.NETWORK_PASSPHRASE).toBe("Public Global Stellar Network ; September 2015");
    expect(mod.NETWORK_PASSPHRASE).not.toContain("Test SDF Network");
  });

  it("resolves the mainnet native asset contract", async () => {
    const mod = await import("../../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.isNative).toBe(true);
    expect(xlm!.contractId).toBe(mod.NATIVE_ASSET_CONTRACT_ID);
    expect(xlm!.contractId).not.toBe("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
  });

  it("constructs SUPPORTED_TOKENS with USDC first and XLM native", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.SUPPORTED_TOKENS).toHaveLength(2);
    expect(mod.SUPPORTED_TOKENS[0].symbol).toBe("USDC");
    // `isNative` is only set on native assets (it means "needs no trustline"),
    // so a non-native token omits it rather than declaring false.
    expect(mod.SUPPORTED_TOKENS[0].isNative).toBeFalsy();
    expect(mod.SUPPORTED_TOKENS[1].symbol).toBe("XLM");
    expect(mod.SUPPORTED_TOKENS[1].isNative).toBe(true);
    expect(mod.defaultToken()).toBe(mod.SUPPORTED_TOKENS[0]);
  });

  it("regression #524: mainnet USDC resolves to a non-empty contract id", async () => {
    const mod = await import("../../../lib/stellar/config");
    const usdc = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "USDC");
    expect(usdc).toBeDefined();
    expect(usdc!.contractId).toBeTruthy();
    expect(usdc!.contractId.length).toBeGreaterThan(0);
    expect(mod.defaultToken().contractId).toBe(usdc!.contractId);
  });
});

describe("lib/stellar/config — testnet resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("selects the testnet RPC URL", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.IS_MAINNET).toBe(false);
    expect(mod.RPC_URL).toContain("testnet");
    expect(mod.RPC_URL).not.toContain("mainnet");
  });

  it("selects the testnet network passphrase", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.NETWORK_PASSPHRASE).toBe("Test SDF Network ; September 2015");
    expect(mod.NETWORK_PASSPHRASE).not.toContain("Public Global Stellar Network");
  });

  it("resolves the testnet native asset contract", async () => {
    const mod = await import("../../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.isNative).toBe(true);
    expect(xlm!.contractId).toBe(mod.NATIVE_ASSET_CONTRACT_ID);
  });

  it("constructs SUPPORTED_TOKENS with USDC first and XLM native", async () => {
    const mod = await import("../../../lib/stellar/config");
    expect(mod.SUPPORTED_TOKENS).toHaveLength(2);
    expect(mod.SUPPORTED_TOKENS[0].symbol).toBe("USDC");
    expect(mod.SUPPORTED_TOKENS[1].symbol).toBe("XLM");
    expect(mod.SUPPORTED_TOKENS[1].isNative).toBe(true);
    expect(mod.defaultToken()).toBe(mod.SUPPORTED_TOKENS[0]);
  });
});

describe("lib/stellar/config — wrong-network fallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it(
    "mainnet and testnet resolve to distinct RPC URLs and passphrases",
    { timeout: 20000 },
    async () => {
      vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
      const mainnet = await import("../../../lib/stellar/config");
      const mainnetRpc = mainnet.RPC_URL;
      const mainnetPassphrase = mainnet.NETWORK_PASSPHRASE;

      vi.resetModules();
      vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
      const testnet = await import("../../../lib/stellar/config");

      expect(testnet.RPC_URL).not.toBe(mainnetRpc);
      expect(testnet.NETWORK_PASSPHRASE).not.toBe(mainnetPassphrase);
      expect(testnet.IS_MAINNET).not.toBe(mainnet.IS_MAINNET);
    }
  );

  it("a mainnet build never resolves to testnet values", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    const mod = await import("../../../lib/stellar/config");
    expect(mod.RPC_URL).not.toContain("testnet");
    expect(mod.NETWORK_PASSPHRASE).not.toContain("Test SDF Network");
  });
});

describe("lib/stellar/config — env overrides", () => {
  // SUPPORTED_TOKENS is derived from the environment at module load, so each
  // case has to drop the cached module before importing it — otherwise the
  // import returns the instance a previous test already evaluated and the
  // stubEnv call has no effect.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("overriding NEXT_PUBLIC_USDC_CONTRACT_ID changes defaultToken symbol", async () => {
    const customUsdc = "CBBVKU2UJ5GV6VKTIRBV6MJSGNPVQWCYLBMFQAAAAAAAAAAAAAAABO5V";
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", customUsdc);
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    const mod = await import("../../../lib/stellar/config");
    const defaultTok = mod.defaultToken();
    expect(defaultTok.contractId).toBe(customUsdc);
    expect(defaultTok.symbol).toBe("USDC");
  });

  it("overriding NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID changes XLM contract id", async () => {
    const customNative = "CBBVKU2UJ5GV6TSBKREVMRK7GQ2TMX2YLBMFQWCYAAAAAAAAAAAABWDF";
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID", customNative);
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    const mod = await import("../../../lib/stellar/config");
    const xlm = mod.SUPPORTED_TOKENS.find((t) => t.symbol === "XLM");
    expect(xlm).toBeDefined();
    expect(xlm!.contractId).toBe(customNative);
  });

  it("env override does not affect already-imported modules", async () => {
    const mod1 = await import("../../../lib/stellar/config");
    const originalUsdc = mod1.defaultToken().contractId;

    const anotherId = "CBAU4T2UJBCVEX2DKVJVIT2NL5EUIX2YLBMFQAAAAAAAAAAAAAAAAAT5";
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", anotherId);
    vi.resetModules();
    const mod2 = await import("../../../lib/stellar/config");
    expect(mod2.defaultToken().contractId).toBe(anotherId);
    expect(mod2.defaultToken().contractId).not.toBe(originalUsdc);
  });

  it("throws when NEXT_PUBLIC_USDC_CONTRACT_ID is unset on mainnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "");
    delete process.env.NEXT_PUBLIC_USDC_CONTRACT_ID;

    await expect(import("../../../lib/stellar/config")).rejects.toThrow("NEXT_PUBLIC_USDC_CONTRACT_ID is required on mainnet");
  });

  it("resolves USDC issuer dynamically per-network", async () => {
    // 1. Testnet default
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    const modTest = await import("../../../lib/stellar/config");
    expect(modTest.SUPPORTED_TOKENS[0].assetIssuer).toBe("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

    vi.resetModules();

    // 2. Mainnet (with custom contract to avoid the throw)
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", "CUSTOM_MAINNET_USDC");
    const modMain = await import("../../../lib/stellar/config");
    expect(modMain.SUPPORTED_TOKENS[0].assetIssuer).toBe("GA5ZSEJYB37JRC52ZMRGKEZ2O6TKTHTEBZ5MM2KHYL3Q6XIXT6E7BW5U");

    vi.resetModules();

    // 3. Environment override
    vi.stubEnv("NEXT_PUBLIC_USDC_ISSUER", "CUSTOM_ISSUER");
    const modCustom = await import("../../../lib/stellar/config");
    expect(modCustom.SUPPORTED_TOKENS[0].assetIssuer).toBe("CUSTOM_ISSUER");
  });
});
