import { describe, it, expect, vi, beforeEach } from "vitest";
import { StrKey, xdr, rpc } from "@stellar/stellar-sdk";

const CHECKOUT_CONTRACT =
  "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";
const FOREIGN_CONTRACT =
  "CABAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAFNSZ";

function makeEvent(
  contractStrKey: string,
  symbol: string,
  topics: xdr.ScVal[],
  data: xdr.ScVal
): xdr.ContractEvent {
  const rawContractId = StrKey.decodeContract(contractStrKey);
  const allTopics = [xdr.ScVal.scvSymbol(symbol), ...topics];

  return new xdr.ContractEvent({
    ext: new xdr.ExtensionPoint(0),
    contractId: rawContractId,
    type: xdr.ContractEventType.contract(),
    body: new xdr.ContractEventBody(
      0,
      new xdr.ContractEventV0({
        topics: allTopics,
        data,
      })
    ),
  });
}

function makeTxResponse(
  events: xdr.ContractEvent[]
): rpc.Api.GetSuccessfulTransactionResponse {
  return {
    status: rpc.Api.GetTransactionStatus.SUCCESS,
    txHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ledger: 12345,
    createdAt: 1700000000,
    applicationOrder: 1,
    feeBump: false,
    envelopeXdr: {} as any,
    resultXdr: {} as any,
    resultMetaXdr: {} as any,
    events: {
      contractEventsXdr: [events],
    } as any,
  };
}

describe("decodePaymentEvent", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", CHECKOUT_CONTRACT);
  });

  it("ignores a foreign-contract 'pay' event and decodes the checkout-contract one", async () => {
    // Dynamically re-import so config reflects the stubbed env
    const { decodePaymentEvent } = await import("../../../lib/stellar/events");

    const foreignEvent = makeEvent(
      FOREIGN_CONTRACT,
      "pay",
      [
        xdr.ScVal.scvString("USDC"),
        xdr.ScVal.scvString("foreign_buyer"),
        xdr.ScVal.scvString("foreign_merchant"),
        xdr.ScVal.scvString("foreign_order"),
      ],
      xdr.ScVal.scvString("999999")
    );

    const checkoutEvent = makeEvent(
      CHECKOUT_CONTRACT,
      "pay",
      [
        xdr.ScVal.scvString("USDC"),
        xdr.ScVal.scvString("checkout_buyer"),
        xdr.ScVal.scvString("checkout_merchant"),
        xdr.ScVal.scvString("order_456"),
      ],
      xdr.ScVal.scvString("5000000")
    );

    const tx = makeTxResponse([foreignEvent, checkoutEvent]);
    const receipt = decodePaymentEvent(tx);

    expect(receipt).not.toBeNull();
    expect(receipt?.contractId).toBe(CHECKOUT_CONTRACT);
    expect(receipt?.buyer).toBe("checkout_buyer");
    expect(receipt?.merchant).toBe("checkout_merchant");
    expect(receipt?.orderId).toBe("order_456");
    expect(receipt?.token).toBe("USDC");
    expect(receipt?.amount).toBe("5000000");
    expect(receipt?.txHash).toBe(tx.txHash);
    expect(receipt?.ledger).toBe(tx.ledger);
  });

  it("returns null if only foreign contract 'pay' events are present", async () => {
    const { decodePaymentEvent } = await import("../../../lib/stellar/events");

    const foreignEvent = makeEvent(
      FOREIGN_CONTRACT,
      "pay",
      [
        xdr.ScVal.scvString("USDC"),
        xdr.ScVal.scvString("foreign_buyer"),
        xdr.ScVal.scvString("foreign_merchant"),
        xdr.ScVal.scvString("foreign_order"),
      ],
      xdr.ScVal.scvString("999999")
    );

    const tx = makeTxResponse([foreignEvent]);
    const receipt = decodePaymentEvent(tx);

    expect(receipt).toBeNull();
  });

  it("decodes checkout payment event when map data is emitted", async () => {
    const { decodePaymentEvent } = await import("../../../lib/stellar/events");

    const mapEntry = new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount"),
      val: xdr.ScVal.scvString("7500000"),
    });
    const mapData = xdr.ScVal.scvMap([mapEntry]);

    const checkoutEvent = makeEvent(
      CHECKOUT_CONTRACT,
      "pay",
      [
        xdr.ScVal.scvString("USDC"),
        xdr.ScVal.scvString("map_buyer"),
        xdr.ScVal.scvString("map_merchant"),
        xdr.ScVal.scvString("order_789"),
      ],
      mapData
    );

    const tx = makeTxResponse([checkoutEvent]);
    const receipt = decodePaymentEvent(tx);

    expect(receipt).not.toBeNull();
    expect(receipt?.contractId).toBe(CHECKOUT_CONTRACT);
    expect(receipt?.amount).toBe("7500000");
  });

  it("returns null when no events match 'pay' symbol", async () => {
    const { decodePaymentEvent } = await import("../../../lib/stellar/events");

    const otherEvent = makeEvent(
      CHECKOUT_CONTRACT,
      "transfer",
      [xdr.ScVal.scvString("USDC")],
      xdr.ScVal.scvString("100")
    );

    const tx = makeTxResponse([otherEvent]);
    const receipt = decodePaymentEvent(tx);

    expect(receipt).toBeNull();
  });

  it("returns null when transaction has no events", async () => {
    const { decodePaymentEvent } = await import("../../../lib/stellar/events");

    const tx = makeTxResponse([]);
    const receipt = decodePaymentEvent(tx);
    expect(receipt).toBeNull();
  });
});
