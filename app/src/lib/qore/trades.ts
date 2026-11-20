/**
 * A user's own Darwin trades, read from the chain's tx search and reduced to the few fields the
 * Activity tab draws. Runs on the server (/api/trades): the raw search results weigh megabytes
 * (every transaction carries its 4.6 kB ML-DSA-87 signature), the summary a few kilobytes.
 */
import { bytesToHex, decodeFunctionData } from "viem";
import { routerAbi } from "./abis";
import { D, ROUTER } from "./chain";

export type TradeEntry = {
  kind: "buy" | "sell";
  symbol: string;
  name: string;
  amount: string;
  unit: string;
  received?: string;
  ts: number;
  status: "done" | "failed";
  tx: string;
  hybrid: boolean;
};

const ROUTERS = [ROUTER, ...((D as any).routerHistory ?? []).map((r: { address: string }) => r.address)].map((a: string) =>
  a.toLowerCase(),
);
const b64 = (s: string) => bytesToHex(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
/** Current baskets, plus retired versions (QOREDW v1) so their trades stay in the history. */
const ALL_BASKETS: [string, { address: string; name: string; display: string }][] = [
  ...Object.entries(D.baskets),
  ...(((D as any).basketHistory ?? []) as any[]).map((b) => [b.key, b] as [string, any]),
];
const basketOf = (addr: string) => ALL_BASKETS.find(([, b]) => b.address.toLowerCase() === addr.toLowerCase());

export async function readTrades(REST: string, address: string): Promise<TradeEntry[]> {
  // trades the user sent itself, and trades Darwin's relayer executed for it (authz MsgExec), whose
  // cross-VM calls still name the user as sender
  const search = async (query: string) => {
    const qs = new URLSearchParams({ query, order_by: "ORDER_BY_DESC", "pagination.limit": "25" });
    const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs?${qs}`, { headers: { accept: "application/json", "user-agent": "darwin-qorechain" }, cache: "no-store" });
    return r.ok ? (((await r.json()) as { tx_responses?: any[] }).tx_responses ?? []) : [];
  };
  const seen = new Set<string>();
  const [own, relayed] = await Promise.all([search(`message.sender='${address}'`), search(`crossvm_request.sender='${address}'`)]);
  const txs = [...own, ...relayed].filter((t) =>
    seen.has(t.txhash) ? false : (seen.add(t.txhash), true),
  );
  const out: TradeEntry[] = [];
  for (const t of txs) {
    const hybrid = t.events?.some((e: any) => e.type === "pqc_hybrid_verify" && e.attributes.some((a: any) => a.key === "status" && a.value === "verified"));
    const msgs = (t.tx.body.messages as any[]).flatMap((m) => (m["@type"]?.endsWith("MsgExec") ? (m.msgs ?? []) : [m]));
    for (const m of msgs) {
      if (!m["@type"]?.endsWith("MsgCrossVMCall") || !ROUTERS.includes(m.target_contract?.toLowerCase()) || !m.payload) continue;
      try {
        const call = decodeFunctionData({ abi: routerAbi, data: b64(m.payload) });
        const found = basketOf(call.args[0] as string);
        if (!found) continue;
        const [symbol, b] = found;
        const base = { symbol, name: b.name.replace(/^Darwin /, ""), ts: Date.parse(t.timestamp), status: t.code === 0 ? ("done" as const) : ("failed" as const), tx: t.txhash, hybrid };
        if (call.functionName === "buy") {
          out.push({ ...base, kind: "buy", amount: (Number(call.args[1]) / 1e6).toFixed(2), unit: "fUSD", received: `${(Number(call.args[2]) / 1e18).toFixed(4)}+ ${b.display}` });
        } else if (call.functionName === "sell") {
          out.push({ ...base, kind: "sell", amount: (Number(call.args[1]) / 1e18).toFixed(4), unit: b.display, received: `${(Number(call.args[2]) / 1e6).toFixed(2)}+ fUSD` });
        }
      } catch {
        /* not a router trade */
      }
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

