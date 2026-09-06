import { StrKey, xdr, Address, rpc } from "@stellar/stellar-sdk";
import { describe, expect, it, vi } from "vitest";

import { decodePaymentEvent, waitForTransaction } from "../../../lib/stellar/events";
import { i128ToScVal } from "../../../lib/stellar/scval";

// ---------------------------------------------------------------------------
// Fixture builders for GetSuccessfulTransactionResponse-shaped objects.
// decodePaymentEvent is pure over these — no RPC access needed.
// ---------------------------------------------------------------------------

const CONTRACT_ID = StrKey.decodeContract(
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
);
const TOKEN = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const BUYER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const MERCHANT = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ORDER_ID_HEX =
  "a1" + "b2".repeat(31); // 64 hex chars == 32 bytes
const TX_HASH = "0123456789abcdef".repeat(4);
const LEDGER = 4242;

const ext = () => new xdr.ExtensionPoint(0);

function makeEvent(
  topics: xdr.ScVal[],
  data: xdr.ScVal,
  contractId: Uint8Array | null = CONTRACT_ID
): xdr.ContractEvent {
  return new xdr.ContractEvent({
    ext: ext(),
    contractId,
    type: xdr.ContractEventType.contract(),
    body: new xdr.ContractEventBody(
      0,
      new xdr.ContractEventV0({ topics, data })
    ),
  });
}

function makeTx(events: xdr.ContractEvent[]): unknown {
  return {
    txHash: TX_HASH,
    ledger: LEDGER,
    // stellar-sdk >= 16 hands back decoded objects in a nested array
    events: { contractEventsXdr: [events] },
  };
}

const addressScVal = (strkey: string) =>
  xdr.ScVal.scvAddress(new Address(strkey).toScVal().address());

const payTopics = () => [
  xdr.ScVal.scvSymbol("pay"),
  addressScVal(TOKEN),
  addressScVal(BUYER),
  addressScVal(MERCHANT),
  xdr.ScVal.scvBytes(Buffer.from(ORDER_ID_HEX, "hex")),
];

const amountMap = (amount: bigint) =>
  xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount"),
      val: i128ToScVal(amount),
    }),
  ]);

describe("decodePaymentEvent", () => {
  it("decodes a full pay event (topics + amount map + contract id)", () => {
    const tx = makeTx([makeEvent(payTopics(), amountMap(123_400_000n))]);
    const receipt = decodePaymentEvent(
      tx as never
    );
    expect(receipt).not.toBeNull();
    expect(receipt?.txHash).toBe(TX_HASH);
    expect(receipt?.ledger).toBe(LEDGER);
    expect(receipt?.contractId).toBe(StrKey.encodeContract(CONTRACT_ID));
    expect(receipt?.token).toBe(TOKEN);
    expect(receipt?.buyer).toBe(BUYER);
    expect(receipt?.merchant).toBe(MERCHANT);
    // the 32-byte order id topic comes back as a 64-char hex string
    expect(receipt?.orderId).toBe(ORDER_ID_HEX);
    expect(receipt?.amount).toBe("123400000");
  });

  it("skips events whose first topic is not the 'pay' symbol", () => {
    const transferEvent = makeEvent(
      [xdr.ScVal.scvSymbol("transfer"), addressScVal(TOKEN)],
      amountMap(1n)
    );
    expect(decodePaymentEvent(makeTx([transferEvent]) as never)).toBeNull();
  });

  it("skips events whose first topic is a string instead of a symbol", () => {
    const event = makeEvent([xdr.ScVal.scvString("pay")], amountMap(1n));
    expect(decodePaymentEvent(makeTx([event]) as never)).toBeNull();
  });

  it("tolerates fewer than five topics (only fills the slots present)", () => {
    const event = makeEvent(
      [xdr.ScVal.scvSymbol("pay"), addressScVal(TOKEN)],
      amountMap(5n),
      null // no contract id -> system-style event
    );
    const receipt = decodePaymentEvent(makeTx([event]) as never);
    expect(receipt).not.toBeNull();
    expect(receipt?.token).toBe(TOKEN);
    expect(receipt?.buyer).toBeUndefined();
    expect(receipt?.merchant).toBeUndefined();
    expect(receipt?.orderId).toBeUndefined();
    expect(receipt?.amount).toBe("5");
    expect(receipt?.contractId).toBeUndefined();
  });

  it("returns null when no pay event exists in the transaction", () => {
    expect(decodePaymentEvent(makeTx([]) as never)).toBeNull();
    expect(
      decodePaymentEvent(
        {
          txHash: TX_HASH,
          ledger: LEDGER,
          events: undefined,
        } as never
      )
    ).toBeNull();
  });

  it("decodes a non-map data ScVal with the generic scValToString path", () => {
    const event = makeEvent(payTopics(), xdr.ScVal.scvString("42"));
    const receipt = decodePaymentEvent(makeTx([event]) as never);
    expect(receipt?.amount).toBe("42");
  });

  it("decodes from a base64 XDR round-trip of the event (what getTransaction returns)", () => {
    const ev = makeEvent(payTopics(), amountMap(99n));
    const fromWire = xdr.ContractEvent.fromXDR(ev.toXDR("base64"), "base64");
    const receipt = decodePaymentEvent(makeTx([fromWire]) as never);
    expect(receipt?.orderId).toBe(ORDER_ID_HEX);
    expect(receipt?.amount).toBe("99");
  });
});

describe("waitForTransaction", () => {
  it("resolves immediately when status is SUCCESS", async () => {
    const mockTx = {
      status: "SUCCESS",
      ledger: 100,
      txHash: TX_HASH,
    };
    const spy = vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(mockTx as never);

    const res = await waitForTransaction(TX_HASH);
    expect(res).toBe(mockTx);
    spy.mockRestore();
  });

  it("throws error when transaction status is FAILED", async () => {
    const mockTx = {
      status: "FAILED",
      ledger: 101,
      txHash: TX_HASH,
    };
    const spy = vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue(mockTx as never);

    await expect(waitForTransaction(TX_HASH)).rejects.toThrow("Transaction failed on ledger 101");
    spy.mockRestore();
  });
});
