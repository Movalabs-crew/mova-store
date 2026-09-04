import { describe, it, expect, vi } from "vitest";
import { Account, BASE_FEE, Operation, rpc, xdr } from "@stellar/stellar-sdk";
import {
  buildInvocationTransaction,
  recommendedInclusionFee,
  budgetFee,
  SimulationReport,
} from "@/lib/stellar/simulate";
import { FEE_BUFFER_STROOPS, NETWORK_PASSPHRASE } from "@/lib/stellar/config";

describe("lib/stellar/simulate", () => {
  const dummyPublicKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  const dummyContractId = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

  describe("buildInvocationTransaction", () => {
    it("uses BASE_FEE and configured NETWORK_PASSPHRASE by default", () => {
      const account = new Account(dummyPublicKey, "100");
      const contractId = dummyContractId;
      const fn = "pay";
      const args: xdr.ScVal[] = [];

      const tx = buildInvocationTransaction(account, contractId, fn, args);

      expect(tx.fee).toBe(BASE_FEE);
      expect(tx.networkPassphrase).toBe(NETWORK_PASSPHRASE);
      expect(tx.operations).toHaveLength(1);
      expect(tx.operations[0].type).toBe("invokeHostFunction");
    });

    it("honours an explicit fee passed as parameter", () => {
      const account = new Account(dummyPublicKey, "100");
      const contractId = dummyContractId;
      const customFee = "500000";

      const tx = buildInvocationTransaction(account, contractId, "pay", [], customFee);

      expect(tx.fee).toBe(customFee);
    });
  });

  describe("recommendedInclusionFee", () => {
    it("returns BigInt(max) for an all-digits max from getFeeStats", async () => {
      const mockServer = {
        getFeeStats: vi.fn().mockResolvedValue({
          sorobanInclusionFee: {
            max: "250000",
          },
        }),
      } as unknown as rpc.Server;

      const fee = await recommendedInclusionFee(mockServer);
      expect(fee).toBe(250000n);
    });

    it("returns BigInt(BASE_FEE) when max is non-numeric", async () => {
      const mockServer = {
        getFeeStats: vi.fn().mockResolvedValue({
          sorobanInclusionFee: {
            max: "invalid-number",
          },
        }),
      } as unknown as rpc.Server;

      const fee = await recommendedInclusionFee(mockServer);
      expect(fee).toBe(BigInt(BASE_FEE));
    });

    it("returns BigInt(BASE_FEE) when getFeeStats throws", async () => {
      const mockServer = {
        getFeeStats: vi.fn().mockRejectedValue(new Error("RPC network failure")),
      } as unknown as rpc.Server;

      const fee = await recommendedInclusionFee(mockServer);
      expect(fee).toBe(BigInt(BASE_FEE));
    });
  });

  describe("budgetFee", () => {
    it("returns ((inclusion) + FEE_BUFFER_STROOPS).toString() when inclusion fee is higher than minResourceFee", async () => {
      const mockServer = {
        getFeeStats: vi.fn().mockResolvedValue({
          sorobanInclusionFee: {
            max: "150000",
          },
        }),
      } as unknown as rpc.Server;

      const report: SimulationReport = {
        ok: true,
        minResourceFee: 50000n,
      };

      const result = await budgetFee(mockServer, report);
      const expected = (150000n + FEE_BUFFER_STROOPS).toString();
      expect(result).toBe(expected);
    });

    it("returns ((minResource) + FEE_BUFFER_STROOPS).toString() when minResourceFee is higher than inclusion fee", async () => {
      const mockServer = {
        getFeeStats: vi.fn().mockResolvedValue({
          sorobanInclusionFee: {
            max: "50000",
          },
        }),
      } as unknown as rpc.Server;

      const report: SimulationReport = {
        ok: true,
        minResourceFee: 200000n,
      };

      const result = await budgetFee(mockServer, report);
      const expected = (200000n + FEE_BUFFER_STROOPS).toString();
      expect(result).toBe(expected);
    });

    it("handles report with ok=false or missing minResourceFee gracefully", async () => {
      const mockServer = {
        getFeeStats: vi.fn().mockRejectedValue(new Error("RPC failure")),
      } as unknown as rpc.Server;

      const report: SimulationReport = {
        ok: false,
      };

      const result = await budgetFee(mockServer, report);
      const expected = (BigInt(BASE_FEE) + FEE_BUFFER_STROOPS).toString();
      expect(result).toBe(expected);
    });
  });
});
