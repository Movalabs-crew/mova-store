/**
 * Tests for the server-side /api/orders route (issue #491).
 *
 * Acceptance criteria:
 *   - An order cannot be recorded without a verifiable on-chain payment.
 *   - A test asserts an unverifiable order is rejected.
 *
 * Both the on-chain verification and the service-role Supabase client are
 * mocked: these tests assert the ordering and the write, never the network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyOnChainPayment = vi.hoisted(() => vi.fn());
const createServiceRoleClient = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/stellar/verify-payment", () => ({ verifyOnChainPayment }));
vi.mock("../../../lib/supabase-admin", () => ({ createServiceRoleClient }));

import { POST } from "../../../app/api/orders/route";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));

const VALID_ORDER = {
  orderId: "SS-491",
  txHash: "abc123def456",
  total: 50,
  status: "Paid",
  paymentMethod: "stellar",
  tokenSymbol: "USDC",
  tokenAmount: 50,
  userEmail: "buyer@example.com",
  createdAt: "2026-10-06T00:00:00.000Z",
  items: [{ name: "Widget", price: 25, quantity: 2 }],
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServiceRoleClient.mockReturnValue({ from });
    insert.mockResolvedValue({ data: null, error: null });
    verifyOnChainPayment.mockResolvedValue({
      verified: true,
      order: { status: "Paid" },
      ledger: 4242,
    });
  });

  it("rejects an order with no transaction hash without touching the chain or the store", async () => {
    const res = await POST(makeRequest({ order: { ...VALID_ORDER, txHash: undefined } }));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(verifyOnChainPayment).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an unverifiable on-chain payment and records nothing", async () => {
    verifyOnChainPayment.mockResolvedValueOnce({
      verified: false,
      reason: "no_payment_event",
    });

    const res = await POST(makeRequest({ order: VALID_ORDER }));

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "payment_not_verified",
      reason: "no_payment_event",
    });
    // The row is never written for a payment the chain does not confirm.
    expect(insert).not.toHaveBeenCalled();
  });

  it("records the order once the payment is verified", async () => {
    const res = await POST(makeRequest({ order: VALID_ORDER }));

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(verifyOnChainPayment).toHaveBeenCalledWith({
      orderId: "SS-491",
      txHash: "abc123def456",
    });
    expect(insert).toHaveBeenCalledTimes(1);

    const [rows] = insert.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      order_id: "SS-491",
      tx_hash: "abc123def456",
      total: 50,
      status: "Paid",
      payment_method: "stellar",
      token_symbol: "USDC",
      user_email: "buyer@example.com",
    });
  });

  it("fails closed when the service-role key is unset instead of falling back to the browser path", async () => {
    createServiceRoleClient.mockReturnValueOnce(null);

    const res = await POST(makeRequest({ order: VALID_ORDER }));

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "orders_store_unconfigured" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("reports a failed insert instead of claiming the order was recorded", async () => {
    insert.mockResolvedValueOnce({ data: null, error: { message: "duplicate key" } });

    const res = await POST(makeRequest({ order: VALID_ORDER }));

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: "order_persist_failed",
      message: "duplicate key",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(makeRequest("not-json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_json" });
  });
});
