import { describe, it, expect } from "vitest";
import { decodePaymentEvent, PaymentReceipt } from "../lib/stellar/events";
import { xdr, rpc } from "@stellar/stellar-sdk";

describe("Payment Event Decoding (__tests__/events.test.ts)", () => {
  it("returns null when transaction has no contract events", () => {
    const mockTx = {
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      txHash: "0x123abc456def",
      ledger: 1000,
      events: {
        contractEventsXdr: [],
      },
    } as unknown as rpc.Api.GetSuccessfulTransactionResponse;

    const receipt = decodePaymentEvent(mockTx);
    expect(receipt).toBeNull();
  });

  it("decodes a valid 'pay' event with topics and map data", () => {
    const topics = [
      xdr.ScVal.scvSymbol("pay"),
      xdr.ScVal.scvString("CBTOKEN123"),
      xdr.ScVal.scvString("GABUYER456"),
      xdr.ScVal.scvString("GAMERCHANT789"),
      xdr.ScVal.scvString("order-hex-001"),
    ];

    const dataMap = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("amount"),
        val: xdr.ScVal.scvString("50000000"),
      }),
    ]);

    const v0 = new xdr.ContractEventV0({
      topics,
      data: dataMap,
    });

    const event = new xdr.ContractEvent({
      ext: new xdr.ExtensionPoint(0),
      contractId: null,
      type: xdr.ContractEventType.contract(),
      body: xdr.ContractEventBody.v0(v0),
    });

    const mockTx = {
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      txHash: "0xpaytx999",
      ledger: 1050,
      events: {
        contractEventsXdr: [[event]],
      },
    } as unknown as rpc.Api.GetSuccessfulTransactionResponse;

    const receipt = decodePaymentEvent(mockTx);
    expect(receipt).not.toBeNull();
    expect(receipt?.txHash).toBe("0xpaytx999");
    expect(receipt?.ledger).toBe(1050);
    expect(receipt?.token).toBe("CBTOKEN123");
    expect(receipt?.buyer).toBe("GABUYER456");
    expect(receipt?.merchant).toBe("GAMERCHANT789");
    expect(receipt?.orderId).toBe("order-hex-001");
    expect(receipt?.amount).toBe("50000000");
  });

  it("ignores non-'pay' events such as 'transfer' or 'mint'", () => {
    const topics = [
      xdr.ScVal.scvSymbol("transfer"),
      xdr.ScVal.scvString("from"),
      xdr.ScVal.scvString("to"),
    ];

    const v0 = new xdr.ContractEventV0({
      topics,
      data: xdr.ScVal.scvString("100"),
    });

    const event = new xdr.ContractEvent({
      ext: new xdr.ExtensionPoint(0),
      contractId: null,
      type: xdr.ContractEventType.contract(),
      body: xdr.ContractEventBody.v0(v0),
    });

    const mockTx = {
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      txHash: "0xtransfertx",
      ledger: 1051,
      events: {
        contractEventsXdr: [[event]],
      },
    } as unknown as rpc.Api.GetSuccessfulTransactionResponse;

    const receipt = decodePaymentEvent(mockTx);
    expect(receipt).toBeNull();
  });
});
