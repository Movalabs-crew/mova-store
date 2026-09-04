import { describe, it, expect } from "vitest";
import { Contract, rpc, xdr } from "@stellar/stellar-sdk";
import { PaymentEventIndexer } from "../../../lib/stellar/indexer";
import { bytes32ToScVal, i128ToScVal, symbolToScVal } from "../../../lib/stellar/scval";

function createEventFixture(overrides: Partial<rpc.Api.EventResponse> = {}): rpc.Api.EventResponse {
  return {
    id: "0000000001-0000000001",
    type: "contract",
    ledger: 123456,
    ledgerClosedAt: "2026-09-04T00:00:00Z",
    transactionIndex: 1,
    operationIndex: 0,
    inSuccessfulContractCall: true,
    txHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    contractId: new Contract("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"),
    topic: [symbolToScVal("pay")],
    value: xdr.ScVal.scvVoid(),
    ...overrides,
  };
}

describe("PaymentEventIndexer.decodeEvent", () => {
  describe("Symbol extraction and topic validation", () => {
    it("returns null when the topic array is empty", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({ topic: [] });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).toBeNull();
    });

    it("returns null when the first topic is not an ScVal symbol", () => {
      const indexer = new PaymentEventIndexer();
      const nonSymbolTopics = [
        xdr.ScVal.scvU32(42),
        xdr.ScVal.scvI32(100),
        xdr.ScVal.scvString("pay"),
        xdr.ScVal.scvBool(true),
        xdr.ScVal.scvVoid(),
      ];

      for (const topic of nonSymbolTopics) {
        const raw = createEventFixture({ topic: [topic] });
        expect(indexer.decodeEvent(raw)).toBeNull();
      }
    });

    it("extracts the symbol correctly when topic[0] is an ScVal symbol", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        topic: [symbolToScVal("pay")],
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.symbol).toBe("pay");
    });
  });

  describe("watchedSymbols filter", () => {
    it("accepts default watched symbols", () => {
      const indexer = new PaymentEventIndexer();
      const watched = ["pay", "create_order", "dispatch", "refund"];

      for (const symbol of watched) {
        const raw = createEventFixture({
          topic: [symbolToScVal(symbol)],
        });
        const decoded = indexer.decodeEvent(raw);
        expect(decoded).not.toBeNull();
        expect(decoded?.symbol).toBe(symbol);
      }
    });

    it("drops events with unwatched symbols", () => {
      const indexer = new PaymentEventIndexer();
      const unwatched = ["transfer", "mint", "burn", "unknown_event"];

      for (const symbol of unwatched) {
        const raw = createEventFixture({
          topic: [symbolToScVal(symbol)],
        });
        expect(indexer.decodeEvent(raw)).toBeNull();
      }
    });

    it("respects custom watchedSymbols passed to indexer constructor", () => {
      const customIndexer = new PaymentEventIndexer({
        watchedSymbols: ["custom_event", "notify"],
      });

      const rawCustom = createEventFixture({
        topic: [symbolToScVal("custom_event")],
      });
      const decodedCustom = customIndexer.decodeEvent(rawCustom);
      expect(decodedCustom).not.toBeNull();
      expect(decodedCustom?.symbol).toBe("custom_event");

      const rawDefault = createEventFixture({
        topic: [symbolToScVal("pay")],
      });
      expect(customIndexer.decodeEvent(rawDefault)).toBeNull();
    });
  });

  describe("Topic ordering (topic1..topicN)", () => {
    it("produces an empty fields record when no additional topics are present", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        topic: [symbolToScVal("pay")],
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.topic1).toBeUndefined();
    });

    it("maps subsequent topics to 1-based topic names in sequential order", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        topic: [
          symbolToScVal("pay"),
          xdr.ScVal.scvString("first_extra"),
          xdr.ScVal.scvU32(100),
          symbolToScVal("third_extra"),
        ],
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.topic1).toBe("first_extra");
      expect(decoded?.fields.topic2).toBe("100");
      expect(decoded?.fields.topic3).toBe("third_extra");
      expect(decoded?.fields.topic4).toBeUndefined();
    });
  });

  describe("Data shape branches", () => {
    it("merges map entries under their key names", () => {
      const indexer = new PaymentEventIndexer();
      const mapEntries = [
        new xdr.ScMapEntry({
          key: symbolToScVal("order_status"),
          val: xdr.ScVal.scvString("confirmed"),
        }),
        new xdr.ScMapEntry({
          key: symbolToScVal("item_count"),
          val: xdr.ScVal.scvU32(5),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString("non_symbol_key"),
          val: xdr.ScVal.scvString("value_for_non_symbol"),
        }),
      ];

      const raw = createEventFixture({
        topic: [symbolToScVal("pay"), xdr.ScVal.scvString("extra_topic")],
        value: xdr.ScVal.scvMap(mapEntries),
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.topic1).toBe("extra_topic");
      expect(decoded?.fields.order_status).toBe("confirmed");
      expect(decoded?.fields.item_count).toBe("5");
      expect(decoded?.fields.non_symbol_key).toBe("value_for_non_symbol");
    });

    it("handles an empty map cleanly", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvMap([]),
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(Object.keys(decoded?.fields ?? {})).toEqual([]);
    });

    it("joins vector elements under fields.value separated by commas", () => {
      const indexer = new PaymentEventIndexer();
      const vecItems = [symbolToScVal("alpha"), symbolToScVal("beta"), xdr.ScVal.scvU32(99)];

      const raw = createEventFixture({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvVec(vecItems),
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.value).toBe("alpha,beta,99");
    });

    it("sets fields.value to empty string for an empty vector", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvVec([]),
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.value).toBe("");
    });

    it("sets scalar data directly under fields.value for numeric types", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        topic: [symbolToScVal("pay")],
        value: i128ToScVal(9876543210123456789n),
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.fields.value).toBe("9876543210123456789");
    });

    it("sets scalar data directly under fields.value for string and boolean types", () => {
      const indexer = new PaymentEventIndexer();

      const rawString = createEventFixture({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvString("hello_world"),
      });
      const decodedString = indexer.decodeEvent(rawString);
      expect(decodedString?.fields.value).toBe("hello_world");

      const rawBool = createEventFixture({
        topic: [symbolToScVal("pay")],
        value: xdr.ScVal.scvBool(false),
      });
      const decodedBool = indexer.decodeEvent(rawBool);
      expect(decodedBool?.fields.value).toBe("false");
    });
  });

  describe("Pay-shaped fixture (regression guard for StellarOrderWatch.jsx)", () => {
    it("exposes topic4 as the 64-hex order id matching StellarOrderWatch.jsx expectations", () => {
      const indexer = new PaymentEventIndexer();
      const orderHex = "d3b07384d113edec49eaa6238ad5ff0000000000000000000000000000000001";
      const tokenAddressStr = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
      const buyerAddressStr = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      const merchantAddressStr = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

      const raw = createEventFixture({
        topic: [
          symbolToScVal("pay"),
          xdr.ScVal.scvString(tokenAddressStr),
          xdr.ScVal.scvString(buyerAddressStr),
          xdr.ScVal.scvString(merchantAddressStr),
          bytes32ToScVal(orderHex),
        ],
        value: xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: symbolToScVal("amount"),
            val: i128ToScVal(50000000),
          }),
        ]),
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).not.toBeNull();
      expect(decoded?.symbol).toBe("pay");
      expect(decoded?.fields.topic1).toBe(tokenAddressStr);
      expect(decoded?.fields.topic2).toBe(buyerAddressStr);
      expect(decoded?.fields.topic3).toBe(merchantAddressStr);
      expect(decoded?.fields.topic4).toBe(orderHex);
      expect(decoded?.fields.topic4).toHaveLength(64);
      expect(decoded?.fields.amount).toBe("50000000");

      const consumerExtracted = (decoded?.fields.topic4 || "").toLowerCase();
      expect(consumerExtracted).toBe(orderHex);
    });
  });

  describe("Event metadata propagation", () => {
    it("preserves event envelope fields in the returned IndexedEvent", () => {
      const indexer = new PaymentEventIndexer();
      const contract = new Contract("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
      const topics = [symbolToScVal("refund")];

      const raw = createEventFixture({
        id: "evt-999",
        ledger: 789012,
        ledgerClosedAt: "2026-09-04T12:34:56Z",
        txHash: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        contractId: contract,
        topic: topics,
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded).toEqual({
        id: "evt-999",
        ledger: 789012,
        ledgerClosedAt: "2026-09-04T12:34:56Z",
        txHash: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        symbol: "refund",
        topics,
        fields: {
          value: "null",
        },
      });
    });

    it("handles undefined contractId gracefully", () => {
      const indexer = new PaymentEventIndexer();
      const raw = createEventFixture({
        contractId: undefined,
        topic: [symbolToScVal("dispatch")],
      });

      const decoded = indexer.decodeEvent(raw);
      expect(decoded?.contractId).toBeUndefined();
    });
  });
});
