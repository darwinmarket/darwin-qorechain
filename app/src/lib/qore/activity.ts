"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address } from "viem";
import { client, D, ORACLE, ROUTER } from "./chain";

export type ActivityItem = {
  kind: "buy" | "sell" | "round" | "rebalance";
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

async function readActivity(onlyBasket?: string): Promise<ActivityItem[]> {
  const head = await client.getBlockNumber();
  const addresses = [ROUTER, ORACLE, ...Object.values(D.baskets).map((b) => b.address)] as Address[];
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
  const filtered = onlyBasket ? items.filter((i) => !i.basket || i.basket === onlyBasket) : items;
  return filtered.sort((a, b) => Number(b.block - a.block)).slice(0, 40);
}

export function useActivity(onlyBasket?: string) {
  return useQuery({ queryKey: ["activity", onlyBasket ?? "all"], queryFn: () => readActivity(onlyBasket), refetchInterval: 20_000 });
}
