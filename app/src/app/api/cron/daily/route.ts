import { NextResponse, type NextRequest } from "next/server";
import { daily } from "@/server/keeper";
import { settleDeposits, settleWithdrawals } from "@/server/accounts";

/** Daily safety net (Vercel cron): one signed price round, relayer gas top-ups, unsettled deposits and withdrawals. */
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const done = await daily();
    done.push(...(await settleDeposits().catch((e) => [`deposits: settle failed: ${String(e).slice(0, 120)}`])));
    done.push(...(await settleWithdrawals().catch((e) => [`withdrawals: settle failed: ${String(e).slice(0, 120)}`])));
    return NextResponse.json({ ok: true, done });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 400) }, { status: 500 });
  }
}
