"use client";

/**
 * Baskets, read straight from the chain: composition, NAV, supply and the oracle's post-quantum
 * signed prices. No backend in between.
 */
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { basketAbi, oracleAbi, reserveAbi } from "@/lib/qore/abis";
import { client, D, ORACLE, RESERVE, TOKEN_INFO, tokenKeyOf } from "@/lib/qore/chain";
import type { Basket, Leg } from "./types";

export type OracleFeed = { feed: number; tracks: string; price: number; updatedAt: number; round: number };
export type OracleState = { round: number; lastTimestamp: number; feeds: OracleFeed[]; reporter: Address; maxAge: number };

async function readOracle(): Promise<OracleState> {
  const feeds = [1, 2, 3, 4];
  const [round, lastTimestamp, reporter, maxAge, ...latest] = await Promise.all([
    client.readContract({ address: ORACLE, abi: oracleAbi, functionName: "round" }),
    client.readContract({ address: ORACLE, abi: oracleAbi, functionName: "lastTimestamp" }),
    client.readContract({ address: ORACLE, abi: oracleAbi, functionName: "reporter" }),
    client.readContract({ address: ORACLE, abi: oracleAbi, functionName: "maxAge" }),
    ...feeds.map((f) => client.readContract({ address: ORACLE, abi: oracleAbi, functionName: "latest", args: [f] })),
  ]);
  const tracks = ["", "USD", "ETH", "BTC", "QOR"];
  return {
    round: Number(round),
    lastTimestamp: Number(lastTimestamp),
    reporter: reporter as Address,
    maxAge: Number(maxAge),
    feeds: latest.map((l, i) => {
      const [price, updatedAt, r] = l as readonly [bigint, bigint, bigint];
      return { feed: feeds[i], tracks: tracks[feeds[i]], price: Number(price) / 1e18, updatedAt: Number(updatedAt), round: Number(r) };
    }),
  };
}

async function readBasket(key: string, prices: Record<string, number>, inventory: Map<string, bigint>): Promise<Basket> {
  const meta = D.baskets[key];
  const address = meta.address;
  const [composition, supply, mintPaused] = await Promise.all([
    client.readContract({ address, abi: basketAbi, functionName: "composition" }),
    client.readContract({ address, abi: basketAbi, functionName: "totalSupply" }),
    client.readContract({ address, abi: basketAbi, functionName: "mintPaused" }),
  ]);
  const [tokens, targets, balances, values, weights] = composition as readonly [Address[], number[], bigint[], bigint[], number[]];
  const supplyFloat = Number(supply) / 1e18;
  const tvlUsd = values.reduce((s, v) => s + Number(v) / 1e18, 0);
  const legs: Leg[] = tokens.map((t, i) => {
    const info = TOKEN_INFO[tokenKeyOf(t)];
    const units = Number(balances[i]) / 10 ** info.decimals;
    // How much of this component the reserve could still sell for a buy, in USD.
    const depth = (Number(inventory.get(t.toLowerCase()) ?? 0n) / 10 ** info.decimals) * (prices[info.tracks] ?? 0);
    return {
      address: t,
      symbol: info.tracks,
      decimals: info.decimals,
      class: "crypto",
      perShare: supplyFloat > 0 ? units / supplyFloat : 0,
      priceUsd: prices[info.tracks] ?? 0,
      valueUsd: Number(values[i]) / 1e18,
      weight: weights[i] / 10_000,
      targetWeight: targets[i] / 10_000,
      depthUsd: info.tracks === "USD" ? Number.POSITIVE_INFINITY : depth,
    };
  });
  const capacityUsd = Math.min(...legs.filter((l) => l.weight > 0).map((l) => (l.depthUsd === Number.POSITIVE_INFINITY ? Infinity : l.depthUsd / Math.max(l.weight, 0.01))));
  return {
    address,
    symbol: key,
    name: meta.name,
    description: meta.description,
    owner: D.roles.admin,
    supplyFloat,
    paused: Boolean(mintPaused),
    mintFeeBps: 30,
    redeemFeeBps: 30,
    protocolMintFeeBps: 0,
    protocolRedeemFeeBps: 0,
    navUsd: supplyFloat > 0 ? tvlUsd / supplyFloat : 0,
    tvlUsd,
    capacityUsd: Number.isFinite(capacityUsd) ? capacityUsd : 0,
    costPerShareUsd: supplyFloat > 0 ? (tvlUsd / supplyFloat) * 1.006 : 0,
    quote: "fUSD",
    legs,
    live: !mintPaused,
    inception: D.deployedAt?.slice(0, 10),
    shareAtInception: 10,
  };
}

async function readAll(): Promise<{ baskets: Basket[]; oracle: OracleState }> {
  const [oracle, inv] = await Promise.all([
    readOracle(),
    client.readContract({ address: RESERVE, abi: reserveAbi, functionName: "inventory" }),
  ]);
  const prices = Object.fromEntries(oracle.feeds.map((f) => [f.tracks, f.price]));
  const [list, bals] = inv as readonly [Address[], bigint[]];
  const inventory = new Map(list.map((a, i) => [a.toLowerCase(), bals[i]]));
  const baskets = await Promise.all(Object.keys(D.baskets).map((k) => readBasket(k, prices, inventory)));
  return { baskets, oracle };
}

export function useChainState() {
  return useQuery({ queryKey: ["chain-state"], queryFn: readAll, refetchInterval: 15_000, staleTime: 10_000 });
}

export function useBaskets() {
  const q = useChainState();
  return { data: q.data?.baskets, error: q.error ? String((q.error as Error).message ?? q.error) : undefined, isLoading: q.isLoading };
}

export function useOracle() {
  const q = useChainState();
  return q.data?.oracle;
}
