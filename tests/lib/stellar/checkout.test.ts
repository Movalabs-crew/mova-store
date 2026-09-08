import { describe, expect, it, vi } from "vitest";
import { Account, Keypair, TransactionBuilder, Networks, rpc } from "@stellar/stellar-sdk";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

import { WalletError } from "../../../lib/stellar/freighter";
import * as freighterMod from "../../../lib/stellar/freighter";
import * as accountMod from "../../../lib/stellar/account";
import * as simulateMod from "../../../lib/stellar/simulate";
import * as eventsMod from "../../../lib/stellar/events";
import * as configMod from "../../../lib/stellar/config";
import { usdToRawUnits, orderIdHash, payWithStellar } from "../../../lib/stellar/checkout";

describe("usdToRawUnits", () => {
  it("converts a typical USD price to 7-decimal raw units", () => {
    expect(usdToRawUnits(12.34)).toBe(123_400_000n);
  });

  it("is floating-point safe for prices like 0.29", () => {
    expect(usdToRawUnits(0.29)).toBe(2_900_000n);
  });

  it("handles the smallest unit and whole dollars", () => {
    expect(usdToRawUnits(0.0000001)).toBe(1n);
    expect(usdToRawUnits(1)).toBe(10_000_000n);
  });

  const cases: Array<[string, number]> = [
    ["zero", 0],
    ["negative", -5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ];

  it.each(cases)(
    "throws WalletError with code INVALID_AMOUNT for %s",
    (_label, value) => {
      let caught: unknown;
      try {
        usdToRawUnits(value);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(WalletError);
      expect((caught as WalletError).code).toBe("INVALID_AMOUNT");
    }
  );
});

describe("orderIdHash", () => {
  it("returns a deterministic 64-character hex string", async () => {
    const hash1 = await orderIdHash("ORDER-12345");
    const hash2 = await orderIdHash("ORDER-12345");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("payWithStellar", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const dummyAccount = new Account(dummyPublicKey, "100");

  const buildDummyTx = () => {
    return new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .setTimeout(0)
      .build();
  };

  it("throws CONTRACT_NOT_CONFIGURED if CHECKOUT_CONTRACT_ID is empty", async () => {
    vi.resetModules();
    vi.doMock("../../../lib/stellar/config", async () => {
      const actual = await vi.importActual<typeof import("../../../lib/stellar/config")>("../../../lib/stellar/config");
      return {
        ...actual,
        CHECKOUT_CONTRACT_ID: "",
      };
    });
    const { payWithStellar: pay } = await import("../../../lib/stellar/checkout");
    await expect(
      pay({
        amountUsd: 10,
        orderId: "ORDER-TEST-001",
        publicKey: dummyPublicKey,
      })
    ).rejects.toMatchObject({
      code: "CONTRACT_NOT_CONFIGURED",
    });
    vi.doUnmock("../../../lib/stellar/config");
    vi.resetModules();
  });

  it("executes full successful checkout payment flow", async () => {
    const tx = buildDummyTx();
    const xdrString = tx.toXDR();

    const ensureNetworkSpy = vi.spyOn(freighterMod, "ensureNetwork").mockResolvedValue();
    const assertPaymentReadySpy = vi.spyOn(accountMod, "assertPaymentReady").mockResolvedValue({
      account: dummyAccount,
      funded: true,
      nativeBalanceRaw: 50_000_000n,
      tokenBalanceRaw: 100_000_000n,
      decimals: 7,
      hasTrustline: true,
      trustlineAuthorized: true,
      requiredRaw: 10_000_000n,
      sufficientBalance: true,
      sufficientReserve: true,
      issues: [],
    });
    const prepareSpy = vi.spyOn(simulateMod, "prepareAndReport").mockResolvedValue({
      tx,
      report: {
        ok: true,
        minResourceFee: 1200n,
        instructions: 5000,
      },
    });
    const budgetSpy = vi.spyOn(simulateMod, "budgetFee").mockResolvedValue("51200");
    const signSpy = vi.spyOn(freighterMod, "signWithFreighter").mockResolvedValue(xdrString);
    const sendSpy = vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
      status: "PENDING",
      hash: "abc123mocktxhash",
    } as never);
    const waitSpy = vi.spyOn(eventsMod, "waitForTransaction").mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      ledger: 456,
      txHash: "abc123mocktxhash",
    } as never);
    const decodeSpy = vi.spyOn(eventsMod, "decodePaymentEvent").mockReturnValue({
      txHash: "abc123mocktxhash",
      ledger: 456,
      amount: "10000000",
      buyer: dummyPublicKey,
    });

    const statusUpdates: string[] = [];
    const result = await payWithStellar({
      amountUsd: 1,
      orderId: "ORD-999",
      publicKey: dummyPublicKey,
      onStatus: (s) => statusUpdates.push(s),
    });

    expect(result.hash).toBe("abc123mocktxhash");
    expect(result.status).toBe(rpc.Api.GetTransactionStatus.SUCCESS);
    expect(result.amountUsd).toBe(1);
    expect(result.amountRaw).toBe(10_000_000n);
    expect(result.simulation.minResourceFeeStroops).toBe("1200");
    expect(result.simulation.recommendedInclusionFeeStroops).toBe("51200");
    expect(result.receipt?.buyer).toBe(dummyPublicKey);
    expect(statusUpdates.length).toBeGreaterThan(0);

    ensureNetworkSpy.mockRestore();
    assertPaymentReadySpy.mockRestore();
    prepareSpy.mockRestore();
    budgetSpy.mockRestore();
    signSpy.mockRestore();
    sendSpy.mockRestore();
    waitSpy.mockRestore();
    decodeSpy.mockRestore();
  });

  it("throws TX_SIMULATION_ERROR when simulation report fails", async () => {
    const tx = buildDummyTx();

    vi.spyOn(freighterMod, "ensureNetwork").mockResolvedValue();
    vi.spyOn(accountMod, "assertPaymentReady").mockResolvedValue({
      account: dummyAccount,
      funded: true,
      nativeBalanceRaw: 50_000_000n,
      tokenBalanceRaw: 100_000_000n,
      decimals: 7,
      hasTrustline: true,
      trustlineAuthorized: true,
      requiredRaw: 10_000_000n,
      sufficientBalance: true,
      sufficientReserve: true,
      issues: [],
    });
    vi.spyOn(simulateMod, "prepareAndReport").mockResolvedValue({
      tx,
      report: {
        ok: false,
        error: { message: "HostError contract call trapped" },
      },
    });

    await expect(
      payWithStellar({
        amountUsd: 5,
        orderId: "ORD-FAIL-SIM",
        publicKey: dummyPublicKey,
      })
    ).rejects.toMatchObject({
      code: "TX_SIMULATION_ERROR",
      message: expect.stringContaining("HostError contract call trapped"),
    });

    vi.restoreAllMocks();
  });

  it("throws TX_SEND_ERROR when server rejects transaction submission", async () => {
    const tx = buildDummyTx();
    const xdrString = tx.toXDR();

    vi.spyOn(freighterMod, "ensureNetwork").mockResolvedValue();
    vi.spyOn(accountMod, "assertPaymentReady").mockResolvedValue({
      account: dummyAccount,
      funded: true,
      nativeBalanceRaw: 50_000_000n,
      tokenBalanceRaw: 100_000_000n,
      decimals: 7,
      hasTrustline: true,
      trustlineAuthorized: true,
      requiredRaw: 10_000_000n,
      sufficientBalance: true,
      sufficientReserve: true,
      issues: [],
    });
    vi.spyOn(simulateMod, "prepareAndReport").mockResolvedValue({
      tx,
      report: { ok: true, minResourceFee: 100n },
    });
    vi.spyOn(simulateMod, "budgetFee").mockResolvedValue("50100");
    vi.spyOn(freighterMod, "signWithFreighter").mockResolvedValue(xdrString);
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
      status: "ERROR",
      errorResult: {
        toXDR: () => "mockErrorXdr",
      },
    } as never);

    await expect(
      payWithStellar({
        amountUsd: 2,
        orderId: "ORD-FAIL-SEND",
        publicKey: dummyPublicKey,
      })
    ).rejects.toMatchObject({
      code: "TX_SEND_ERROR",
      message: expect.stringContaining("Transaction rejected"),
    });

    vi.restoreAllMocks();
  });
});
