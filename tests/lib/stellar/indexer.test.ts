import { Address, rpc, xdr } from "@stellar/stellar-sdk";
import { describe, expect, it, vi } from "vitest";

import { PaymentEventIndexer, type IndexedEvent } from "../../../lib/stellar/indexer";
import {
  addressToScVal,
  bytes32ToScVal,
  i128ToScVal,
  symbolToScVal,
} from "../../../lib/stellar/scval";

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

describe("PaymentEventIndexer.decodeEvent (Issue #85)", () => {
  const CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
  const TOKEN = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
  const BUYER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const MERCHANT = "GAIYNHCVTWL7MHEVQEJBZNXPPJRE5ELR6CJ5LTL74UISWA7T6BQ47HEU";
  const ORDER_ID_HEX =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"; // 64 hex chars == 32 bytes
  const TX_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const LEDGER = 4242;
  const CLOSED_AT = "2026-09-07T01:00:00Z";

  function makeRawEvent(opts: {
    topic: xdr.ScVal[];
    value: xdr.ScVal;
    id?: string;
    ledger?: number;
    ledgerClosedAt?: string;
    txHash?: string;
    contractId?: string | { toString: () => string };
    inSuccessfulContractCall?: boolean;
  }): rpc.Api.EventResponse {
    return {
      id: opts.id ?? "0000000000000001-0000000000",
      pagingToken: opts.id ?? "0000000000000001-0000000000",
      ledger: opts.ledger ?? LEDGER,
      ledgerClosedAt: opts.ledgerClosedAt ?? CLOSED_AT,
      contractId: opts.contractId ?? CONTRACT_ID,
      topic: opts.topic,
      value: opts.value,
      inSuccessfulContractCall: opts.inSuccessfulContractCall ?? true,
      txHash: opts.txHash ?? TX_HASH,
    } as unknown as rpc.Api.EventResponse;
  }

  function callDecodeEvent(
    indexer: PaymentEventIndexer,
    raw: rpc.Api.EventResponse
  ): IndexedEvent | null {
    return (
      indexer as unknown as {
        decodeEvent: (r: rpc.Api.EventResponse) => IndexedEvent | null;
      }
    ).decodeEvent(raw);
  }

  describe("Topic validation and symbol filtering", () => {
    it("returns null when raw.topic is empty", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, raw)).toBeNull();
    });

    it("returns null when the first topic is not an ScVal symbol", () => {
      const indexer = new PaymentEventIndexer();

      const u32First = makeRawEvent({
        topic: [xdr.ScVal.scvU32(1), addressToScVal(TOKEN)],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, u32First)).toBeNull();

      const stringFirst = makeRawEvent({
        topic: [xdr.ScVal.scvString("pay"), addressToScVal(TOKEN)],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, stringFirst)).toBeNull();

      const bytesFirst = makeRawEvent({
        topic: [xdr.ScVal.scvBytes(Buffer.from("pay")), addressToScVal(TOKEN)],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, bytesFirst)).toBeNull();
    });

    it("returns null when the event symbol is not in watchedSymbols", () => {
      const indexer = new PaymentEventIndexer();

      const unwatchedTransfer = makeRawEvent({
        topic: [symbolToScVal("transfer"), addressToScVal(TOKEN)],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, unwatchedTransfer)).toBeNull();

      const unwatchedMint = makeRawEvent({
        topic: [symbolToScVal("mint"), addressToScVal(TOKEN)],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, unwatchedMint)).toBeNull();

      const unwatchedRandom = makeRawEvent({
        topic: [symbolToScVal("unknown_event")],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(indexer, unwatchedRandom)).toBeNull();
    });

    it("decodes all default watched symbols: pay, create_order, dispatch, refund", () => {
      const indexer = new PaymentEventIndexer();
      const watched = ["pay", "create_order", "dispatch", "refund"];

      for (const sym of watched) {
        const raw = makeRawEvent({
          topic: [symbolToScVal(sym)],
          value: xdr.ScVal.scvVoid(),
        });
        const decoded = callDecodeEvent(indexer, raw);
        expect(decoded).not.toBeNull();
        expect(decoded?.symbol).toBe(sym);
      }
    });

    it("respects custom watchedSymbols provided to the constructor", () => {
      const customIndexer = new PaymentEventIndexer({
        watchedSymbols: ["custom_signal", "ping"],
      });

      const allowedEvent = makeRawEvent({
        topic: [symbolToScVal("custom_signal")],
        value: xdr.ScVal.scvVoid(),
      });
      const decoded = callDecodeEvent(customIndexer, allowedEvent);
      expect(decoded).not.toBeNull();
      expect(decoded?.symbol).toBe("custom_signal");

      // Default "pay" symbol should now be dropped
      const payEvent = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvVoid(),
      });
      expect(callDecodeEvent(customIndexer, payEvent)).toBeNull();
    });
  });

  describe("Topic naming and ordering (topic1..topicN)", () => {
    it("maps raw.topic.slice(1) to topic1..topicN using scValToString", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [
          symbolToScVal("pay"),
          addressToScVal(TOKEN),
          addressToScVal(BUYER),
          addressToScVal(MERCHANT),
          bytes32ToScVal(ORDER_ID_HEX),
          xdr.ScVal.scvU32(100),
          xdr.ScVal.scvString("tag-extra"),
        ],
        value: xdr.ScVal.scvVoid(),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.topic1).toBe(TOKEN);
      expect(decoded?.fields.topic2).toBe(BUYER);
      expect(decoded?.fields.topic3).toBe(MERCHANT);
      expect(decoded?.fields.topic4).toBe(ORDER_ID_HEX);
      expect(decoded?.fields.topic5).toBe("100");
      expect(decoded?.fields.topic6).toBe("tag-extra");
      expect(decoded?.fields.topic7).toBeUndefined();
    });

    it("does not populate any topicN field if topic only contains the event symbol", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [symbolToScVal("refund")],
        value: xdr.ScVal.scvVoid(),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      const topicKeys = Object.keys(decoded?.fields ?? {}).filter((k) =>
        k.startsWith("topic")
      );
      expect(topicKeys).toHaveLength(0);
    });
  });

  describe("Data shapes handling (raw.value)", () => {
    it("merges map entries under their key names for symbol keys", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal("500000000"),
          }),
          new xdr.ScMapEntry({
            key: symbolToScVal("status"),
            val: xdr.ScVal.scvString("confirmed"),
          }),
          new xdr.ScMapEntry({
            key: symbolToScVal("counter"),
            val: xdr.ScVal.scvU32(7),
          }),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.amount).toBe("500000000");
      expect(decoded?.fields.status).toBe("confirmed");
      expect(decoded?.fields.counter).toBe("7");
    });

    it("merges map entries with non-symbol keys using scValToString", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvString("note"),
            val: xdr.ScVal.scvString("paid-via-app"),
          }),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.note).toBe("paid-via-app");
    });

    it("handles empty maps without creating undefined properties", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvMap([]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.value).toBeUndefined();
    });

    it("joins vec data elements with commas under fields.value", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvVec([
          symbolToScVal("item1"),
          xdr.ScVal.scvU32(42),
          symbolToScVal("item2"),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.value).toBe("item1,42,item2");
    });

    it("handles an empty vec yielding an empty string under fields.value", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvVec([]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.value).toBe("");
    });

    it("decodes scalar data values directly into fields.value", () => {
      const indexer = new PaymentEventIndexer();

      const i128Scalar = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: i128ToScVal("123456789"),
      });
      expect(callDecodeEvent(indexer, i128Scalar)?.fields.value).toBe("123456789");

      const stringScalar = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvString("scalar-payload"),
      });
      expect(callDecodeEvent(indexer, stringScalar)?.fields.value).toBe("scalar-payload");

      const boolScalar = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvBool(true),
      });
      expect(callDecodeEvent(indexer, boolScalar)?.fields.value).toBe("true");

      const addrScalar = makeRawEvent({
        topic: [symbolToScVal("pay")],
        value: addressToScVal(BUYER),
      });
      expect(callDecodeEvent(indexer, addrScalar)?.fields.value).toBe(BUYER);
    });
  });

  describe("Pay-shaped fixture (regression guard for StellarOrderWatch.jsx)", () => {
    it("exposes topic4 as the 64-hex order ID and preserves all metadata", () => {
      const indexer = new PaymentEventIndexer({ contractId: CONTRACT_ID });

      // Topics matching Soroban PaymentReceived event:
      // topics: [pay, token, buyer, merchant, order_id]
      // data: { amount }
      const raw = makeRawEvent({
        id: "evt-001",
        ledger: 5001,
        ledgerClosedAt: "2026-09-07T01:15:30Z",
        txHash: TX_HASH,
        contractId: CONTRACT_ID,
        topic: [
          symbolToScVal("pay"),
          addressToScVal(TOKEN),
          addressToScVal(BUYER),
          addressToScVal(MERCHANT),
          bytes32ToScVal(ORDER_ID_HEX),
        ],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal("99000000"),
          }),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();

      // Top-level event metadata
      expect(decoded?.id).toBe("evt-001");
      expect(decoded?.ledger).toBe(5001);
      expect(decoded?.ledgerClosedAt).toBe("2026-09-07T01:15:30Z");
      expect(decoded?.txHash).toBe(TX_HASH);
      expect(decoded?.contractId).toBe(CONTRACT_ID);
      expect(decoded?.symbol).toBe("pay");
      expect(decoded?.topics).toBe(raw.topic);

      // Decoded topic mappings
      expect(decoded?.fields.topic1).toBe(TOKEN);
      expect(decoded?.fields.topic2).toBe(BUYER);
      expect(decoded?.fields.topic3).toBe(MERCHANT);

      // Regression guard: StellarOrderWatch checks (event.fields.topic4 || "").toLowerCase()
      expect(decoded?.fields.topic4).toBe(ORDER_ID_HEX);
      expect(decoded?.fields.topic4).toHaveLength(64);
      expect(decoded?.fields.topic4.toLowerCase()).toBe(ORDER_ID_HEX.toLowerCase());

      // Data map decoding
      expect(decoded?.fields.amount).toBe("99000000");
    });
  });

  describe("Contract lifecycle event fixtures", () => {
    it("decodes create_order event matching Soroban OrderCreated contract event", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [
          symbolToScVal("create_order"),
          addressToScVal(TOKEN),
          addressToScVal(BUYER),
          bytes32ToScVal(ORDER_ID_HEX),
        ],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal("150000000"),
          }),
          new xdr.ScMapEntry({
            key: symbolToScVal("timestamp"),
            val: xdr.ScVal.scvU64(new xdr.Uint64(BigInt("1725700000"))),
          }),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.symbol).toBe("create_order");
      expect(decoded?.fields.topic1).toBe(TOKEN);
      expect(decoded?.fields.topic2).toBe(BUYER);
      expect(decoded?.fields.topic3).toBe(ORDER_ID_HEX);
      expect(decoded?.fields.amount).toBe("150000000");
      expect(decoded?.fields.timestamp).toBe("1725700000");
    });

    it("decodes dispatch event matching Soroban OrderShipped contract event", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [
          symbolToScVal("dispatch"),
          bytes32ToScVal(ORDER_ID_HEX),
          addressToScVal(MERCHANT),
        ],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal("150000000"),
          }),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.symbol).toBe("dispatch");
      expect(decoded?.fields.topic1).toBe(ORDER_ID_HEX);
      expect(decoded?.fields.topic2).toBe(MERCHANT);
      expect(decoded?.fields.amount).toBe("150000000");
    });

    it("decodes refund event matching Soroban OrderRefunded contract event", () => {
      const indexer = new PaymentEventIndexer();
      const raw = makeRawEvent({
        topic: [
          symbolToScVal("refund"),
          bytes32ToScVal(ORDER_ID_HEX),
          addressToScVal(BUYER),
        ],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal("150000000"),
          }),
        ]),
      });

      const decoded = callDecodeEvent(indexer, raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.symbol).toBe("refund");
      expect(decoded?.fields.topic1).toBe(ORDER_ID_HEX);
      expect(decoded?.fields.topic2).toBe(BUYER);
      expect(decoded?.fields.amount).toBe("150000000");
    });
  });

  describe("End-to-end polling integration with decodeEvent", () => {
    it("filters and dispatches only watched successful contract events to onEvent", async () => {
      const receivedEvents: IndexedEvent[] = [];

      const rawUnwatched = makeRawEvent({
        id: "evt-unwatched",
        topic: [symbolToScVal("transfer"), addressToScVal(TOKEN)],
        value: xdr.ScVal.scvVoid(),
      });

      const rawFailedCall = makeRawEvent({
        id: "evt-failed",
        inSuccessfulContractCall: false,
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvVoid(),
      });

      const rawPay = makeRawEvent({
        id: "evt-pay",
        topic: [
          symbolToScVal("pay"),
          addressToScVal(TOKEN),
          addressToScVal(BUYER),
          addressToScVal(MERCHANT),
          bytes32ToScVal(ORDER_ID_HEX),
        ],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal("100000000"),
          }),
        ]),
      });

      const fakeServer = {
        getLatestLedger: vi.fn().mockResolvedValue({ sequence: 500 }),
        getEvents: vi.fn().mockResolvedValue({
          latestLedger: 500,
          cursor: "cursor-500",
          events: [rawUnwatched, rawFailedCall, rawPay],
        }),
      };

      const indexer = new PaymentEventIndexer({ pollMs: 30 });
      (indexer as unknown as { server: unknown }).server = fakeServer;

      indexer.start({
        onEvent: (e) => receivedEvents.push(e),
      });

      await new Promise((resolve) => setTimeout(resolve, 60));
      indexer.stop();

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].id).toBe("evt-pay");
      expect(receivedEvents[0].symbol).toBe("pay");
      expect(receivedEvents[0].fields.topic4).toBe(ORDER_ID_HEX);
      expect(receivedEvents[0].fields.amount).toBe("100000000");
      expect(indexer.status.eventsSeen).toBe(1);
    });
  });
});
