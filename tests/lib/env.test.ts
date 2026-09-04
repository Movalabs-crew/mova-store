import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isAdminEmail, isDevelopment, isProduction, loadStellarConfig } from "../../lib/env";

describe("isAdminEmail", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for admin emails", () => {
    expect(isAdminEmail("admin@test.com")).toBe(true);
    expect(isAdminEmail("admin2@test.com")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isAdminEmail("ADMIN@TEST.COM")).toBe(true);
    expect(isAdminEmail("Admin@Test.Com")).toBe(true);
  });

  it("returns false for non-admin emails", () => {
    expect(isAdminEmail("user@test.com")).toBe(false);
    expect(isAdminEmail("notadmin@test.com")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("handles empty admin list", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });
});

describe("isDevelopment", () => {
  it("returns true in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevelopment()).toBe(true);
  });

  it("returns false in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevelopment()).toBe(false);
  });
});

describe("isProduction", () => {
  it("returns true in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(true);
  });

  it("returns false in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isProduction()).toBe(false);
  });
});

describe("loadStellarConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the canonical SDF mainnet RPC endpoint when network is mainnet and RPC is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    const config = loadStellarConfig();
    expect(config.network).toBe("mainnet");
    expect(config.rpcUrl).toBe("https://soroban-rpc.stellar.org");
  });

  it("resolves the canonical SDF testnet RPC endpoint when network is testnet and RPC is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    delete process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    const config = loadStellarConfig();
    expect(config.network).toBe("testnet");
    expect(config.rpcUrl).toBe("https://soroban-testnet.stellar.org");
  });

  it("uses custom RPC endpoint when NEXT_PUBLIC_STELLAR_RPC_URL is provided", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_RPC_URL", "https://custom-soroban-rpc.example.com");
    const config = loadStellarConfig();
    expect(config.rpcUrl).toBe("https://custom-soroban-rpc.example.com");
  });
});
