import { NextResponse, type NextRequest } from "next/server";
import { status, trade } from "@/server/relayer";

/**
 * Darwin's trade relayer (src/server/relayer.ts), in this app's server: the setup status of an
 * account, and the execution of a trade intent the user signed in QoreX. Keys stay server-side.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const fail = (e: unknown, code = 400) => NextResponse.json({ error: String((e as Error)?.message ?? e).slice(0, 400) }, { status: code });

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if ((await params).path.join("/") !== "status") return fail("not found", 404);
  try {
    return NextResponse.json(await status(req.nextUrl.searchParams.get("account") ?? ""), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if ((await params).path.join("/") !== "trade") return fail("not found", 404);
  const body = await req.text();
  if (body.length > 64_000) return fail("too large", 413);
  try {
    const { intent, signature } = JSON.parse(body);
    return NextResponse.json(await trade(String(intent), signature));
  } catch (e) {
    return fail(e);
  }
}
