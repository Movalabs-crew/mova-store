import { afterEach, describe, expect, it, vi } from "vitest";
import { rpc } from "@stellar/stellar-sdk";

import { waitForTransaction } from "../../../lib/stellar/events";
import { TX_POLL_INTERVAL_MS, TX_TIMEOUT_SECONDS } from "../../../lib/stellar/config";

/**
 * `waitForTransaction` polls until the transaction reaches a *final* state.
 * `NOT_FOUND` (accepted but not yet in a ledger) and a transient RPC error are
 * both non-final: the poll must continue. Only `SUCCESS` and `FAILED` end it,
 * and the wait must stay bounded by `TX_TIMEOUT_SECONDS`.
 *
 * The existing `events.test.ts` covers SUCCESS, FAILED and a single transient
 * error; this file covers the retry loop itself and the timeout boundary.
 */
describe("waitForTransaction retry behavior (Issue #536)", () => {
  const TX_HASH = "abc123mocktxhash";

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function getTransactionSpy() {
    return vi.spyOn(rpc.Server.prototype, "getTransaction");
  }

  it("keeps polling while the transaction is NOT_FOUND and resolves on a later ledger", async () => {
    vi.useFakeTimers();
    const successTx = { status: "SUCCESS", ledger: 500, txHash: TX_HASH };
    const spy = getTransactionSpy()
      .mockResolvedValueOnce({ status: "NOT_FOUND", txHash: TX_HASH } as never)
      .mockResolvedValueOnce({ status: "NOT_FOUND", txHash: TX_HASH } as never)
      .mockResolvedValueOnce(successTx as never);

    const pending = waitForTransaction(TX_HASH);

    // One poll happens immediately, so two interval waits are needed to reach
    // the third call that succeeds.
    await vi.advanceTimersByTimeAsync(TX_POLL_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(TX_POLL_INTERVAL_MS);

    await expect(pending).resolves.toBe(successTx);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith(TX_HASH);
  });

  it("answers immediately on FAILED instead of polling again", async () => {
    vi.useFakeTimers();
    const spy = getTransactionSpy()
      .mockResolvedValueOnce({ status: "NOT_FOUND", txHash: TX_HASH } as never)
      .mockResolvedValueOnce({ status: "FAILED", ledger: 101, txHash: TX_HASH } as never);

    const pending = waitForTransaction(TX_HASH);
    const assertion = expect(pending).rejects.toThrow("Transaction failed on ledger 101");

    await vi.advanceTimersByTimeAsync(TX_POLL_INTERVAL_MS);
    await assertion;

    // FAILED is final: the second poll must be the last one.
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("survives repeated transient RPC errors and still confirms the transaction", async () => {
    vi.useFakeTimers();
    const successTx = { status: "SUCCESS", ledger: 501, txHash: TX_HASH };
    const spy = getTransactionSpy()
      .mockRejectedValueOnce(new Error("rpc unavailable"))
      .mockRejectedValueOnce(new Error("rpc unavailable"))
      .mockRejectedValueOnce(new Error("rpc unavailable"))
      .mockResolvedValueOnce(successTx as never);

    const pending = waitForTransaction(TX_HASH);
    await vi.advanceTimersByTimeAsync(TX_POLL_INTERVAL_MS * 3);

    await expect(pending).resolves.toBe(successTx);
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it("gives up after the timeout and reports the hash when the status never becomes final", async () => {
    vi.useFakeTimers();
    const spy = getTransactionSpy().mockResolvedValue({
      status: "NOT_FOUND",
      txHash: TX_HASH,
    } as never);

    const pending = waitForTransaction(TX_HASH);
    const assertion = expect(pending).rejects.toThrow(
      new RegExp(`did not reach a final state within ${TX_TIMEOUT_SECONDS}s \\(hash: ${TX_HASH}\\)`)
    );

    // Advance past the deadline; the loop must exit rather than spin forever.
    await vi.advanceTimersByTimeAsync(TX_TIMEOUT_SECONDS * 1000 + TX_POLL_INTERVAL_MS * 2);
    await assertion;

    const polls = spy.mock.calls.length;
    expect(polls).toBeGreaterThan(1);
    expect(polls).toBeLessThanOrEqual(TX_TIMEOUT_SECONDS * 1000 / TX_POLL_INTERVAL_MS + 2);
  });

  it("reports the last RPC error when the timeout is reached during an outage", async () => {
    vi.useFakeTimers();
    const spy = getTransactionSpy().mockRejectedValue(new Error("rpc unreachable"));

    const pending = waitForTransaction(TX_HASH);
    const assertion = expect(pending).rejects.toThrow(/Last RPC error: rpc unreachable/);

    await vi.advanceTimersByTimeAsync(TX_TIMEOUT_SECONDS * 1000 + TX_POLL_INTERVAL_MS * 2);
    await assertion;

    expect(spy.mock.calls.length).toBeGreaterThan(1);
  });
});
