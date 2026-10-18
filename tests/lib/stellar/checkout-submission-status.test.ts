import { describe, expect, it, vi } from "vitest";
import { Account, Networks, TransactionBuilder, rpc } from "@stellar/stellar-sdk";

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

import * as freighterMod from "../../../lib/stellar/freighter";
import * as accountMod from "../../../lib/stellar/account";
import * as simulateMod from "../../../lib/stellar/simulate";
import * as eventsMod from "../../../lib/stellar/events";
import * as configMod from "../../../lib/stellar/config";
import { orderIdHash, payWithStellar } from "../../../lib/stellar/checkout";

/**
 * How `payWithStellar` treats the statuses `sendTransaction` can return.
 *
 * A submission is only retryable while the network has *not* accepted the
 * transaction: `TRY_AGAIN_LATER` must surface as a retryable error and must
 * never be polled for a hash that was never issued, while `DUPLICATE` means the
 * network already has the transaction, so the hash it returns is exactly the
 * one to confirm.
 */
describe("payWithStellar submission status handling (Issue #535)", () => {
  const PUBLIC_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const TX_HASH = "abc123mocktxhash";
  const ORDER_ID = "ORD-SUBMIT-STATUS";
  const account = new Account(PUBLIC_KEY, "100");

  const buildDummyTx = () =>
    new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
      .setTimeout(0)
      .build();

  /**
   * Everything up to `sendTransaction`, so each test only has to describe the
   * submission response it is about.
   */
  function mockFlowUpToSubmission() {
    const tx = buildDummyTx();
    const xdrString = tx.toXDR();

    vi.spyOn(freighterMod, "ensureNetwork").mockResolvedValue();
    vi.spyOn(accountMod, "assertPaymentReady").mockResolvedValue({
      account,
      funded: true,
      nativeBalanceRaw: 50_000_000n,
      tokenBalanceRaw: 100_000_000n,
      decimals: 7,
      hasTrustline: true,
      trustlineAuthorized: true,
      requiredRaw: 10_000_000n,
      sufficientBalance: true,
      sufficientReserve: true,
      issues: [],
    });
    vi.spyOn(simulateMod, "prepareAndReport").mockResolvedValue({
      tx,
      report: { ok: true, minResourceFee: 1200n, instructions: 5000 },
    });
    vi.spyOn(simulateMod, "budgetFee").mockResolvedValue("51200");
    vi.spyOn(freighterMod, "signWithFreighter").mockResolvedValue(xdrString);
    vi.spyOn(eventsMod, "waitForTransaction").mockResolvedValue({
      status: rpc.Api.GetTransactionStatus.SUCCESS,
      ledger: 456,
      txHash: TX_HASH,
    } as never);
    // A receipt that describes the payment that was requested, so this suite
    // only fails on submission-status behaviour.
    vi.spyOn(eventsMod, "decodePaymentEvent").mockReturnValue({
      txHash: TX_HASH,
      ledger: 456,
      amount: "10000000",
      buyer: PUBLIC_KEY,
      orderId: "",
      token: configMod.defaultToken().contractId,
    } as never);

    return { tx, xdrString };
  }

  async function matchingOrderId(): Promise<string> {
    return orderIdHash(ORDER_ID);
  }

  it("polls the hash a DUPLICATE submission returns", async () => {
    mockFlowUpToSubmission();
    vi.spyOn(eventsMod, "decodePaymentEvent").mockReturnValue({
      txHash: TX_HASH,
      ledger: 456,
      amount: "10000000",
      buyer: PUBLIC_KEY,
      orderId: await matchingOrderId(),
      token: configMod.defaultToken().contractId,
    } as never);

    const sendSpy = vi
      .spyOn(rpc.Server.prototype, "sendTransaction")
      .mockResolvedValue({ status: "DUPLICATE", hash: TX_HASH } as never);
    const waitSpy = vi.spyOn(eventsMod, "waitForTransaction");
    const statuses: string[] = [];

    const result = await payWithStellar({
      amountUsd: 1,
      orderId: ORDER_ID,
      publicKey: PUBLIC_KEY,
      onStatus: (s) => statuses.push(s),
    });

    // The network already had this transaction, so its hash is the one to
    // confirm - never `undefined`.
    expect(waitSpy).toHaveBeenCalledWith(TX_HASH);
    expect(result.hash).toBe(TX_HASH);
    expect(statuses).toContain("Confirming transaction…");

    sendSpy.mockRestore();
    waitSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("does not poll when a TRY_AGAIN_LATER submission still reports a hash", async () => {
    mockFlowUpToSubmission();

    const sendSpy = vi
      .spyOn(rpc.Server.prototype, "sendTransaction")
      .mockResolvedValue({ status: "TRY_AGAIN_LATER", hash: TX_HASH } as never);
    const waitSpy = vi.spyOn(eventsMod, "waitForTransaction");

    await expect(
      payWithStellar({
        amountUsd: 1,
        orderId: ORDER_ID,
        publicKey: PUBLIC_KEY,
      })
    ).rejects.toMatchObject({
      code: "TX_TRY_AGAIN_LATER",
      message: expect.stringContaining("retry"),
    });

    // A retryable submission was not accepted, so its hash proves nothing and
    // must not be confirmed.
    expect(waitSpy).not.toHaveBeenCalled();

    sendSpy.mockRestore();
    waitSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("keeps the retryable error code stable for callers that match on it", async () => {
    mockFlowUpToSubmission();
    vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
      status: "TRY_AGAIN_LATER",
      hash: undefined,
    } as never);

    let caught: unknown;
    try {
      await payWithStellar({ amountUsd: 1, orderId: ORDER_ID, publicKey: PUBLIC_KEY });
    } catch (err) {
      caught = err;
    }

    expect((caught as { code?: string }).code).toBe("TX_TRY_AGAIN_LATER");
    vi.restoreAllMocks();
  });
});
