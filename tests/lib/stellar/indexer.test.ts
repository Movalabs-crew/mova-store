import { xdr } from "@stellar/stellar-sdk";
import { describe, expect, it, vi } from "vitest";

import type { IndexedEvent } from "../../../lib/stellar/indexer";
import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

describe("PaymentEventIndexer startup retry (Issue #68)", () => {
  it("retries getLatestLedger when initial call fails and recovers without 'no cursor' error", async () => {
    let getLatestLedgerAttempts = 0;
    let getEventsCalled = false;

    const fakeServer = {
      getLatestLedger: vi.fn().mockImplementation(async () => {
        getLatestLedgerAttempts++;
        if (getLatestLedgerAttempts === 1) {
          throw new Error("RPC temporary network partition");
        }
        return { sequence: 100 };
      }),
      getEvents: vi.fn().mockImplementation(async () => {
        getEventsCalled = true;
        return {
          latestLedger: 100,
          cursor: "cursor-abc-123",
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

    // Wait for the first attempt to run and fail
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(getLatestLedgerAttempts).toBe(1);
    expect(getEventsCalled).toBe(false);
    expect(errors.some((e) => e.includes("Could not reach the Stellar RPC (retrying)"))).toBe(true);
    // Crucial: Must NEVER emit "no cursor or start ledger" error
    expect(errors.some((e) => e.includes("no cursor or start ledger"))).toBe(false);
    expect(indexer.status.retrying).toBe(true);

    // Wait for second tick to succeed and begin polling
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(getLatestLedgerAttempts).toBeGreaterThanOrEqual(2);
    expect(getEventsCalled).toBe(true);
    expect(errors.some((e) => e.includes("no cursor or start ledger"))).toBe(false);
    expect(indexer.status.lastCursor).toBe("cursor-abc-123");
    expect(indexer.status.latestLedger).toBe(100);
    expect(indexer.status.retrying).toBe(false);

    indexer.stop();
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

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(indexer.status.latestLedger).toBeGreaterThanOrEqual(202);
    expect(indexer.status.retrying).toBe(false);

    indexer.stop();
  });

  it("stops cleanly and ceases polling after stop() is called", async () => {
    let getEventsCalls = 0;
    const fakeServer = {
      getLatestLedger: vi.fn().mockResolvedValue({ sequence: 300 }),
      getEvents: vi.fn().mockImplementation(async () => {
        getEventsCalls++;
        return {
          latestLedger: 300,
          cursor: "cursor-300",
          events: [],
        };
      }),
    };

    const indexer = new PaymentEventIndexer({ pollMs: 30 });
    (indexer as unknown as { server: unknown }).server = fakeServer;

    indexer.start({ onEvent: () => {} });
    await new Promise((resolve) => setTimeout(resolve, 50));
    indexer.stop();
    const callsAtStop = getEventsCalls;

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(getEventsCalls).toBe(callsAtStop);
    expect(indexer.status.running).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// decodeEvent - topic naming, the watched-symbol filter and the data branches.
//
// decodeEvent is private and touches only pure ScVal values, so these drive it
// through a cast with hand-built fixtures. No server is constructed and no
// request is made.
// ---------------------------------------------------------------------------

const ORDER_ID_BYTES = Buffer.alloc(32, 0x05);
const ORDER_ID_HEX = ORDER_ID_BYTES.toString("hex");

type DecodeEvent = (raw: unknown) => IndexedEvent | null;

function decoderFor(watchedSymbols?: string[]): DecodeEvent {
  const indexer = new PaymentEventIndexer(watchedSymbols ? { watchedSymbols } : {});
  const decode = (indexer as unknown as { decodeEvent: DecodeEvent }).decodeEvent;
  return decode.bind(indexer);
}

function eventFixture(topic: xdr.ScVal[], value: xdr.ScVal) {
  return {
    id: "evt-1",
    ledger: 42,
    ledgerClosedAt: "2026-01-01T00:00:00Z",
    txHash: "tx-1",
    contractId: "C-contract",
    topic,
    value,
  };
}

describe("PaymentEventIndexer.decodeEvent", () => {
  it("drops an event whose symbol is not watched", () => {
    const raw = eventFixture([xdr.ScVal.scvSymbol("transfer")], xdr.ScVal.scvString("ignored"));

    expect(decoderFor()(raw)).toBeNull();
  });

  it("drops an event whose first topic is not a symbol", () => {
    // A string topic still reads as "pay" once stringified, so the type check
    // is the only thing keeping a non-symbol event out.
    const raw = eventFixture([xdr.ScVal.scvString("pay")], xdr.ScVal.scvString("ignored"));

    expect(decoderFor()(raw)).toBeNull();
  });

  it("drops an event with no topics at all", () => {
    expect(decoderFor()(eventFixture([], xdr.ScVal.scvString("x")))).toBeNull();
  });

  it("names trailing topics topic1..topicN in order", () => {
    const raw = eventFixture(
      [
        xdr.ScVal.scvSymbol("dispatch"),
        xdr.ScVal.scvString("first"),
        xdr.ScVal.scvString("second"),
        xdr.ScVal.scvString("third"),
      ],
      xdr.ScVal.scvString("data"),
    );

    const decoded = decoderFor()(raw);

    expect(decoded?.symbol).toBe("dispatch");
    expect(decoded?.fields.topic1).toBe("first");
    expect(decoded?.fields.topic2).toBe("second");
    expect(decoded?.fields.topic3).toBe("third");
    expect(decoded?.fields.topic4).toBeUndefined();
  });

  it("exposes a pay order id as topic4 in 64 hex characters", () => {
    // Regression guard for StellarOrderWatch, which reads topic4 positionally.
    // The pay layout is [pay, token, buyer, merchant, order_id]; the address
    // slots are strings here because decodeEvent applies the same conversion to
    // every topic, so their encoding is not what this case pins.
    const raw = eventFixture(
      [
        xdr.ScVal.scvSymbol("pay"),
        xdr.ScVal.scvString("token"),
        xdr.ScVal.scvString("buyer"),
        xdr.ScVal.scvString("merchant"),
        xdr.ScVal.scvBytes(ORDER_ID_BYTES),
      ],
      xdr.ScVal.scvString("data"),
    );

    const decoded = decoderFor()(raw);

    expect(decoded?.fields.topic4).toBe(ORDER_ID_HEX);
    expect(decoded?.fields.topic4).toHaveLength(64);
  });

  it("merges map data under each entry's key name", () => {
    const raw = eventFixture(
      [xdr.ScVal.scvSymbol("pay")],
      xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("amount"),
          val: xdr.ScVal.scvString("10000"),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("timestamp"),
          val: xdr.ScVal.scvString("1700000000"),
        }),
      ]),
    );

    const decoded = decoderFor()(raw);

    expect(decoded?.fields.amount).toBe("10000");
    expect(decoded?.fields.timestamp).toBe("1700000000");
    expect(decoded?.fields.value).toBeUndefined();
  });

  it("joins vec data into a single comma-separated value field", () => {
    const raw = eventFixture(
      [xdr.ScVal.scvSymbol("refund")],
      xdr.ScVal.scvVec([
        xdr.ScVal.scvString("one"),
        xdr.ScVal.scvString("two"),
        xdr.ScVal.scvString("three"),
      ]),
    );

    expect(decoderFor()(raw)?.fields.value).toBe("one,two,three");
  });

  it("puts scalar data in the value field", () => {
    const raw = eventFixture(
      [xdr.ScVal.scvSymbol("create_order")],
      xdr.ScVal.scvBytes(ORDER_ID_BYTES),
    );

    expect(decoderFor()(raw)?.fields.value).toBe(ORDER_ID_HEX);
  });

  it("carries the envelope fields through unchanged", () => {
    const raw = eventFixture([xdr.ScVal.scvSymbol("pay")], xdr.ScVal.scvString("data"));

    const decoded = decoderFor()(raw);

    expect(decoded?.id).toBe("evt-1");
    expect(decoded?.ledger).toBe(42);
    expect(decoded?.ledgerClosedAt).toBe("2026-01-01T00:00:00Z");
    expect(decoded?.txHash).toBe("tx-1");
    expect(decoded?.contractId).toBe("C-contract");
  });

  it("honours a caller-supplied watched-symbol list", () => {
    const decode = decoderFor(["only_this"]);

    expect(decode(eventFixture([xdr.ScVal.scvSymbol("pay")], xdr.ScVal.scvString("d")))).toBeNull();
    expect(
      decode(eventFixture([xdr.ScVal.scvSymbol("only_this")], xdr.ScVal.scvString("d")))?.symbol,
    ).toBe("only_this");
  });

  it("watches exactly the four lifecycle symbols the contract documents", () => {
    // This filter is the join between the contract and the decoder. A symbol
    // missing from it is dropped silently rather than surfacing as an error, so
    // the default list is worth pinning next to the layouts documented in
    // contracts/checkout/src/events.rs.
    const decode = decoderFor();

    for (const symbol of ["pay", "create_order", "dispatch", "refund"]) {
      const decoded = decode(eventFixture([xdr.ScVal.scvSymbol(symbol)], xdr.ScVal.scvString("d")));
      expect(decoded?.symbol).toBe(symbol);
    }
  });
});
