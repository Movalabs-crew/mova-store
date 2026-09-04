import { describe, expect, it, vi } from "vitest";
import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

describe("PaymentEventIndexer startup retry", () => {
  it("retries getLatestLedger when initial call fails and recovers without 'no cursor' error", async () => {
    let getLatestLedgerAttempts = 0;
    let getEventsCalled = false;

    const fakeServer = {
      getLatestLedger: vi.fn().mockImplementation(async () => {
        getLatestLedgerAttempts++;
        if (getLatestLedgerAttempts === 1) {
          throw new Error("RPC unavailable");
        }
        return { sequence: 100 };
      }),
      getEvents: vi.fn().mockImplementation(async () => {
        getEventsCalled = true;
        return {
          latestLedger: 100,
          cursor: "cursor-1",
          events: [],
        };
      }),
    };

    const indexer = new PaymentEventIndexer({ pollMs: 50 });
    (indexer as unknown as { server: unknown }).server = fakeServer;

    const errors: string[] = [];
    const statuses: unknown[] = [];

    indexer.start({
      onEvent: () => {},
      onError: (err) => errors.push(err.message),
      onStatus: (st) => statuses.push(st),
    });

    // Wait for first attempt to run and fail
    await new Promise((r) => setTimeout(r, 10));
    expect(getLatestLedgerAttempts).toBe(1);
    expect(getEventsCalled).toBe(false);
    expect(errors.some((e) => e.includes("Could not reach the Stellar RPC"))).toBe(true);
    expect(errors.some((e) => e.includes("no cursor or start ledger"))).toBe(false);

    // Wait for second tick interval
    await new Promise((r) => setTimeout(r, 60));
    expect(getLatestLedgerAttempts).toBeGreaterThanOrEqual(2);
    expect(getEventsCalled).toBe(true);
    expect(errors.some((e) => e.includes("no cursor or start ledger"))).toBe(false);
    expect(indexer.status.lastCursor).toBe("cursor-1");

    indexer.stop();
  });
});

  it("handles continuous poll updates when initialized normally", async () => {
    let callCount = 0;
    const fakeServer = {
      getLatestLedger: vi.fn().mockResolvedValue({ sequence: 200 }),
      getEvents: vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          latestLedger: 200 + callCount,
          cursor: `cursor-${callCount}`,
          events: [],
        };
      }),
    };

    const indexer = new PaymentEventIndexer({ pollMs: 40 });
    (indexer as unknown as { server: unknown }).server = fakeServer;

    indexer.start({
      onEvent: () => {},
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(indexer.status.latestLedger).toBeGreaterThanOrEqual(202);

    indexer.stop();
  });
