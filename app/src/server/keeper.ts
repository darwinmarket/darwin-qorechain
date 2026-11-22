/**
 * Server-only keeper duties, run on demand instead of by an always-on process:
 *   - freshRound(): before a relayed trade, publish a signed price round if the last one is older
 *     than FRESH_SECONDS (the router refuses prices older than 30 minutes);
 *   - daily(): the daily cron's safety net: a round;
 * Every transaction goes out on the native lane, hybrid-signed (writeNative): no EVM window.
 *   - weeklyRebalance(): Mondays 12:00 UTC, curator-signed rebalances of drifted baskets.
 * Nobody trading means no transactions: no cost. If none of this runs, selling and in-kind
 * redemption still work as soon as a round is published, and the app still displays.
 */
import { parseAbi, type Address, type Hex } from "viem";
import { client, D, json, pqSign, REST, sendNative, writeNative } from "./chain";
import { account, RELAYERS } from "./keys";
import { FEED, fetchPrices, toWad } from "./prices";

const FRESH_SECONDS = 20 * 60;
const oracleAbi = parseAbi([
  "function feedIds() view returns (uint16[])",
  "function round() view returns (uint64)",
  "function lastTimestamp() view returns (uint64)",
  "function MIN_ROUND_INTERVAL() view returns (uint32)",
  "function roundMessage(uint64 round_, uint64 timestamp, uint16[] ids, uint128[] prices) view returns (bytes)",
  "function submit(uint64 timestamp, uint16[] ids, uint128[] prices, bytes signature)",
]);
const basketAbi = parseAbi([
  "function composition() view returns (address[] tokens, uint16[] targets, uint256[] balances, uint256[] values, uint16[] weights)",
  "function curatorNonce() view returns (uint256)",
  "function rebalanceMessage((address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)[] trades, uint256 nonce, uint256 deadline) view returns (bytes)",
  "function rebalance((address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)[] trades, uint256 deadline, bytes signature)",
]);
const reserveAbi = parseAbi([
  "function valueOf(address token, uint256 amount) view returns (uint256)",
  "function quoteExactIn(address trader, address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256)",
]);

// ---- oracle ------------------------------------------------------------------------------------
export async function submitRound(): Promise<string> {
  const oracle = D.oracle as Address;
  const p = await fetchPrices();
  const byId = Object.fromEntries(Object.entries(FEED).map(([n, id]) => [id, n])) as Record<number, keyof typeof FEED>;
  const known = (await client.readContract({ address: oracle, abi: oracleAbi, functionName: "feedIds" })) as readonly number[];
  const ids = known.filter((id) => byId[id] && Number.isFinite(p[byId[id]])).sort((a, b) => a - b);
  const prices = ids.map((id) => toWad(p[byId[id]]));
  const [round, last, gap, block] = await Promise.all([
    client.readContract({ address: oracle, abi: oracleAbi, functionName: "round" }),
    client.readContract({ address: oracle, abi: oracleAbi, functionName: "lastTimestamp" }),
    client.readContract({ address: oracle, abi: oracleAbi, functionName: "MIN_ROUND_INTERVAL" }),
    client.getBlock(),
  ]);
  const earliest = last + BigInt(gap);
  const ts = block.timestamp > earliest ? block.timestamp : earliest;
  const msg = (await client.readContract({ address: oracle, abi: oracleAbi, functionName: "roundMessage", args: [round + 1n, ts, ids, prices] })) as Hex;
  const sig = await pqSign("reporter", msg);
  // the memo names the round: a native call leaves no RoundSubmitted log for readers to find
  const r = await writeNative("deployer", oracle, oracleAbi as any, "submit", [ts, ids, prices, sig], `darwin round ${round + 1n}`);
  return `round ${round + 1n} (${r.transactionHash})`;
}

/** Publish a round if the last one is older than FRESH_SECONDS. Safe to call concurrently. */
export async function freshRound(): Promise<string> {
  const last = (await client.readContract({ address: D.oracle, abi: oracleAbi, functionName: "lastTimestamp" })) as bigint;
  const age = Math.floor(Date.now() / 1000) - Number(last);
  if (age < FRESH_SECONDS) return `round fresh (${age}s)`;
  const ageNow = async () =>
    Math.floor(Date.now() / 1000) - Number((await client.readContract({ address: D.oracle, abi: oracleAbi, functionName: "lastTimestamp" })) as bigint);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await submitRound();
    } catch (e) {
      // Parallel calls race for the same round (and the deployer's sequence): wait for the
      // winner's round to land, then look again (found by the multi-user battery).
      await new Promise((r) => setTimeout(r, 5000 + Math.random() * 3000));
      const a = await ageNow();
      if (a < FRESH_SECONDS) return "round published by another call";
      // the router accepts prices up to 30 minutes old: a trade need not wait for a round it can live without
      if (attempt === 1 && a < STALE_LIMIT - 120) return `round not refreshed (${a}s old, still valid): ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 80)}`;
      if (attempt === 1) throw e;
    }
  }
  return "round";
}
const STALE_LIMIT = 30 * 60;

export async function daily(): Promise<string[]> {
  return [
    await submitRound().catch((e) => `round skipped: ${String(e?.message ?? e).slice(0, 120)}`),
    await topUpRelayers().catch((e) => `relayer top-up failed: ${String(e?.message ?? e).slice(0, 120)}`),
  ];
}

// ---- relayer gas ---------------------------------------------------------------------------------
// Each relayed trade costs its relayer about 0.26 QOR, and a user always lands on the same relayer:
// one dry relayer fails every trade of its users. The deployer refills any relayer below FLOOR.
const FLOOR = 25_000_000n; // uqor
const TARGET = 80_000_000n;
const uqor = async (address: string) =>
  BigInt(((await json(`${REST}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uqor`)) as any).balance?.amount ?? "0");

export async function topUpRelayers(): Promise<string> {
  const dep = await account("deployer");
  const low = async () => {
    const out: { cosmos: string; have: bigint }[] = [];
    for (const r of RELAYERS) {
      const a = await account(r);
      const have = await uqor(a.cosmos);
      if (have < FLOOR) out.push({ cosmos: a.cosmos, have });
    }
    return out;
  };
  const need = await low();
  if (!need.length) return "relayers funded";
  const msgs = need.map((n) => ({
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: { fromAddress: dep.cosmos, toAddress: n.cosmos, amount: [{ denom: "uqor", amount: String(TARGET - n.have) }] },
  }));
  // a retry after a sequence clash must not send twice: if every relayer is above the floor, it landed
  const hash = await sendNative("deployer", msgs as any, 400_000 + 200_000 * msgs.length, "darwin relayer top-up", async () => ((await low()).length ? null : "landed"));
  return `relayers topped up: ${need.map((n) => `${n.cosmos.slice(0, 10)}… ${Number(n.have) / 1e6} -> ${Number(TARGET) / 1e6} QOR`).join(", ")} (${hash})`;
}

// ---- weekly rebalance (curator-signed) -----------------------------------------------------------
type Trade = { tokenIn: Address; tokenOut: Address; amountIn: bigint; minAmountOut: bigint };

/** Greedy overweight -> underweight moves (as ops/src/lib/planner.ts). */
function planMoves(values: readonly bigint[], targets: readonly number[]) {
  const total = values.reduce((s, v) => s + v, 0n);
  if (total === 0n) return [];
  const excess = values.map((v, i) => v - (total * BigInt(targets[i])) / 10_000n);
  const desc = (a: { e: bigint }, b: { e: bigint }) => (b.e > a.e ? 1 : b.e < a.e ? -1 : 0);
  const sellers = excess.map((e, i) => ({ i, e })).filter((x) => x.e > 0n).sort(desc);
  const buyers = excess.map((e, i) => ({ i, e: -e })).filter((x) => x.e > 0n).sort(desc);
  const moves: { from: number; to: number; usd: bigint }[] = [];
  for (const s of sellers)
    for (const b of buyers) {
      if (s.e === 0n) break;
      const usd = s.e < b.e ? s.e : b.e;
      if (usd === 0n) continue;
      moves.push({ from: s.i, to: b.i, usd });
      s.e -= usd;
      b.e -= usd;
    }
  return moves;
}

export async function weeklyRebalance(minDriftBps = 100): Promise<string[]> {
  await freshRound();
  const out: string[] = [];
  for (const [key, b] of Object.entries(D.baskets) as [string, any][]) {
    const basket = b.address as Address;
    const [tokens, targets, balances, values, weights] = await client.readContract({ address: basket, abi: basketAbi, functionName: "composition" });
    const drift = Math.max(...weights.map((w, i) => Math.abs(w - targets[i])));
    if (drift < minDriftBps) {
      out.push(`${key}: drift ${drift} bps, nothing to do`);
      continue;
    }
    const trades: Trade[] = [];
    for (const m of planMoves(values, targets)) {
      const unit = await client.readContract({ address: D.reserve, abi: reserveAbi, functionName: "valueOf", args: [tokens[m.from], 10n ** 30n] });
      const amountIn = (m.usd * 10n ** 30n) / unit;
      if (amountIn === 0n || amountIn > balances[m.from]) continue;
      const q = await client.readContract({ address: D.reserve, abi: reserveAbi, functionName: "quoteExactIn", args: [basket, tokens[m.from], tokens[m.to], amountIn] });
      trades.push({ tokenIn: tokens[m.from], tokenOut: tokens[m.to], amountIn, minAmountOut: (q * 995n) / 1000n });
    }
    if (!trades.length) continue;
    const nonce = await client.readContract({ address: basket, abi: basketAbi, functionName: "curatorNonce" });
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const msg = (await client.readContract({ address: basket, abi: basketAbi, functionName: "rebalanceMessage", args: [trades, nonce, deadline] })) as Hex;
    const r = await writeNative("deployer", basket, basketAbi as any, "rebalance", [trades, deadline, await pqSign("curator", msg)], `darwin rebalance ${key} ${nonce}`);
    out.push(`${key}: drift ${drift} bps, rebalanced with ${trades.length} trade(s) (${r.transactionHash})`);
  }
  return out;
}
