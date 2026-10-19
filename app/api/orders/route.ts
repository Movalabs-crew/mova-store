import { NextResponse } from "next/server";

import { createServiceRoleClient } from "../../../lib/supabase-admin";
import { verifyOnChainPayment } from "../../../lib/stellar/verify-payment";

/**
 * POST /api/orders
 *
 * Records a paid order. This is the only write path for order rows: the server
 * verifies the transaction/event against the checkout contract (see
 * `lib/stellar/verify-payment.ts`) and only then inserts the row with the
 * service-role client. The browser's anon key can no longer create an order,
 * so a client cannot record a "Paid" order that never happened.
 *
 * Body: { order: { orderId, txHash, total, ... } }
 */

export const runtime = "nodejs";

const REQUIRED = "missing_required_field";

interface ParsedOrder {
  orderId: string;
  txHash: string;
  total: number;
  order: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Validate the client payload down to the fields needed for verification. */
function parseBody(body: unknown): ParsedOrder | { error: string } {
  const root = asRecord(body);
  const order = root ? asRecord(root.order) : null;
  if (!order) return { error: "invalid_order" };

  const orderId = typeof order.orderId === "string" ? order.orderId.trim() : "";
  const txHash = typeof order.txHash === "string" ? order.txHash.trim() : "";
  if (!orderId || !txHash) return { error: REQUIRED };

  const total = typeof order.total === "number" && Number.isFinite(order.total) ? order.total : NaN;
  if (!Number.isFinite(total) || total < 0) return { error: "invalid_total" };

  if (order.items !== undefined && order.items !== null && !Array.isArray(order.items)) {
    return { error: "invalid_items" };
  }

  return { orderId, txHash, total, order };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const { orderId, txHash, total, order } = parsed;

  let verification;
  try {
    verification = await verifyOnChainPayment({ orderId, txHash });
  } catch {
    return NextResponse.json({ ok: false, error: "payment_verification_failed" }, { status: 502 });
  }

  if (!verification.verified) {
    // 402: the request is well-formed, but no verifiable payment backs it.
    return NextResponse.json(
      { ok: false, error: "payment_not_verified", reason: verification.reason },
      { status: 402 }
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    // Fail closed: without the service-role key we cannot write the row, and we
    // must not fall back to the browser/anon path.
    return NextResponse.json({ ok: false, error: "orders_store_unconfigured" }, { status: 503 });
  }

  const row = {
    order_id: orderId,
    user_id: typeof order.userId === "string" ? order.userId : null,
    user_email: typeof order.userEmail === "string" ? order.userEmail : null,
    total,
    // Only the server advances a row past 'Pending', and only after the payment
    // above has been verified.
    status: verification.order?.status ?? "Paid",
    payment_method: "stellar",
    token_symbol: typeof order.tokenSymbol === "string" ? order.tokenSymbol : null,
    token_amount: typeof order.tokenAmount === "number" ? order.tokenAmount : null,
    tx_hash: txHash,
    items: Array.isArray(order.items) ? order.items : [],
    created_at: typeof order.createdAt === "string" ? order.createdAt : new Date().toISOString(),
  };

  const { error } = await supabase.from("orders").insert([row]);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "order_persist_failed", message: error.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, order: { ...order, orderId, total, status: row.status } }, {
    status: 201,
  });
}
