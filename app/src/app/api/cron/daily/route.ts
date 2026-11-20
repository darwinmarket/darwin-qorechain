import { NextResponse, type NextRequest } from "next/server";
import { daily } from "@/server/keeper";
import { settleWithdrawals } from "@/server/accounts";

/** Daily safety net (Vercel cron): the deployer's scoped EVM window and one signed price round. */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const done = await daily();
    done.push(...(await settleWithdrawals().catch((e) => [`settle failed: ${String(e).slice(0, 120)}`])));
    return NextResponse.json({ ok: true, done });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 400) }, { status: 500 });
  }
}
