import { describe, expect, it } from "vitest";
import { StrKey, xdr } from "@stellar/stellar-sdk";
import type { rpc } from "@stellar/stellar-sdk";

import { PaymentEventIndexer } from "../../../lib/stellar/indexer";

const ORDER_ID_HEX = "ab".repeat(32);

const sym = (s: string) => xdr.ScVal.scvSymbol(s);
const str = (s: string) => xdr.ScVal.scvString(s);
const u64 = (n: number) => xdr.ScVal.scvU64(new xdr.Uint64(BigInt(n)));
const hexBytes = (hex: string) => xdr.ScVal.scvBytes(Buffer.from(hex, "hex"));

function makeIndexer(
  opts: { watchedSymbols?: string[] } = {}
): PaymentEventIndexer {
  return new PaymentEventIndexer({
    // https keeps the SDK16 rpc.Server constructor happy (it rejects
    // insecure http URLs without allowHttp); no network call happens at
    // construction time.
    rpcUrl: "https://127.0.0.1:1",
    contractId: StrKey.encodeContract(Buffer.from("ef".repeat(32), "hex") as never),
    pollMs: 60_000,
    watchedSymbols: opts.watchedSymbols,
  });
}

interface Decoded {
  id: string;
  ledger: number;
  txHash: string;
  symbol: string;
  fields: Record<string, string>;
}

function decode(
  indexed: PaymentEventIndexer,
  raw: rpc.Api.EventResponse
): Decoded | null {
  const impl = indexed as unknown as {
    decodeEvent: (raw: rpc.Api.EventResponse) => Decoded | null;
  };
  return impl.decodeEvent(raw);
}

function fixture(
  overrides: Partial<rpc.Api.EventResponse> = {}
): rpc.Api.EventResponse {
  return {
    id: "evt-1",
    type: "contract",
    ledger: 123,
    ledgerClosedAt: "2024-01-01T00:00:00.000Z",
    transactionIndex: 0,
    operationIndex: 0,
    inSuccessfulContractCall: true,
    txHash: "cd".repeat(32),
    topic: [
      sym("pay"),
      str("payer"),
      str("payee"),
      sym("USDC"),
      hexBytes(ORDER_ID_HEX),
    ],
    value: xdr.ScVal.scvMap([]),
    ...overrides,
  };
}

describe("PaymentEventIndexer.decodeEvent", () => {
  it("decodes a pay-shaped event into topic1..topic4 with the 64-hex order id", () => {
    const decoded = decode(makeIndexer(), fixture());
    expect(decoded).not.toBeNull();
    expect(decoded!.symbol).toBe("pay");
    expect(decoded!.id).toBe("evt-1");
    expect(decoded!.ledger).toBe(123);
    expect(decoded!.txHash).toBe("cd".repeat(32));
    expect(decoded!.fields.topic1).toBe("payer");
    expect(decoded!.fields.topic2).toBe("payee");
    expect(decoded!.fields.topic3).toBe("USDC");
    expect(decoded!.fields.topic4).toBe(ORDER_ID_HEX);
    expect(decoded!.fields.topic4).toMatch(/^[0-9a-f]{64}$/);
  });

  it("drops events whose symbol is not in the watched list", () => {
    expect(
      decode(makeIndexer(), fixture({ topic: [sym("noop"), str("x")] }))
    ).toBeNull();
    const narrow = makeIndexer({ watchedSymbols: ["pay"] });
    expect(
      decode(narrow, fixture({ topic: [sym("dispatch"), str("x")] }))
    ).toBeNull();
  });

  it("drops events whose first topic is not a symbol", () => {
    expect(decode(makeIndexer(), fixture({ topic: [u64(7), str("x")] }))).toBeNull();
  });

  it("merges data-map entries under their key names", () => {
    const value = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: sym("amount"), val: u64(42) }),
      new xdr.ScMapEntry({ key: hexBytes("0102"), val: sym("ok") }),
    ]);
    const decoded = decode(makeIndexer(), fixture({ value }));
    expect(decoded!.fields.amount).toBe("42");
    expect(decoded!.fields["0102"]).toBe("ok");
  });

  it("joins vec data under fields.value", () => {
    const value = xdr.ScVal.scvVec([sym("a"), sym("b")]);
    const decoded = decode(makeIndexer(), fixture({ value }));
    expect(decoded!.fields.value).toBe("a,b");
  });

  it("stores scalar data under fields.value", () => {
    const decoded = decode(makeIndexer(), fixture({ value: str("hello") }));
    expect(decoded!.fields.value).toBe("hello");
  });
});
