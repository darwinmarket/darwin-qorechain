"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { client, ORACLE } from "./chain";

export type OracleRound = { round: number; timestamp: number; tx: string; block: bigint; prices: Record<number, number> };

const ROUND = parseAbiItem("event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)");
const PRICE = parseAbiItem("event PriceUpdated(uint16 indexed feedId, uint256 price, uint64 indexed round)");
const SPAN = 9_000n; // the public RPC answers at most 10,000 blocks per query

async function readRounds(): Promise<OracleRound[]> {
  const head = await client.getBlockNumber();
  const [rounds, prices] = await Promise.all([
    client.getLogs({ address: ORACLE, event: ROUND, fromBlock: head - SPAN, toBlock: head }),
    client.getLogs({ address: ORACLE, event: PRICE, fromBlock: head - SPAN, toBlock: head }),
  ]);
  const byRound = new Map<number, Record<number, number>>();
  for (const p of prices) {
    const r = Number(p.args.round);
    const m = byRound.get(r) ?? {};
    m[Number(p.args.feedId)] = Number(p.args.price) / 1e18;
    byRound.set(r, m);
  }
  return rounds
    .map((l) => ({
      round: Number(l.args.round),
      timestamp: Number(l.args.timestamp),
      tx: l.transactionHash!,
      block: l.blockNumber!,
      prices: byRound.get(Number(l.args.round)) ?? {},
    }))
    .sort((a, b) => b.round - a.round);
}

export function useOracleRounds() {
  return useQuery({ queryKey: ["oracle-rounds"], queryFn: readRounds, refetchInterval: 120_000 });
}

/** Gas and calldata size of one round, from its receipt. */
export async function roundGas(tx: `0x${string}`) {
  const [r, t] = await Promise.all([client.getTransactionReceipt({ hash: tx }), client.getTransaction({ hash: tx })]);
  return { gasUsed: r.gasUsed, calldataBytes: (t.input.length - 2) / 2 };
}
