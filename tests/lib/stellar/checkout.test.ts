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

  const readiness = {
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
  };

  // The decoded receipt has to describe the same payment the request did, or
  // `payWithStellar` (correctly) refuses to report success. `orderId` is the
  // hash of the submitted order id, `token` is the contract actually paid, and
  // `amount` is the raw i128 the chain recorded.
  const matchingReceipt = async (
    orderId: string,
    overrides: Record<string, unknown> = {}
  ) => ({
    txHash: "abc123mocktxhash",
    ledger: 456,
    amount: "10000000",
    buyer: dummyPublicKey,
    orderId: await orderIdHash(orderId),
    token: configMod.defaultToken().contractId,
    ...overrides,
  });

  const mockSuccessfulFlow = async (orderId: string) => {
    const tx = buildDummyTx();
    const xdrString = tx.toXDR();
    vi.spyOn(freighterMod, "ensureNetwork").mockResolvedValue();
    vi.spyOn(accountMod, "assertPaymentReady").mockResolvedValue(readiness);
    vi.spyOn(simulateMod, "prepareAndReport").mockResolvedValue({
      tx,
      report: { ok: true, minResourceFee: 1200n, instructions: 5000 },
    });
    vi.spyOn(simulateMod, "budgetFee").mockResolvedValue("51200");
    vi.spyOn(freighterMod, "signWithFreighter").mockResolvedValue(xdrString);
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
      status: "PENDING",
      hash: "abc123mocktxhash",
    } as never);
    vi.spyOn(eventsMod, "waitForTransaction").mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      ledger: 456,
      txHash: "abc123mocktxhash",
    } as never);
    // `decodePaymentEvent` is synchronous: it decodes the already-fetched
    // transaction result rather than awaiting anything itself.
    vi.spyOn(eventsMod, "decodePaymentEvent").mockReturnValue(
      (await matchingReceipt(orderId)) as never
    );
  };

  it("writes nothing to the console for a production payment without onStatus (#718)", async () => {
    const previous = process.env.NEXT_PUBLIC_STELLAR_DEBUG;
    delete process.env.NEXT_PUBLIC_STELLAR_DEBUG;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await mockSuccessfulFlow("ORD-NO-LOGS");

    await payWithStellar({
      amountUsd: 1,
      orderId: "ORD-NO-LOGS",
      publicKey: dummyPublicKey,
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_STELLAR_DEBUG;
    } else {
      process.env.NEXT_PUBLIC_STELLAR_DEBUG = previous;
    }
    vi.restoreAllMocks();
  });

  it("only emits [stellar] progress logs when NEXT_PUBLIC_STELLAR_DEBUG is enabled (#718)", async () => {
    const previous = process.env.NEXT_PUBLIC_STELLAR_DEBUG;
    process.env.NEXT_PUBLIC_STELLAR_DEBUG = "true";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await mockSuccessfulFlow("ORD-DEBUG-LOGS");

    await payWithStellar({
      amountUsd: 1,
      orderId: "ORD-DEBUG-LOGS",
      publicKey: dummyPublicKey,
    });

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.some(([msg]) => String(msg).startsWith("[stellar]"))).toBe(true);

    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_STELLAR_DEBUG;
    } else {
      process.env.NEXT_PUBLIC_STELLAR_DEBUG = previous;
    }
    vi.restoreAllMocks();
  });

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
    const decodeSpy = vi
      .spyOn(eventsMod, "decodePaymentEvent")
      .mockReturnValue((await matchingReceipt("ORD-999")) as never);

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
      payWithStellar( {
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

  it("throws TX_TRY_AGAIN_LATER and never polls an undefined hash when submission returns TRY_AGAIN_LATER", async () => {
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
    const sendSpy = vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
      status: "TRY_AGAIN_LATER",
      hash: undefined,
    } as never);
    const waitSpy = vi.spyOn(eventsMod, "waitForTransaction");

    await expect(
      payWithStellar({
        amountUsd: 3,
        orderId: "ORD-TRY-AGAIN",
        publicKey: dummyPublicKey,
      })
    ).rejects.toMatchObject({
      code: "TX_TRY_AGAIN_LATER",
      message: expect.stringContaining("retry"),
    });

    expect(waitSpy).not.toHaveBeenCalled();

    sendSpy.mockRestore();
    waitSpy.mockRestore();
    vi.restoreAllMocks();
  });

  // --- Issue #712: confirm the payment from the chain, not from the request ---

  const OTHER_KEY = "GCKFBEIYTKP6RJKF6LO5C6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6Q6";
  const OTHER_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

  /**
   * Runs the full pay flow with a decoded receipt derived from `orderId`.
   * `overrides === null` simulates a successful transaction that carried no
   * payment event at all.
   */
  async function mockFlowWithReceipt(
    orderId: string,
    overrides: Record<string, unknown> | null
  ) {
    const tx = buildDummyTx();
    const xdrString = tx.toXDR();
    vi.spyOn(freighterMod, "ensureNetwork").mockResolvedValue();
    vi.spyOn(accountMod, "assertPaymentReady").mockResolvedValue(readiness);
    vi.spyOn(simulateMod, "prepareAndReport").mockResolvedValue({
      tx,
      report: { ok: true, minResourceFee: 1200n, instructions: 5000 },
    });
    vi.spyOn(simulateMod, "budgetFee").mockResolvedValue("51200");
    vi.spyOn(freighterMod, "signWithFreighter").mockResolvedValue(xdrString);
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
      status: "PENDING",
      hash: "abc123mocktxhash",
    } as never);
    vi.spyOn(eventsMod, "waitForTransaction").mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      ledger: 456,
      txHash: "abc123mocktxhash",
    } as never);
    vi.spyOn(eventsMod, "decodePaymentEvent").mockReturnValue(
      (overrides === null ? null : await matchingReceipt(orderId, overrides)) as never
    );
  }

  it("confirms the payment when the decoded receipt matches the request", async () => {
    await mockFlowWithReceipt("ORD-MATCH", {});

    const result = await payWithStellar({
      amountUsd: 1,
      orderId: "ORD-MATCH",
      publicKey: dummyPublicKey,
    });

    // The reported figures come from the receipt, which is the chain's record.
    expect(result.receipt.orderId).toBe(await orderIdHash("ORD-MATCH"));
    expect(result.receipt.amount).toBe("10000000");
    expect(result.amountRaw).toBe(10_000_000n);
    expect(result.tokenAmount).toBe(1);
    expect(result.amountUsd).toBe(1);
  });

  it("throws PAYMENT_NOT_CONFIRMED when no payment event was decoded", async () => {
    await mockFlowWithReceipt("ORD-NO-EVENT", null);

    await expect(
      payWithStellar({
        amountUsd: 1,
        orderId: "ORD-NO-EVENT",
        publicKey: dummyPublicKey,
      })
    ).rejects.toMatchObject({
      code: "PAYMENT_NOT_CONFIRMED",
      message: expect.stringContaining("no payment event"),
    });
  });

  it.each([
    ["amount", { amount: "99999999" }],
    ["order id", { orderId: "ab".repeat(32) }],
    ["buyer", { buyer: OTHER_KEY }],
    ["token", { token: OTHER_TOKEN }],
  ])(
    "throws PAYMENT_MISMATCH naming the %s when the receipt disagrees with the request",
    async (field, override) => {
      await mockFlowWithReceipt("ORD-MISMATCH", override as Record<string, unknown>);

      await expect(
        payWithStellar({
          amountUsd: 1,
          orderId: "ORD-MISMATCH",
          publicKey: dummyPublicKey,
        })
      ).rejects.toMatchObject({
        code: "PAYMENT_MISMATCH",
        message: expect.stringContaining(field as string),
      });
    }
  );

  it("reports the escrowed amount from the receipt, not the quoted amount", async () => {
    const xlm = configMod.SUPPORTED_TOKENS[1];
    // The quote is $12 at 0.12 USD/XLM, but this buyer pays 40 XLM and the
    // receipt confirms 40 XLM (400_000_000 raw) on chain.
    await mockFlowWithReceipt("ORD-ESCROWED", {
      amount: "400000000",
      token: xlm.contractId,
    });

    const result = await payWithStellar({
      amountUsd: 12,
      tokenAmount: 40,
      xlmUsdPrice: 0.12,
      token: xlm,
      orderId: "ORD-ESCROWED",
      publicKey: dummyPublicKey,
    });

    // Every reported figure is derived from the receipt, so `amountUsd` is the
    // escrowed 40 XLM valued at the quoted rate - not the $12 that was asked for.
    expect(result.receipt.amount).toBe("400000000");
    expect(result.amountRaw).toBe(400_000_000n);
    expect(result.tokenAmount).toBe(40);
    expect(result.amountUsd).toBeCloseTo(4.8);
  });
});
