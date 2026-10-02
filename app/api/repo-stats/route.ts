import { NextResponse } from "next/server";
import { fetchRepoStats } from "../../../lib/repoStats";
import { verifyOnChainPayment } from "../../../lib/verifyOnChainPayment";

// One upstream call per hour keeps every visitor well inside GitHub's
// unauthenticated rate limit (60 requests/hour/IP) while still letting the
// landing page refresh without a code change.
export const revalidate = 3600;

/**
 * Serves the landing page's repository figures. `fetchRepoStats` never throws,
 * so an upstream outage comes back as `null`s with `source: "unavailable"`
 * rather than a 500 the client would have to interpret.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get("txHash");

  if (!txHash || !(await verifyOnChainPayment(txHash))) {
    return NextResponse.json(
      { error: "Unverifiable on-chain payment" },
      { status: 400 },
    );
  }

  const stats = await fetchRepoStats();

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
