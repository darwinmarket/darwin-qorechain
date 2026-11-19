/**
 * Curator: plan the trades that bring a basket back to its target weights, sign them with the
 * curator's ML-DSA-87 key and relay them. The contract checks the signature with pqcVerify, runs
 * the trades against the reserve at oracle prices and reverts if the NAV drops by more than its
 * limit.
 *
 *   tsx src/rebalance.ts plan <BASKET>              show drift and the trades, sign nothing
 *   tsx src/rebalance.ts run  <BASKET> [minDriftBps] rebalance if any weight drifted past the threshold
 *   tsx src/rebalance.ts weights <BASKET> <w1,w2,...> set new target weights (curator-signed)
 */
import type { Address, Hex } from "viem";
import { artifact, loadDeployments, pqSign, write } from "./evm.js";
import { publicClient } from "./net.js";
import { planMoves } from "./lib/planner.js";

const basketAbi = artifact("DarwinBasket").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const oracleAbi = artifact("DarwinOracle").abi;

export interface Trade { tokenIn: Address; tokenOut: Address; amountIn: bigint; minAmountOut: bigint }

const symbolOf = (d: any, a: string) =>
  Object.entries(d.tokens).find(([, v]) => (v as string).toLowerCase() === a.toLowerCase())?.[0] ?? a;

export async function plan(key: string) {
  const d = loadDeployments();
  const basket = d.baskets[key].address as Address;
  const [tokens, targets, balances, values, weights] = (await publicClient.readContract({
    address: basket, abi: basketAbi, functionName: "composition",
  })) as [Address[], number[], bigint[], bigint[], number[]];
  const total = values.reduce((a, b) => a + b, 0n);
  const drift = tokens.map((_, i) => weights[i] - targets[i]);
  const moves = planMoves(tokens.map((_, i) => ({ value: values[i], targetBps: targets[i] })));
  const trades: Trade[] = [];
  for (const m of moves) {
    // amountIn of the seller's token worth `m.usd`, at the reserve's oracle price
    const unit = (await publicClient.readContract({ address: d.reserve, abi: reserveAbi, functionName: "valueOf", args: [tokens[m.from], 10n ** 30n] })) as bigint;
    const amountIn = (m.usd * 10n ** 30n) / unit;
    if (amountIn === 0n || amountIn > balances[m.from]) continue;
    const out = (await publicClient.readContract({
      address: d.reserve, abi: reserveAbi, functionName: "quoteExactIn", args: [basket, tokens[m.from], tokens[m.to], amountIn],
    })) as bigint;
    trades.push({ tokenIn: tokens[m.from], tokenOut: tokens[m.to], amountIn, minAmountOut: (out * 995n) / 1000n });
  }
  return { basket, tokens, targets, weights, drift, total, trades };
}

function show(d: any, key: string, p: Awaited<ReturnType<typeof plan>>) {
  console.log(`${key}: NAV ${(Number(p.total) / 1e18).toFixed(2)} USD`);
  p.tokens.forEach((t, i) =>
    console.log(`  ${symbolOf(d, t).padEnd(5)} target ${(p.targets[i] / 100).toFixed(2)}%  now ${(p.weights[i] / 100).toFixed(2)}%  drift ${p.drift[i] >= 0 ? "+" : ""}${(p.drift[i] / 100).toFixed(2)}%`));
  p.trades.forEach((t) => console.log(`  trade: sell ${t.amountIn} ${symbolOf(d, t.tokenIn)} for >= ${t.minAmountOut} ${symbolOf(d, t.tokenOut)}`));
}

/** Rebalance `key` if a weight drifted more than `minDriftBps`. Returns the receipt or null. */
export async function rebalance(key: string, minDriftBps = 100) {
  const d = loadDeployments();
  const p = await plan(key);
  const maxDrift = Math.max(...p.drift.map(Math.abs));
  if (maxDrift < minDriftBps || p.trades.length === 0) {
    console.log(`${key}: max drift ${maxDrift} bps < ${minDriftBps}, nothing to do`);
    return null;
  }
  show(d, key, p);
  const nonce = (await publicClient.readContract({ address: p.basket, abi: basketAbi, functionName: "curatorNonce" })) as bigint;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const msg = (await publicClient.readContract({
    address: p.basket, abi: basketAbi, functionName: "rebalanceMessage", args: [p.trades, nonce, deadline],
  })) as Hex;
  const sig = await pqSign("curator", msg);
  const r = await write("deployer", p.basket, basketAbi, "rebalance", [p.trades, deadline, sig]);
  console.log(`${key}: rebalanced with ${p.trades.length} trade(s), curator nonce ${nonce} (gas ${r.gasUsed}, tx ${r.transactionHash})`);
  return r;
}

export async function setWeights(key: string, weights: number[]) {
  const d = loadDeployments();
  const basket = d.baskets[key].address as Address;
  const nonce = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "curatorNonce" })) as bigint;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const msg = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "weightsMessage", args: [weights, nonce, deadline] })) as Hex;
  const r = await write("deployer", basket, basketAbi, "setTargetWeights", [weights, deadline, await pqSign("curator", msg)]);
  console.log(`${key}: target weights ${weights.join("/")} (tx ${r.transactionHash})`);
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, key, arg] = process.argv.slice(2);
  if (cmd === "plan") show(loadDeployments(), key, await plan(key));
  else if (cmd === "run") await rebalance(key, Number(arg ?? 100));
  else if (cmd === "weights") await setWeights(key, arg.split(",").map(Number));
  else console.error("usage: rebalance.ts plan|run <BASKET> [minDriftBps] | weights <BASKET> <w1,w2,..>");
  void oracleAbi;
}
