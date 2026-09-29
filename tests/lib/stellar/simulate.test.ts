import { describe, it, expect, vi } from "vitest";
import { Account, BASE_FEE, Keypair, Operation, StrKey, xdr } from "@stellar/stellar-sdk";

import {
  recommendedInclusionFee,
  budgetFee,
  buildInvocationTransaction,
  simulateContractRead,
  SimulationReport,
} from "../../../lib/stellar/simulate";
import { FEE_BUFFER_STROOPS, NETWORK_PASSHRASE } from "../../../lib/stellar/config";

describe("Simulate Fee Math & Transaction Builder Tests (lib/stellar/simulate.ts)", () => {
  const buyerAddress = "GC6EQI4UAFFFJDECLN37G4EWUJJTMKE3WE55NGIL4JXJXNXICUYKVBQ6";
  const dummyAccount = new Account(buyerAddress, "100");
  const contractId = StrKey.encodeContract(new Uint8Array(32).fill(1));
  const dummyArgs: xdr.ScVal[] = [xdr.ScVal.scvSymbol("test")];

  describe("recommendedInclusionFee", () => {
    it("returns BigInt(max) for an all-digits max string", async () => {
      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: {
            max: "250000",
          },
        }),
      };

      const fee = await recommendedInclusionFee(stubServer as never);
      expect(fee).toBe(BigInt(250000));
      expect(stubServer.getFeeStats).toHaveBeenCalledTimes(1);
    });

    it("returns the raised fee base from getFeeStats when it exceeds BASE_FEE", async () => {
      const raisedMax = (BigInt(BASE_FEE) * 20n + 1n).toString();
      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: {
            max: raisedMax,
          },
        }),
      };

      const fee = await recommendedInclusionFee(stubServer as never);
      expect(fee).toBe(BigInt(raisedMax));
      expect(fee).toBe(BigInt(BASE_FEE) * 20n + 1n);
    });

    it("falls back to BigInt(BASE_FEE) when max is non-numeric or malformed", async () => {
      const nonNumericCases = ["not-a-number", "123.45", "100abc", "", "   "];

      for (const badMax of nonNumericCases) {
        const stubServer = {
          getFeeStats: vi.fn().mockResolved({
            sorobanInclusionFee: {
              max: badMax,
            },
          }),
        };

        const fee = await recommendedInclusionFee(stubServer as never);
        expect(fee).toBe(BigInt(BASE_FEE));
      }
    });

    it("falls back to BigInt(BASE_FEE) when sorobanInclusionFee is missing", async () => {
      const stubServer = {
        getFeeStats: vi.fn().mockResolved({}),
      };

      const fee = await recommendedInclusionFee(stubServer as never);
      expect(fee).toBe(BigInt(BASE_FEE));
    });

    it("falls back to BigInt(BASE_FEE) when getFeeStats throws an error", async () => {
      const stubServer = {
        getFeeStats: vi.fn().mockRejected(new Error("RPC outage or network down")),
      };

      const fee = await recommendedInclusionFee(stubServer as never);
      expect(fee).toBe(BigInt(BASE_FEE));
    });
  });

  describe("budgetFee", () => {
    it("returns ((higher of inclusion/minResource) + FEE_BUFFER_STROOPS).toString() when inclusion > minResource", async () => {
      const inclusionFee = 800_000n;
      const minResourceFee = 300_000n;

      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: { max: inclusionFee.toString() },
        }),
      };

      const report: SimulationReport = {
        ok: true,
        minResourceFee,
      };

      const fee = await budgetFee(stubServer as never, report);
      const expected = (inclusionFee + FEE_BUFFER_STROOPS).toString();
      expect(fee).toBe(expected);
      expect(fee).toBe("1300000");
    });

    it("returns ((higher of inclusion/minResource) + FEE_BUFFER_STROOPS).toString() when minResource > inclusion", async () => {
      const inclusionFee = 200_000n;
      const minResourceFee = 900_000n;

      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: { max: inclusionFee.toString() },
        }),
      };

      const report: SimulationReport = {
        ok: true,
        minResourceFee,
      };

      const fee = await budgetFee(stubServer as never, report);
      const expected = (minResourceFee + FEE_BUFFER_STROOPS).toString();
      expect(fee).toBe(expected);
      expect(fee).toBe("1400000");
    });

    it("handles report.ok = false by falling back minResourceFee to 0n", async () => {
      const inclusionFee = 400_000n;

      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: { max: inclusionFee.toString() },
        }),
      };

      const report: SimulationReport = {
        ok: false,
        error: { message: "Preflight failed" },
      };

      const fee = await budgetFee(stubServer as never, report);
      const expected = (inclusionFee + FEE_BUFFER_STROOPS).toString();
      expect(fee).toBe(expected);
      expect(fee).toBe("900000");
    });

    it("uses a raised fee base from getFeeStats when computing the budget", async () => {
      const inclusionFee = BigInt(BASE_FEE) * 50n + 7n;
      const minResourceFee = 1_000n.toBigInt();

      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: { max: inclusionFee.toString() },
        }),
      };

      const report: SimulationReport = {
        ok: true,
        minResourceFee,
      };

      const fee = await budgetFee(stubServer as never, report);
      expect(fee).toBe(BigInt(inclusionFee + FEE_BUFFER_STROOPS).toString());
      expect(fee).toBe(BigInt(BASE_FEE) * 50n + 7n + FEE_BUFFER_STROOPS).toString());
    });

    it("falls back to a sane default rather than zero when getFeeStats fails", async () => {
      const stubServer = {
        getFeeStats: vi.fn().mockRejected(new Error("RPC outage or network down")),
      };

      const report: SimulationReport = {
        ok: true,
        minResourceFee: 0n,
      };

      const fee = await budgetFee(stubServer as never, report);
      const expected = (BigInt(BASE_FEE) + FEE_BUFFER_STROOPS).toString();
      expect(fee).toBe(expected);
      expect(fee).toBe("500000");
      expect(BigInt(fee)).toBeGreaterThan(0n);
    });

    it("falls back to a sane default when getFeeStats returns malformed data", async () => {
      const stubServer = {
        getFeeStats: vi.fn().mockResolved({
          sorobanInclusionFee: { max: "not-a-number" },
        }),
      };

      const report: SimulationReport = {
        ok: true,
        minResourceFee: 0n,
      };

      const fee = await budgetFee(stubServer as never, report);
      const expected = (BigInt(BASE_FEE) + FEE_BUFFER_STROOPS).toString();
      expect(fee).toBe(expected);
      expect(BigInt(fee)).toBeGreaterThan(0n);
    });
  });

  describe("buildInvocationTransaction", () => {
    it("uses BASE_FEE and configured NETWORK_PASSTHRASE by default", () => {
      const tx = buildInvocationTransaction(dummyAccount, contractId, "test_func", dummyArgs);

      expect(tx.fee).toBe(BASE_FEE);
      expect(tx.networkPassphrase).toBe(NETWORK_PASSTHRASE);
      expect(tx.operations).toHaveLength(1);

      const op = tx.operations[0];
      expect(op.type).toBe("invokeHostFunction");
    });

    it("honours an explicit fee passed by caller", () => {
      const explicitFee = "987654";
      const tx = buildInvocationTransaction(
        dummyAccount,
        contractId,
        "test_func",
        dummyArgs,
        explicitFee
      );

      expect(tx.fee).toBe(explicitFee);
      expect(tx.networkPassphrase).toBe(NETWORK_PASSPHRASE);
    });
  });

  describe("simulateContractRead", () => {
    it("returns null for an empty result rather than throwing", async () => {
      const stubServer = {
        simulateTransaction: vi.fn().mockResolvedValue({
          results: [],
        }),
      };

      const result = await simulateContractRead(
        stubServer as never,
        contractId,
        "test_func",
        dummyArgs,
        buyerAddress
      );

      expect(result).toBeNull();
    });

    it("returns null when the simulation result is absent", async () => {
      const stubServer = {
        simulateTransaction: vi.fn().mockResolvedValue({
          results: [{ retval: undefined }],
        }),
      };

      const result = await simulateContractRead(
        stubServer as never,
        contractId,
        "test_func",
        dummyArgs,
        buyerAddress
      );

      expect(result).toBeNull();
    });

    it("propagates a thrown simulation error", async () => {
      const stubServer = {
        simulateTransaction: vi.fn().mockRejectedValue(new Error("simulation failed")),
      };

      await expect(
        simulateContractRead(
          stubServer as never,
          contractId,
          "test_func",
          dummyArgs,
          buyerAddress
        )
      ).rejects.toThrow("simulation failed");
    });
  });
});
