import {
  Account,
  BASE_FEE,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

import {
  FEE_BUFFER_STROOPS,
  NETWORK_PASSPHRASE,
} from "./config";
import { addressToScVal } from "./scval";

// ---------------------------------------------------------------------------
// Pre-flight simulation utilities.
//
// Before signing a payment we simulate it against the RPC to (a) surface
// errors early (insufficient balance, missing trustline, bad arguments) and
// (b) report the exact resource fee/CPU/IO the transaction will consume. The
// final prepared transaction is produced by `server.prepareTransaction`, which
// attaches the footprint + auth entries and a fee that covers the simulation.
// ---------------------------------------------------------------------------

export interface PreflightError {
  message: string;
  /** Contract error code/name if one can be extracted. */
  code?: string;
  diagnostics?: string[];
}

export interface SimulationReport {
  ok: boolean;
  /** Ledger at simulation time. */
  latestLedger?: number;
  /** CPU instructions budget used (from the Soroban resources). */
  instructions?: number;
  /** Disk read bytes budgeted. */
  diskReadBytes?: number;
  /** Write bytes budgeted. */
  writeBytes?: number;
  /** Minimum resource fee reported by the simulation (stroops). */
  minResourceFee?: bigint;
  /** Number of authorization entries the prepared tx will need. */
  authCount?: number;
  /** Return value of the simulated invocation, if any. */
  retval?: xdr.ScVal;
  /** Recommended classic inclusion fee (stroops) from the fee stats. */
  recommendedInclusionFee?: bigint;
  error?: PreflightError;
}

/**
 * Build an invoke-contract-function transaction from a loaded account.
 * `fee` (stroops) defaults to the classic BASE_FEE; the caller may top it up.
 */
export function buildInvocationTransaction(
  account: Account,
  contractId: string,
  fn: string,
  args: xdr.ScVal[],
  fee: string = BASE_FEE
): Transaction {
  return new TransactionBuilder(account, {
    fee,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({ contract: contractId, function: fn, args })
    )
    .setTimeout(0)
    .build();
}

/**
 * Perform a read-only contract invocation by simulating it and returning the
 * return value ScVal. Read calls that hit a HostError (e.g. `balance` for an
 * address with no entry) resolve to `null` instead of throwing, mirroring how
 * the contract treats "missing" as zero/absent.
 */
export async function simulateContractRead(
  server: rpc.Server,
  contractId: string,
  fn: string,
  args: xdr.ScVal[],
  source?: string
): Promise<xdr.ScVal | null> {
  const account = new Account(source ?? Keypair.random().publicKey(), "0");
  const tx = buildInvocationTransaction(account, contractId, fn, args);
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return null;
  return sim.result?.retval ?? null;
}

export async function simulateContractReadOrThrow(
  server: rpc.Server,
  contractId: string,
  fn: string,
  args: xdr.ScVal[],
  source?: string
): Promise<xdr.ScVal | null> {
  const account = new Account(source ?? Keypair.random().publicKey(), "0");
  const tx = buildInvocationTransaction(account, contractId, fn, args);
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(String(sim.error));
  }
  return sim.result?.retval ?? null;
}

/** Read the raw balance of `address` for any SEP-41 SAC token. */
export async function readTokenBalance(
  server: rpc.Server,
  tokenContractId: string,
  address: string
): Promise<bigint> {
  const retval = await simulateContractRead(
    server,
    tokenContractId,
    "balance",
    [addressToScVal(address)],
    address
  );
  if (retval === null) return BigInt(0);
  return BigInt(scValToNative(retval).toString());
}

/** Read a token's decimal places (fallback 7 for SAC tokens). */
export async function readTokenDecimals(
  server: rpc.Server,
  tokenContractId: string
): Promise<number> {
  const retval = await simulateContractRead(server, tokenContractId, "decimals", []);
  if (retval === null) return 7;
  return Number(scValToNative(retval));
}

/**
 * Simulate a transaction and produce a detailed pre-flight report. Does not
 * mutate the transaction; use `prepareAndReport` for the final tx.
 */
export async function preflight(server: rpc.Server, tx: Transaction): Promise<SimulationReport> {
  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(sim)) {
    const diagnostics =
      sim.events
        ?.filter((d) => d.inSuccessfulContractCall())
        .map((d) => d.event().toString()) ?? [];
    return {
      ok: false,
      latestLedger: sim.latestLedger,
      error: {
        message: String(sim.error),
        code: extractErrorCode(sim.error),
        diagnostics,
      },
    };
  }

  const data = sim.transactionData.build();
  const resources = data.resources();
  const minResourceFee = BigInt(sim.minResourceFee);

  return {
    ok: true,
    latestLedger: sim.latestLedger,
    instructions: resources.instructions(),
    diskReadBytes: resources.diskReadBytes(),
    writeBytes: resources.writeBytes(),
    minResourceFee,
    authCount: sim.result?.auth?.length ?? 0,
    retval: sim.result?.retval ?? undefined,
  };
}

/**
 * Simulate a transaction, return both the report AND the prepared transaction
 * (footprint + auth entries + fee attached). The prepared tx is what should be
 * signed with Freighter.
 */
export async function prepareAndReport(
  server: rpc.Server,
  tx: Transaction
): Promise<{ tx: Transaction; report: SimulationReport }> {
  const report = await preflight(server, tx);
  if (!report.ok) return { tx, report };
  const prepared = await server.prepareTransaction(tx);
  return { tx: prepared, report };
}

/**
 * Recommended classic inclusion fee (stroops) based on recent network stats.
 * `max` from the Soroban inclusion fee distribution is a safe upper bound;
 * falls back to BASE_FEE when stats are unavailable.
 */
export async function recommendedInclusionFee(server: rpc.Server): Promise<bigint> {
  try {
    const stats = await server.getFeeStats();
    const max = stats.sorobanInclusionFee?.max;
    if (typeof max === "string" && /^\d+$/.test(max)) {
      return BigInt(max);
    }
  } catch {
    // ignore and fall through
  }
  return BigInt(BASE_FEE);
}

/**
 * Total fee the final transaction should carry: max(recommended inclusion
 * fee, simulated min resource fee) plus a safety buffer.
 */
export async function budgetFee(
  server: rpc.Server,
  report: SimulationReport
): Promise<string> {
  const inclusion = await recommendedInclusionFee(server);
  const minResource = report.ok ? (report.minResourceFee ?? BigInt(0)) : BigInt(0);
  const total = (inclusion > minResource ? inclusion : minResource) + FEE_BUFFER_STROOPS;
  return total.toString();
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

const CONTRACT_ERROR_PREFIX = "ContractError(";

function extractErrorCode(error: unknown): string | undefined {
  const msg = String(error);
  const idx = msg.indexOf(CONTRACT_ERROR_PREFIX);
  if (idx >= 0) {
    const rest = msg.slice(idx + CONTRACT_ERROR_PREFIX.length);
    const end = rest.indexOf(")");
    if (end >= 0) return `CONTRACT_${rest.slice(0, end)}`;
  }
  if (msg.includes("HostError")) return "HOST_ERROR";
  if (msg.includes("wasm") && msg.includes("Invalid")) return "INVALID_WASM";
  return undefined;
}

// ---------------------------------------------------------------------------
// Tests for fee helpers (budgetFee / recommendedInclusionFee).
//
// Fee math is money; these tests pin the fee string produced for the normal
// case, a raised fee base, and a failed getFeeStats fallback.
// ---------------------------------------------------------------------------

if (typeof describe === "function") {
  describe("recommendedInclusionFee / budgetFee", () => {
    const makeServer = (getFeeStats: () => Promise<unknown>): rpc.Server =>
      ({ getFeeStats } as unknown as rpc.Server);

    const okReport = (minResourceFee: bigint): SimulationReport => ({
      ok: true,
      minResourceFee,
    });

    it("uses the Soroban inclusion fee max in the normal case", async () => {
      const server = makeServer(async () => ({
        sorobanInclusionFee: { max: "12345" },
      }));

      const inclusion = await recommendedInclusionFee(server);
      expect(inclusion.toString()).toBe("12345");

      const fee = await budgetFee(server, okReport(BigInt(100)));
      expect(fee).toBe((BigInt(12345) + FEE_BUFFER_STROOPS).toString());
    });

    it("uses a raised fee base when it exceeds the min resource fee", async () => {
      const server = makeServer(async () => ({
        sorobanInclusionFee: { max: "500000" },
      }));

      const fee = await budgetFee(server, okReport(BigInt(100)));
      expect(fee).toBe((BigInt(500000) + FEE_BUFFER_STROOPS).toString());
    });

    it("uses the min resource fee when it exceeds the inclusion fee", async () => {
      const server = makeServer(async () => ({
        sorobanInclusionFee: { max: "100" },
      }));

      const fee = await budgetFee(server, okReport(BigInt(999999)));
      expect(fee).toBe((BigInt(999999) + FEE_BUFFER_STROOPS).toString());
    });

    it("falls back to BASE_FEE when getFeeStats fails", async () => {
      const server = makeServer(async () => {
        throw new Error("rpc unavailable");
      });

      const inclusion = await recommendedInclusionFee(server);
      expect(inclusion).toBe(BigInt(BASE_FEE));
      expect(inclusion > BigInt(0)).toBe(true);

      const fee = await budgetFee(server, okReport(BigInt(0)));
      expect(fee).toBe((BigInt(BASE_FEE) + FEE_BUFFER_STROOPS).toString());
      expect(BigInt(fee) > BigInt(0)).toBe(true);
    });

    it("falls back to BASE_FEE when the stats payload is malformed", async () => {
      const server = makeServer(async () => ({
        sorobanInclusionFee: { max: "not-a-number" },
      }));

      const inclusion = await recommendedInclusionFee(server);
      expect(inclusion).toBe(BigInt(BASE_FEE));
    });
  });
}
