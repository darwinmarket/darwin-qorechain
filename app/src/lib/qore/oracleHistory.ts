"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { client, ORACLE, REST } from "./chain";
import { nativeRound } from "./nativeCalls";

export type OracleRound = { round: number; timestamp: number; tx: string; block: bigint; prices: Record<number, number> };

const ROUND = parseAbiItem("event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)");
const PRICE = parseAbiItem("event PriceUpdated(uint16 indexed feedId, uint256 price, uint64 indexed round)");
const SPAN = 9_000n; // the public RPC answers at most 10,000 blocks per query

/** Rounds sent on the native lane (hybrid-signed MsgCrossVMCall): no logs, read from the txs. */
async function readNativeRounds(): Promise<OracleRound[]> {
  const q = encodeURIComponent(`crossvm_request.target_contract='${ORACLE.toLowerCase()}'`);
  const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${q}`).catch(() => null);
  const txs = r?.ok ? (((await r.json()) as { tx_responses?: any[] }).tx_responses ?? []) : [];
  return txs.flatMap((t) => {
    const n = nativeRound(t, ORACLE);
    if (!n) return [];
    const prices: Record<number, number> = {};
    n.ids.forEach((id, i) => (prices[id] = Number(n.prices[i]) / 1e18));
    return [{ round: n.round, timestamp: n.timestamp, tx: n.tx, block: BigInt(n.height), prices }];
  });
}

async function readRounds(): Promise<OracleRound[]> {
  const [evm, native] = await Promise.all([readEvmRounds().catch(() => []), readNativeRounds().catch(() => [])]);
  const byRound = new Map<number, OracleRound>();
  for (const r of [...evm, ...native]) byRound.set(r.round, r);
  return [...byRound.values()].sort((a, b) => b.round - a.round);
}

async function readEvmRounds(): Promise<OracleRound[]> {
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

/** Gas and calldata size of one round: from its receipt, or from the native transaction. */
export async function roundGas(tx: string) {
  if (!tx.startsWith("0x")) {
    const j = (await (await fetch(`${REST}/cosmos/tx/v1beta1/txs/${tx}`)).json()) as any;
    const n = nativeRound(j.tx_response ? { ...j.tx_response, tx: j.tx } : null, ORACLE);
    return { gasUsed: BigInt(j.tx_response?.gas_used ?? 0), calldataBytes: n ? (n.data.length - 2) / 2 : 0 };
  }
  const [r, t] = await Promise.all([client.getTransactionReceipt({ hash: tx as `0x${string}` }), client.getTransaction({ hash: tx as `0x${string}` })]);
  return { gasUsed: r.gasUsed, calldataBytes: (t.input.length - 2) / 2 };
}
