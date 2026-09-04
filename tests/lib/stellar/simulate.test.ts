import { describe, it, expect } from "vitest";
import { Account, Keypair, BASE_FEE } from "@stellar/stellar-sdk";

import {
  recommendedInclusionFee,
  budgetFee,
  buildInvocationTransaction,
} from "../../../lib/stellar/simulate";
import { FEE_BUFFER_STROOPS, NETWORK_PASSPHRASE } from "../../../lib/stellar/config";

// A valid testnet C-strkey (the USDC testnet contract) for operation building.
const CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

// fromPublicKey only decodes the strkey (no ed25519 key derivation, which
// chokes on vitest's module realm); the builder only needs the source account.
const TEST_G = "GB3KJPLFUYN5VL6R3GU3EGCGVCKFDSD7BEDX42HWG5BWFKB3KQGJJRMA";
const makeAccount = () => new Account(Keypair.fromPublicKey(TEST_G).publicKey(), "0");

describe("recommendedInclusionFee (#14)", () => {
  it("returns BigInt(max) when the fee stats carry a numeric max", async () => {
    const server = {
      getFeeStats: async () => ({ sorobanInclusionFee: { max: "12345" } }),
    };
    expect(await recommendedInclusionFee(server as never)).toBe(BigInt(12345));
  });

  it("falls back to BASE_FEE when getFeeStats throws", async () => {
    const server = {
      getFeeStats: async () => {
        throw new Error("rpc unreachable");
      },
    };
    expect(await recommendedInclusionFee(server as never)).toBe(BigInt(BASE_FEE));
  });

  it("falls back to BASE_FEE when max is non-numeric", async () => {
    const server = {
      getFeeStats: async () => ({ sorobanInclusionFee: { max: "12a45" } }),
    };
    expect(await recommendedInclusionFee(server as never)).toBe(BigInt(BASE_FEE));
  });

  it("falls back to BASE_FEE when the stats have no inclusion fee", async () => {
    const server = { getFeeStats: async () => ({}) };
    expect(await recommendedInclusionFee(server as never)).toBe(BigInt(BASE_FEE));
  });
});

describe("budgetFee (#14)", () => {
  const statsServer = {
    getFeeStats: async () => ({ sorobanInclusionFee: { max: "1000" } }),
  };

  it("uses inclusion fee + buffer when it is the higher fee", async () => {
    const report = { ok: true, minResourceFee: BigInt(500) };
    const expected = (BigInt(1000) + FEE_BUFFER_STROOPS).toString();
    expect(await budgetFee(statsServer as never, report)).toBe(expected);
  });

  it("uses minResourceFee + buffer when it is the higher fee", async () => {
    const report = { ok: true, minResourceFee: BigInt(2000) };
    const expected = (BigInt(2000) + FEE_BUFFER_STROOPS).toString();
    expect(await budgetFee(statsServer as never, report)).toBe(expected);
  });

  it("ignores minResourceFee when the simulation report is not ok", async () => {
    const report = { ok: false, minResourceFee: BigInt(999999) };
    const expected = (BigInt(1000) + FEE_BUFFER_STROOPS).toString();
    expect(await budgetFee(statsServer as never, report)).toBe(expected);
  });
});

describe("buildInvocationTransaction (#14)", () => {
  it("defaults to BASE_FEE and the configured network passphrase", () => {
    const tx = buildInvocationTransaction(makeAccount(), CONTRACT_ID, "pay", []);
    expect(tx.fee).toBe(String(BASE_FEE));
    expect(tx.networkPassphrase).toBe(NETWORK_PASSPHRASE);
    expect(tx.source).toBe(TEST_G);
    expect(tx.operations.length).toBe(1);
  });

  it("honours an explicit fee override", () => {
    const tx = buildInvocationTransaction(makeAccount(), CONTRACT_ID, "pay", [], "250");
    expect(tx.fee).toBe("250");
  });
});
