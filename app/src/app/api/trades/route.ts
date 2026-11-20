import { NextResponse, type NextRequest } from "next/server";
import { readTrades } from "@/lib/qore/trades";

const UPSTREAM = process.env.QORE_REST_UPSTREAM ?? "https://api-testnet.qore.host";

/**
 * GET /api/trades?account=qor1… — the account's Darwin trades, summarised server-side: a few kB
 * instead of the megabytes of raw tx search results the browser used to download.
 */
export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account") ?? "";
  if (!/^qor1[02-9ac-hj-np-z]{38}$/.test(account)) return NextResponse.json({ error: "account" }, { status: 400 });
  const trades = await readTrades(UPSTREAM, account);
  return NextResponse.json(trades, { headers: { "cache-control": "private, max-age=5" } });
}
