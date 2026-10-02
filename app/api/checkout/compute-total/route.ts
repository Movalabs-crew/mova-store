import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "../../../../lib/products";
import { verifyOnChainPayment } from "../../../../lib/payments/verify-onchain";
import { createOrder } from "../../../../lib/orders";

/**
 * POST /api/checkout/compute-total
 *
 * Body: { items: Array<{ id: string | number; quantity?: number }> }
 *
 * Returns: { total: number } where `total` is recomputed server-side from
 * current database prices.  The client MUST use this value as the authoritative
 * amount — it must never trust a price that came from localStorage or any other
 * client-controlled source.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).items)
  ) {
    return NextResponse.json(
      { error: "Request body must be { items: Array<{ id, quantity? }> }" },
      { status: 400 }
    );
  }

  const items = (body as { items: unknown[] }).items;

  // Validate each entry
  for (const item of items) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      (typeof (item as Record<string, unknown>).id !== "string" &&
        typeof (item as Record<string, unknown>).id !== "number")
    ) {
      return NextResponse.json(
        { error: "Each item must have a string or number `id`" },
        { status: 400 }
      );
    }
  }

  try {
    let total = 0;

    await Promise.all(
      items.map(async (raw) => {
        const item = raw as { id: string | number; quantity?: unknown };
        const product = await getProductById(String(item.id));
        if (!product) return; // unknown product id — silently skip

        const qty =
          typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0
            ? Math.floor(item.quantity)
            : 1;

        // Accumulate with a floating-point safe approach
        total += product.price * qty;
      })
    );

    // Round to 2 decimal places to avoid floating-point drift
    total = Math.round(total * 100) / 100;

    // The chain is the source of truth for payment state.  Before we record
    // anything, verify that a matching on-chain payment exists for this
    // checkout against the configured checkout contract.  A client can no
    // longer fabricate a "Paid" order without a verifiable transaction.
    const txHash = (body as Record<string, unknown>).txHash;
    if (typeof txHash !== "string" || txHash.length === 0) {
      return NextResponse.json(
        { error: "Missing on-chain transaction hash" },
        { status: 400 }
      );
    }

    const verification = await verifyOnChainPayment({
      txHash,
      expectedTotal: total,
    });

    if (!verification.ok) {
      return NextResponse.json(
        { error: "Unverifiable on-chain payment", reason: verification.reason },
        { status: 402 }
      );
    }

    const order = await createOrder({
      items,
      total,
      txHash,
      paidAt: verification.paidAt,
    });

    return NextResponse.json({ total, order });
  } catch (err) {
    console.error("[compute-total] error:", err);
    return NextResponse.json({ error: "Failed to compute total" }, { status: 500 });
  }
}
