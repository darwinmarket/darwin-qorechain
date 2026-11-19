"use client";

import { useQuery } from "@tanstack/react-query";
import { bytesToHex, decodeFunctionData, parseAbiItem, type Address } from "viem";
import { routerAbi } from "./abis";
import { client, D, ORACLE, REST, ROUTER } from "./chain";

export type ActivityItem = {
  kind: "buy" | "sell" | "round" | "rebalance";
  /** Signed hybrid (secp256k1 + ML-DSA-87) on the native lane and verified by the chain. */
  hybrid?: boolean;
  basket?: string;
  text: string;
  tx: string;
  block: bigint;
  time?: number;
};

const EVENTS = [
  parseAbiItem("event Bought(address indexed trader, address indexed basket, uint256 usdIn, uint256 fee, uint256 shares, address to)"),
  parseAbiItem("event Sold(address indexed trader, address indexed basket, uint256 shares, uint256 usdOut, uint256 fee, address to)"),
  parseAbiItem("event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)"),
  parseAbiItem("event Rebalanced(uint256 indexed nonce, uint256 trades, uint256 navBefore, uint256 navAfter, address relayer)"),
] as const;

const SPAN = 9_000n; // the public RPC answers at most 10,000 blocks per query

const basketKey = (a?: string) =>
  a ? Object.entries(D.baskets).find(([, b]) => b.address.toLowerCase() === a.toLowerCase())?.[0] : undefined;

type CosmosTx = {
  txhash: string;
  height: string;
  timestamp: string;
  code: number;
  events: { type: string; attributes: { key: string; value: string }[] }[];
  tx: { body: { messages: { "@type": string; target_contract?: string; payload?: string; sender?: string }[] } };
};

const b64 = (s: string) => bytesToHex(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

/** Trades sent from QoreX: native MsgCrossVMCall into the router. Their EVM logs are not indexed, so
 *  they are read from the native tx search and decoded from the calldata they carry. */
/** Every router Darwin has run, newest first: trades on a retired router stay in the history. */
const ROUTERS = [ROUTER, ...((D as any).routerHistory ?? []).map((r: { address: string }) => r.address)].map((a: string) => a.toLowerCase());

async function readNativeTrades(): Promise<ActivityItem[]> {
  const pages = await Promise.all(
    ROUTERS.map(async (router) => {
      const q = encodeURIComponent(`crossvm_request.target_contract='${router}'`);
      const res = await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${q}`);
      if (!res.ok) return [] as CosmosTx[];
      return ((await res.json()) as { tx_responses?: CosmosTx[] }).tx_responses ?? [];
    }),
  );
  const tx_responses = pages.flat();
  const out: ActivityItem[] = [];
  for (const t of tx_responses ?? []) {
    if (t.code !== 0) continue;
    const hybrid = t.events.some((e) => e.type === "pqc_hybrid_verify" && e.attributes.some((a) => a.key === "status" && a.value === "verified"));
    for (const m of t.tx.body.messages) {
      if (!m["@type"].endsWith("MsgCrossVMCall") || !ROUTERS.includes(m.target_contract?.toLowerCase() ?? "") || !m.payload) continue;
      try {
        const call = decodeFunctionData({ abi: routerAbi, data: b64(m.payload) });
        const key = basketKey(call.args[0] as string);
        const display = D.baskets[key!]?.display ?? "?";
        const base = { basket: key, tx: t.txhash, block: BigInt(t.height), time: Date.parse(t.timestamp) / 1000, hybrid };
        if (call.functionName === "buy") out.push({ ...base, kind: "buy", text: `Bought ${display} with ${(Number(call.args[1]) / 1e6).toFixed(2)} fUSD from QoreX` });
        if (call.functionName === "sell") out.push({ ...base, kind: "sell", text: `Sold ${(Number(call.args[1]) / 1e18).toFixed(3)} ${display} from QoreX` });
      } catch {
        /* not a trade */
      }
    }
  }
  return out;
}

async function readActivity(onlyBasket?: string): Promise<ActivityItem[]> {
  const head = await client.getBlockNumber();
  const addresses = [...ROUTERS, ORACLE, ...Object.values(D.baskets).map((b) => b.address)] as Address[];
  const logs = await client.getLogs({ address: addresses, events: EVENTS, fromBlock: head - SPAN, toBlock: head });
  const items: ActivityItem[] = [];
  for (const l of logs as any[]) {
    const tx = l.transactionHash as string;
    const block = l.blockNumber as bigint;
    if (l.eventName === "Bought") {
      const key = basketKey(l.args.basket);
      items.push({ kind: "buy", basket: key, text: `Bought ${(Number(l.args.shares) / 1e18).toFixed(3)} ${D.baskets[key!]?.display ?? "?"} for ${(Number(l.args.usdIn) / 1e6).toFixed(2)} fUSD`, tx, block });
    } else if (l.eventName === "Sold") {
      const key = basketKey(l.args.basket);
      items.push({ kind: "sell", basket: key, text: `Sold ${(Number(l.args.shares) / 1e18).toFixed(3)} ${D.baskets[key!]?.display ?? "?"} for ${(Number(l.args.usdOut) / 1e6).toFixed(2)} fUSD`, tx, block });
    } else if (l.eventName === "RoundSubmitted") {
      items.push({ kind: "round", text: `Oracle round ${l.args.round}: ${l.args.feeds} prices, ML-DSA-87 verified`, tx, block, time: Number(l.args.timestamp) });
    } else if (l.eventName === "Rebalanced") {
      const key = basketKey(l.address);
      items.push({ kind: "rebalance", basket: key, text: `${D.baskets[key!]?.display ?? "Basket"} rebalanced: ${l.args.trades} trade(s), curator ML-DSA-87 signature`, tx, block });
    }
  }
  items.push(...(await readNativeTrades().catch(() => [])));
  const filtered = onlyBasket ? items.filter((i) => !i.basket || i.basket === onlyBasket) : items;
  return filtered.sort((a, b) => Number(b.block - a.block)).slice(0, 40);
}

export function useActivity(onlyBasket?: string) {
  return useQuery({ queryKey: ["activity", onlyBasket ?? "all"], queryFn: () => readActivity(onlyBasket), refetchInterval: 20_000 });
}
