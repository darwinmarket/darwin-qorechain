import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy to Darwin's trade relayer (ops/src/relayer.ts), which holds its own key server-side.
 * Only its two routes are forwarded: the setup status of an account, and a signed trade intent.
 */
const UPSTREAM = process.env.RELAYER_URL ?? "http://localhost:3046";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (path !== "status") return NextResponse.json({ error: "not found" }, { status: 404 });
  const account = req.nextUrl.searchParams.get("account") ?? "";
  try {
    const r = await fetch(`${UPSTREAM}/relay/status?account=${encodeURIComponent(account)}`, { cache: "no-store" });
    return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "Darwin's relayer is not reachable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (path !== "trade") return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.text();
  if (body.length > 64_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  try {
    const r = await fetch(`${UPSTREAM}/relay/trade`, { method: "POST", body, headers: { "content-type": "application/json" } });
    return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "Darwin's relayer is not reachable" }, { status: 503 });
  }
}
