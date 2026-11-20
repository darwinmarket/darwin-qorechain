/**
 * Server-only keeper duties, run on demand instead of by an always-on process:
 *   - freshRound(): before a relayed trade, publish a signed price round if the last one is older
 *     than FRESH_SECONDS (the router refuses prices older than 30 minutes);
 *   - daily(): the daily cron's safety net: the deployer's scoped EVM window and a round;
 *   - weeklyRebalance(): Mondays 12:00 UTC, curator-signed rebalances of drifted baskets.
 * Nobody trading means no transactions: no cost. If none of this runs, selling and in-kind
 * redemption still work as soon as a round is published, and the app still displays.
 */
import { openEvmWindowMsg } from "@qorechain/sdk";
import { evmWindowCost } from "@qorechain/evm";
import { fetchEvmWindow } from "@qorechain/qoresign/network";
import { parseAbi, type Address, type Hex } from "viem";
import { account } from "./keys";
import { client, D, pqSign, REST, sendNative, writeEvm } from "./chain";
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

// ---- the deployer's scoped EVM window -------------------------------------------------------------
const targets = () =>
  [D.oracle, D.reserve, D.router, ...Object.values(D.baskets).map((b: any) => b.address), ...Object.values(D.tokens)].map((a: any) =>
    String(a).toLowerCase(),
  );

export async function ensureWindow(): Promise<string> {
  const acc = await account("deployer");
  const w: any = await fetchEvmWindow({ rest: REST, address: acc.cosmos });
  const scoped = (w?.allowedTargets ?? []).length > 0;
  if (w?.live && Number(w.remainingBlocks) > 2_000 && Number(w.remainingTxs) > 30 && scoped) return "window ok";
  const maxTxs = 1_000n;
  const msg = openEvmWindowMsg({
    sender: acc.cosmos,
    blocks: 20_000n, // ~8 hours at the testnet's ~1.4 s blocks
    maxTxs,
    maxValue: evmWindowCost({ gas: 3_000_000n, maxFeePerGas: 250_000_000_000n }) * maxTxs,
    allowedTargets: targets(),
  } as any);
  const tx = await sendNative("deployer", [msg as any], 500_000);
  await new Promise((r) => setTimeout(r, 6000)); // the window opens in the next block
  return `window ${tx}`;
}

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
  const r = await writeEvm(oracle, oracleAbi as any, "submit", [ts, ids, prices, sig]);
  return `round ${round + 1n} (${r.transactionHash})`;
}

/** Publish a round if the last one is older than FRESH_SECONDS. Safe to call concurrently. */
export async function freshRound(): Promise<string> {
  const last = (await client.readContract({ address: D.oracle, abi: oracleAbi, functionName: "lastTimestamp" })) as bigint;
  const age = Math.floor(Date.now() / 1000) - Number(last);
  if (age < FRESH_SECONDS) return `round fresh (${age}s)`;
  await ensureWindow();
  try {
    return await submitRound();
  } catch (e) {
    // another caller published in the meantime
    const now = (await client.readContract({ address: D.oracle, abi: oracleAbi, functionName: "lastTimestamp" })) as bigint;
    if (Math.floor(Date.now() / 1000) - Number(now) < FRESH_SECONDS) return "round published by another call";
    throw e;
  }
}

export async function daily(): Promise<string[]> {
  const out = [await ensureWindow()];
  out.push(await submitRound().catch((e) => `round skipped: ${String(e?.message ?? e).slice(0, 120)}`));
  return out;
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
  // a window lasts ~8 hours at 1.4 s blocks: renew it before relaying rebalances
  await ensureWindow();
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
    const r = await writeEvm(basket, basketAbi as any, "rebalance", [trades, deadline, await pqSign("curator", msg)]);
    out.push(`${key}: drift ${drift} bps, rebalanced with ${trades.length} trade(s) (${r.transactionHash})`);
  }
  return out;
}
