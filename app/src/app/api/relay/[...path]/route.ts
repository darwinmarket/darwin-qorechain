import { NextResponse, type NextRequest } from "next/server";
import { status, trade } from "@/server/relayer";
import { deposit, execute, info } from "@/server/accounts";

/**
 * Darwin's trade relayer (src/server/relayer.ts), in this app's server: the setup status of an
 * account, and the execution of a trade intent the user signed in QoreX. Keys stay server-side.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

const fail = (e: unknown, code = 400) => NextResponse.json({ error: String((e as Error)?.message ?? e).slice(0, 400) }, { status: code });

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (path !== "status" && path !== "account") return fail("not found", 404);
  try {
    const who = req.nextUrl.searchParams.get("account") ?? "";
    return NextResponse.json(path === "status" ? await status(who) : await info(who), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!["trade", "execute", "deposit"].includes(path)) return fail("not found", 404);
  const body = await req.text();
  if (body.length > 64_000) return fail("too large", 413);
  try {
    const j = JSON.parse(body);
    // the windowless path: DarwinAccounts (src/server/accounts.ts)
    if (path === "execute") return NextResponse.json(await execute(j));
    if (path === "deposit") return NextResponse.json(await deposit(String(j.owner), String(j.txHash)));
    // the original path: signed intents executed through the user's grant and EVM window
    return NextResponse.json(await trade(String(j.intent), j.signature));
  } catch (e) {
    return fail(e);
  }
}
