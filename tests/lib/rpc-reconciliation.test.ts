/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Mainnet RPC Defaults Reconciliation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("resolves the canonical SDF mainnet RPC endpoint in lib/env when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    const { loadStellarConfig } = await import("../../lib/env");
    const config = loadStellarConfig();
    expect(config.rpcUrl).toBe("https://soroban-rpc.stellar.org");
  });

  it("resolves the canonical SDF mainnet RPC endpoint in lib/stellar/config when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    const { RPC_URL, IS_MAINNET } = await import("../../lib/stellar/config");
    expect(IS_MAINNET).toBe(true);
    expect(RPC_URL).toBe("https://soroban-rpc.stellar.org");
  });

  it("ensures lib/env and lib/stellar/config resolve the exact same RPC URL on mainnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    const { loadStellarConfig } = await import("../../lib/env");
    const { RPC_URL } = await import("../../lib/stellar/config");
    expect(loadStellarConfig().rpcUrl).toBe(RPC_URL);
    expect(loadStellarConfig().rpcUrl).toBe("https://soroban-rpc.stellar.org");
  });

  it("ensures lib/env and lib/stellar/config resolve the exact same RPC URL on testnet", async () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    const { loadStellarConfig } = await import("../../lib/env");
    const { RPC_URL } = await import("../../lib/stellar/config");
    expect(loadStellarConfig().rpcUrl).toBe(RPC_URL);
    expect(loadStellarConfig().rpcUrl).toBe("https://soroban-testnet.stellar.org");
  });

  it("honors custom NEXT_PUBLIC_STELLAR_RPC_URL across both modules", async () => {
    const customEndpoint = "https://custom-soroban-rpc.example.com";
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_RPC_URL", customEndpoint);
    const { loadStellarConfig } = await import("../../lib/env");
    const { RPC_URL } = await import("../../lib/stellar/config");
    expect(loadStellarConfig().rpcUrl).toBe(customEndpoint);
    expect(RPC_URL).toBe(customEndpoint);
  });

  it("verifies MAINNET_DEPLOYMENT.md documents the canonical mainnet endpoint", () => {
    const deploymentDocPath = path.resolve(__dirname, "../../docs/MAINNET_DEPLOYMENT.md");
    const content = fs.readFileSync(deploymentDocPath, "utf-8");
    expect(content).toContain("NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-rpc.stellar.org");
    expect(content).not.toContain("gateway.fm");
  });
});
