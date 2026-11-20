import { NextResponse, type NextRequest } from "next/server";

/**
 * Open a transaction in the QoreChain explorer. The explorer is keyed by the Cosmos tx hash, but EVM
 * transactions (oracle rounds, keeper trades) are known by their 0x hash: resolve it through the
 * chain's `ethereum_tx.ethereumTxHash` event first, then redirect.
 */
const REST = process.env.QORE_REST_UPSTREAM ?? "https://api-testnet.qore.host";
const EXPLORER = "https://explore.qore.network";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (/^[0-9A-Fa-f]{64}$/.test(hash)) return NextResponse.redirect(`${EXPLORER}/tx/${hash.toUpperCase()}`, 302);
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return NextResponse.json({ error: "bad hash" }, { status: 400 });
  const query = encodeURIComponent(`ethereum_tx.ethereumTxHash='${hash.toLowerCase()}'`);
  try {
    const res = await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${query}&pagination.limit=1`, { next: { revalidate: 86_400 } });
    const body = (await res.json()) as { tx_responses?: { txhash: string }[] };
    const cosmos = body.tx_responses?.[0]?.txhash;
    if (cosmos) return NextResponse.redirect(`${EXPLORER}/tx/${cosmos}`, 302);
  } catch {
    /* fall through */
  }
  return NextResponse.redirect(`${EXPLORER}/tx/${hash.slice(2)}`, 302);
}
