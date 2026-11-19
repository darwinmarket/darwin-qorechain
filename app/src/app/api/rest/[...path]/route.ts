import { NextResponse, type NextRequest } from "next/server";

/**
 * Read-only proxy to the QoreChain REST API, whose public endpoint sends no CORS headers.
 * Only the few GET routes the app reads are forwarded.
 */
const UPSTREAM = process.env.QORE_REST_UPSTREAM ?? "https://api-testnet.qore.host";
const ALLOWED = [
  /^cosmos\/bank\/v1beta1\/balances\/qor1[02-9ac-hj-np-z]{38}$/,
  /^cosmos\/auth\/v1beta1\/accounts\/qor1[02-9ac-hj-np-z]{38}$/,
  /^cosmos\/auth\/v1beta1\/account_info\/qor1[02-9ac-hj-np-z]{38}$/,
  /^cosmos\/tx\/v1beta1\/txs\/[0-9A-Fa-f]{64}$/,
  /^cosmos\/base\/tendermint\/v1beta1\/(node_info|blocks\/latest)$/,
  /^cosmos\/upgrade\/v1beta1\/applied_plan\/[a-z0-9.-]{1,40}$/,
  /^qorechain\/[a-z]+\/v1\/(params|protocol_features|evm_limits)$/,
  /^qorechain\/pqc\/v1\/account\/qor1[02-9ac-hj-np-z]{38}$/,
  /^qorechain\/amm\/v1\/pools$/,
];

/** Tx search, only for the cross-VM calls that reach one of Darwin's contracts. */
const SEARCH = /^crossvm_request\.target_contract='0x[0-9a-f]{40}'$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (path === "cosmos/tx/v1beta1/txs") {
    const query = req.nextUrl.searchParams.get("query") ?? "";
    if (!SEARCH.test(query)) return NextResponse.json({ error: "not allowed" }, { status: 404 });
    const qs = new URLSearchParams({ query, order_by: "ORDER_BY_DESC", "pagination.limit": "25" });
    const res = await fetch(`${UPSTREAM}/${path}?${qs}`, { headers: { accept: "application/json" }, next: { revalidate: 10 } });
    return new NextResponse(await res.text(), { status: res.status, headers: { "content-type": "application/json", "cache-control": "public, max-age=10" } });
  }
  if (!ALLOWED.some((re) => re.test(path))) {
    console.warn("rest proxy refused GET", path);
    return NextResponse.json({ error: "not allowed" }, { status: 404 });
  }
  const res = await fetch(`${UPSTREAM}/${path}`, { headers: { accept: "application/json" }, cache: "no-store" });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** Broadcast and simulate, for in-page signers (the QoreX test double). The real QoreX broadcasts itself. */
const POST_ALLOWED = [/^cosmos\/tx\/v1beta1\/txs$/, /^cosmos\/tx\/v1beta1\/simulate$/];

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!POST_ALLOWED.some((re) => re.test(path))) {
    console.warn("rest proxy refused POST", path);
    return NextResponse.json({ error: "not allowed" }, { status: 404 });
  }
  const body = await req.text();
  if (body.length > 200_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const res = await fetch(`${UPSTREAM}/${path}`, { method: "POST", body, headers: { "content-type": "application/json" } });
  return new NextResponse(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}
