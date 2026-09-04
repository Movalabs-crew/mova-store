import { describe, it, expect, vi } from "vitest";

const fake = vi.hoisted(() => ({
  ledgerCalls: 0,
  eventsCalls: 0,
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: class {
        async getLatestLedger() {
          fake.ledgerCalls += 1;
          if (fake.ledgerCalls === 1) throw new Error("rpc unreachable");
          return { sequence: 100 };
        }
        async getEvents() {
          fake.eventsCalls += 1;
          return { events: [], cursor: "cursor-1", latestLedger: 100 };
        }
      },
    },
  };
});

import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

describe("PaymentEventIndexer initialize retry (#68)", () => {
  it("recovers from a transient startup RPC outage and starts polling", async () => {
    fake.ledgerCalls = 0;
    fake.eventsCalls = 0;
    const errors: Error[] = [];
    const statuses: Array<{
      latestLedger?: number;
      lastCursor?: string;
      lastError?: string;
    }> = [];

    const indexer = new PaymentEventIndexer({ pollMs: 10 });
    indexer.start({
      onEvent: () => {},
      onStatus: (s) => statuses.push({ ...s }),
      onError: (e) => errors.push(e),
    });

    // First getLatestLedger rejects; with a 10ms poll interval the capped
    // backoff retries land well within this window.
    await new Promise((resolve) => setTimeout(resolve, 200));
    indexer.stop();

    // The start ledger was eventually resolved and polling began.
    expect(fake.ledgerCalls).toBeGreaterThanOrEqual(2);
    expect(fake.eventsCalls).toBeGreaterThanOrEqual(1);
    const last = statuses[statuses.length - 1];
    expect(last.latestLedger).toBe(100);
    expect(last.lastCursor).toBe("cursor-1");
    // No hard "nothing to poll" error was ever emitted.
    expect(
      errors.some((e) => /no cursor or start ledger/i.test(e.message))
    ).toBe(false);
  });
});
