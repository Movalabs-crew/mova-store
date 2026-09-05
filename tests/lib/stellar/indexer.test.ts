import { Address, rpc, xdr } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

const TOKEN_ADDR = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const BUYER_ADDR = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ORDER_ID_HEX = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

function makeRawEvent(overrides: Partial<rpc.Api.EventResponse> = {}): rpc.Api.EventResponse {
  return {
    id: "0000000001-0000000001",
    type: "contract",
    ledger: 100,
    ledgerClosedAt: "2026-09-04T20:00:00Z",
    contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM" as any,
    pagingToken: "0000000001-0000000001",
    inSuccessfulContractCall: true,
    txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    topic: [xdr.ScVal.scvSymbol("pay")],
    value: xdr.ScVal.scvVoid(),
    ...overrides,
  };
}

describe("PaymentEventIndexer.decodeEvent", () => {
  const indexer = new PaymentEventIndexer();

  it("returns null when topic is empty", () => {
    const raw = makeRawEvent({ topic: [] });
    expect(indexer.decodeEvent(raw)).toBeNull();
  });

  it("returns null when topic[0] is not an ScVal symbol", () => {
    const raw = makeRawEvent({ topic: [xdr.ScVal.scvU32(42)] });
    expect(indexer.decodeEvent(raw)).toBeNull();
  });

  it("returns null when symbol is not in watchedSymbols", () => {
    const raw = makeRawEvent({ topic: [xdr.ScVal.scvSymbol("unwatched_event")] });
    expect(indexer.decodeEvent(raw)).toBeNull();
  });

  it("respects custom watchedSymbols option", () => {
    const customIndexer = new PaymentEventIndexer({
      watchedSymbols: ["custom_event"],
    });

    const standardRaw = makeRawEvent({ topic: [xdr.ScVal.scvSymbol("pay")] });
    expect(customIndexer.decodeEvent(standardRaw)).toBeNull();

    const customRaw = makeRawEvent({
      topic: [xdr.ScVal.scvSymbol("custom_event")],
    });
    const decoded = customIndexer.decodeEvent(customRaw);
    expect(decoded).not.toBeNull();
    expect(decoded?.symbol).toBe("custom_event");
  });

  it("decodes pay-shaped fixture and exposes topic4 as 64-hex order id for StellarOrderWatch", () => {
    const orderBytes = Buffer.from(ORDER_ID_HEX, "hex");
    const raw = makeRawEvent({
      topic: [
        xdr.ScVal.scvSymbol("pay"),
        new Address(TOKEN_ADDR).toScVal(),
        new Address(BUYER_ADDR).toScVal(),
        xdr.ScVal.scvString("cart-order-12345"),
        xdr.ScVal.scvBytes(orderBytes),
      ],
      value: xdr.ScVal.scvU64(new xdr.Uint64(BigInt(50000000))),
    });

    const decoded = indexer.decodeEvent(raw);
    expect(decoded).not.toBeNull();
    expect(decoded?.symbol).toBe("pay");
    expect(decoded?.fields.topic1).toBe(TOKEN_ADDR);
    expect(decoded?.fields.topic2).toBe(BUYER_ADDR);
    expect(decoded?.fields.topic3).toBe("cart-order-12345");
    expect(decoded?.fields.topic4).toBe(ORDER_ID_HEX);
    expect(decoded?.fields.value).toBe("50000000");
  });

  it("merges map data entries under their key names", () => {
    const mapVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("order_id"),
        val: xdr.ScVal.scvString("ORD-999"),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("amount"),
        val: xdr.ScVal.scvString("100"),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvString("status"),
        val: xdr.ScVal.scvString("completed"),
      }),
    ]);

    const raw = makeRawEvent({
      topic: [xdr.ScVal.scvSymbol("create_order"), xdr.ScVal.scvString("sub_id")],
      value: mapVal,
    });

    const decoded = indexer.decodeEvent(raw);
    expect(decoded).not.toBeNull();
    expect(decoded?.symbol).toBe("create_order");
    expect(decoded?.fields.topic1).toBe("sub_id");
    expect(decoded?.fields.order_id).toBe("ORD-999");
    expect(decoded?.fields.amount).toBe("100");
    expect(decoded?.fields.status).toBe("completed");
  });

  it("joins vec data entries with commas under fields.value", () => {
    const vecVal = xdr.ScVal.scvVec([
      xdr.ScVal.scvString("item1"),
      xdr.ScVal.scvString("item2"),
      xdr.ScVal.scvString("item3"),
    ]);

    const raw = makeRawEvent({
      topic: [xdr.ScVal.scvSymbol("dispatch")],
      value: vecVal,
    });

    const decoded = indexer.decodeEvent(raw);
    expect(decoded).not.toBeNull();
    expect(decoded?.symbol).toBe("dispatch");
    expect(decoded?.fields.value).toBe("item1,item2,item3");
  });

  it("handles empty vec data gracefully", () => {
    const vecVal = xdr.ScVal.scvVec([]);

    const raw = makeRawEvent({
      topic: [xdr.ScVal.scvSymbol("refund")],
      value: vecVal,
    });

    const decoded = indexer.decodeEvent(raw);
    expect(decoded).not.toBeNull();
    expect(decoded?.fields.value).toBe("");
  });

  it("decodes scalar value directly under fields.value", () => {
    const raw = makeRawEvent({
      topic: [xdr.ScVal.scvSymbol("refund")],
      value: xdr.ScVal.scvString("refund_reason_user_cancel"),
    });

    const decoded = indexer.decodeEvent(raw);
    expect(decoded).not.toBeNull();
    expect(decoded?.fields.value).toBe("refund_reason_user_cancel");
  });

  it("preserves event metadata fields accurately", () => {
    const raw = makeRawEvent({
      id: "ev-12345",
      ledger: 4242,
      ledgerClosedAt: "2026-09-04T22:30:00Z",
      txHash: "abcdef123456",
      contractId: "CCONTRACT123" as any,
      topic: [xdr.ScVal.scvSymbol("pay")],
    });

    const decoded = indexer.decodeEvent(raw);
    expect(decoded).toEqual({
      id: "ev-12345",
      ledger: 4242,
      ledgerClosedAt: "2026-09-04T22:30:00Z",
      txHash: "abcdef123456",
      contractId: "CCONTRACT123",
      symbol: "pay",
      topics: raw.topic,
      fields: {
        value: "null",
      },
    });
  });
});
