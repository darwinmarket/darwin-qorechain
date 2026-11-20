import { NextResponse, type NextRequest } from "next/server";
import { weeklyRebalance } from "@/server/keeper";

/** Mondays 12:05 UTC (Vercel cron): curator-signed rebalances of the baskets that drifted. */
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, done: await weeklyRebalance() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 400) }, { status: 500 });
  }
}
