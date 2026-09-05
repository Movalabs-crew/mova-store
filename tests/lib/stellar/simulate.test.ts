import { describe, it, expect, vi } from "vitest";
import { Account, BASE_FEE, Keypair, Operation, Transaction, TransactionBuilder, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import {
  buildInvocationTransaction,
  simulateContractRead,
  readTokenBalance,
  readTokenDecimals,
  preflight,
  prepareAndReport,
  recommendedInclusionFee,
  budgetFee,
} from "../../../lib/stellar/simulate";
import { FEE_BUFFER_STROOPS } from "../../../lib/stellar/config";
import { i128ToScVal } from "../../../lib/stellar/scval";

describe("buildInvocationTransaction", () => {
  const dummyAccount = new Account("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", "100");
  const contractId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

  it("constructs a transaction with invokeContractFunction operation", () => {
    const args = [xdr.ScVal.scvSymbol("hello")];
    const tx = buildInvocationTransaction(dummyAccount, contractId, "test_fn", args, "200");

    expect(tx).toBeInstanceOf(Transaction);
    expect(tx.fee).toBe("200");
    expect(tx.operations).toHaveLength(1);
    const op = tx.operations[0];
    expect(op.type).toBe("invokeHostFunction");
  });
});

describe("simulateContractRead", () => {
  const contractId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

  it("returns retval when simulation succeeds", async () => {
    const expectedVal = xdr.ScVal.scvU32(42);
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        result: { retval: expectedVal },
      }),
    } as unknown as rpc.Server;

    const res = await simulateContractRead(mockServer, contractId, "get_val", []);
    expect(res).toBe(expectedVal);
  });

  it("returns null when simulation fails with simulation error", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        error: "HostError: Error(Contract, #1)",
      }),
    } as unknown as rpc.Server;

    const res = await simulateContractRead(mockServer, contractId, "get_val", []);
    expect(res).toBeNull();
  });

  it("returns null when retval is undefined in simulation result", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        result: {},
      }),
    } as unknown as rpc.Server;

    const res = await simulateContractRead(mockServer, contractId, "get_val", []);
    expect(res).toBeNull();
  });
});

describe("readTokenBalance", () => {
  const contractId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const user = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("returns balance as bigint when simulateContractRead succeeds", async () => {
    const val = i128ToScVal(55000000n);
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        result: { retval: val },
      }),
    } as unknown as rpc.Server;

    const balance = await readTokenBalance(mockServer, contractId, user);
    expect(balance).toBe(55000000n);
  });

  it("returns 0n when simulateContractRead returns null", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        error: "HostError",
      }),
    } as unknown as rpc.Server;

    const balance = await readTokenBalance(mockServer, contractId, user);
    expect(balance).toBe(0n);
  });
});

describe("readTokenDecimals", () => {
  const contractId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

  it("returns token decimals when query succeeds", async () => {
    const val = xdr.ScVal.scvU32(6);
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        result: { retval: val },
      }),
    } as unknown as rpc.Server;

    const decimals = await readTokenDecimals(mockServer, contractId);
    expect(decimals).toBe(6);
  });

  it("falls back to 7 when query fails", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        error: "HostError",
      }),
    } as unknown as rpc.Server;

    const decimals = await readTokenDecimals(mockServer, contractId);
    expect(decimals).toBe(7);
  });
});

describe("preflight", () => {
  const dummyAccount = new Account("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", "100");
  const contractId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const tx = buildInvocationTransaction(dummyAccount, contractId, "test", []);

  it("returns ok: true with resources and fee on successful simulation", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        latestLedger: 500,
        minResourceFee: "1500",
        result: {
          auth: ["auth1", "auth2"],
          retval: xdr.ScVal.scvU32(1),
        },
        transactionData: {
          build: () => ({
            resources: () => ({
              instructions: () => 25000,
              diskReadBytes: () => 1024,
              writeBytes: () => 2048,
            }),
          }),
        },
      }),
    } as unknown as rpc.Server;

    const report = await preflight(mockServer, tx);
    expect(report.ok).toBe(true);
    expect(report.latestLedger).toBe(500);
    expect(report.instructions).toBe(25000);
    expect(report.diskReadBytes).toBe(1024);
    expect(report.writeBytes).toBe(2048);
    expect(report.minResourceFee).toBe(1500n);
    expect(report.authCount).toBe(2);
    expect(report.retval).toBeDefined();
  });

  it("extracts CONTRACT_ error code when simulation fails with ContractError", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        latestLedger: 501,
        error: "ContractError(123)",
        events: [
          {
            inSuccessfulContractCall: () => true,
            event: () => "event detail",
          },
        ],
      }),
    } as unknown as rpc.Server;

    const report = await preflight(mockServer, tx);
    expect(report.ok).toBe(false);
    expect(report.error?.code).toBe("CONTRACT_123");
    expect(report.error?.diagnostics).toEqual(["event detail"]);
  });

  it("extracts HOST_ERROR when simulation fails with HostError", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        latestLedger: 502,
        error: "HostError: Error(Value, InvalidInput)",
      }),
    } as unknown as rpc.Server;

    const report = await preflight(mockServer, tx);
    expect(report.ok).toBe(false);
    expect(report.error?.code).toBe("HOST_ERROR");
  });

  it("extracts INVALID_WASM when simulation error contains wasm Invalid", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        latestLedger: 503,
        error: "wasm Invalid byte sequence",
      }),
    } as unknown as rpc.Server;

    const report = await preflight(mockServer, tx);
    expect(report.ok).toBe(false);
    expect(report.error?.code).toBe("INVALID_WASM");
  });
});

describe("prepareAndReport", () => {
  const dummyAccount = new Account("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", "100");
  const contractId = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const tx = buildInvocationTransaction(dummyAccount, contractId, "test", []);

  it("returns prepared tx and report when preflight succeeds", async () => {
    const preparedTx = buildInvocationTransaction(dummyAccount, contractId, "test", [], "999");
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        latestLedger: 600,
        minResourceFee: "1000",
        transactionData: {
          build: () => ({
            resources: () => ({
              instructions: () => 1000,
              diskReadBytes: () => 100,
              writeBytes: () => 200,
            }),
          }),
        },
      }),
      prepareTransaction: vi.fn().mockResolvedValue(preparedTx),
    } as unknown as rpc.Server;

    const res = await prepareAndReport(mockServer, tx);
    expect(res.report.ok).toBe(true);
    expect(res.tx).toBe(preparedTx);
    expect(mockServer.prepareTransaction).toHaveBeenCalledWith(tx);
  });

  it("returns original tx and failed report when preflight fails", async () => {
    const mockServer = {
      simulateTransaction: vi.fn().mockResolvedValue({
        error: "Simulation failed",
      }),
      prepareTransaction: vi.fn(),
    } as unknown as rpc.Server;

    const res = await prepareAndReport(mockServer, tx);
    expect(res.report.ok).toBe(false);
    expect(res.tx).toBe(tx);
    expect(mockServer.prepareTransaction).not.toHaveBeenCalled();
  });
});

describe("recommendedInclusionFee and budgetFee", () => {
  it("returns fee from fee stats when available", async () => {
    const mockServer = {
      getFeeStats: vi.fn().mockResolvedValue({
        sorobanInclusionFee: { max: "5000" },
      }),
    } as unknown as rpc.Server;

    const fee = await recommendedInclusionFee(mockServer);
    expect(fee).toBe(5000n);
  });

  it("falls back to BASE_FEE when getFeeStats throws", async () => {
    const mockServer = {
      getFeeStats: vi.fn().mockRejectedValue(new Error("Stats unavailable")),
    } as unknown as rpc.Server;

    const fee = await recommendedInclusionFee(mockServer);
    expect(fee).toBe(BigInt(BASE_FEE));
  });

  it("calculates budget fee with safety buffer", async () => {
    const mockServer = {
      getFeeStats: vi.fn().mockResolvedValue({
        sorobanInclusionFee: { max: "3000" },
      }),
    } as unknown as rpc.Server;

    const report = {
      ok: true,
      minResourceFee: 10000n,
    };

    const fee = await budgetFee(mockServer, report);
    // max(3000, 10000) + 50000 (FEE_BUFFER_STROOPS) = 60000
    expect(fee).toBe((10000n + FEE_BUFFER_STROOPS).toString());
  });
});
