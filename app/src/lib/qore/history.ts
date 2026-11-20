"use client";

/**
 * A user's own Darwin trades, read from the chain: the native txs the account signed (QoreX), with
 * the router calls they carried decoded. Works on any device, nothing is stored in the browser.
 */
import { useQuery } from "@tanstack/react-query";
import { bytesToHex, decodeFunctionData } from "viem";
import { routerAbi } from "./abis";
import { D, REST, ROUTER } from "./chain";

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

async function readHistory(address: string): Promise<TradeEntry[]> {
  const q = encodeURIComponent(`message.sender='${address}'`);
  const res = await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${q}`);
  if (!res.ok) return [];
  const { tx_responses } = (await res.json()) as { tx_responses?: any[] };
  const out: TradeEntry[] = [];
  for (const t of tx_responses ?? []) {
    const hybrid = t.events?.some((e: any) => e.type === "pqc_hybrid_verify" && e.attributes.some((a: any) => a.key === "status" && a.value === "verified"));
    for (const m of t.tx.body.messages) {
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

export function useTradeHistory(address: string | null | undefined) {
  return useQuery({ queryKey: ["trade-history", address], queryFn: () => readHistory(address!), enabled: Boolean(address), refetchInterval: 15_000 });
}
