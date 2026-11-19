/**
 * Darwin keeper: one loop that keeps the protocol alive on qorechain-diana.
 *
 *  - Window: keeps the relayer's EVM window open, SCOPED to Darwin's own contracts and tokens
 *    (allowed_targets), so a leaked secp256k1 key of the keeper can touch nothing else.
 *  - Oracle: submits an ML-DSA-87 signed round every HEARTBEAT seconds, or sooner when a price
 *    moved more than DEVIATION_BPS.
 *  - Rebalance: every REBALANCE_EVERY seconds, rebalances any basket whose weights drifted more
 *    than DRIFT_BPS, with the curator's ML-DSA-87 signature.
 *  - Demo flow (DEMO_TRADES=1): the treasury trades small amounts from the native lane,
 *    hybrid-signed, like a QoreX user, so the app shows life. It never sells seed shares.
 *
 *   tsx src/keeper.ts
 */
import { formatEther, type Address } from "viem";
import { fetchEvmWindow } from "@qorechain/sdk";
import { evmAccount } from "./accounts.js";
import { artifact, loadDeployments } from "./evm.js";
import { publicClient, REST } from "./net.js";
import { FEED, fetchPrices } from "./prices.js";
import { submitRound } from "./oracle.js";
import { rebalance } from "./rebalance.js";
import { open } from "./window.js";
import { nativeTrade, treasuryShares } from "./crossvm.js";

const HEARTBEAT = Number(process.env.HEARTBEAT ?? 600);
const DEVIATION_BPS = Number(process.env.DEVIATION_BPS ?? 25);
const REBALANCE_EVERY = Number(process.env.REBALANCE_EVERY ?? 900);
const DRIFT_BPS = Number(process.env.DRIFT_BPS ?? 150);
const DEMO_EVERY = Number(process.env.DEMO_EVERY ?? 2700);
const DEMO = process.env.DEMO_TRADES === "1";
const TICK = 60;

const oracleAbi = artifact("DarwinOracle").abi;
const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

let lastRebalance = 0;
let lastDemo = 0;
let demoSide = 0;

function targets(): string[] {
  const d = loadDeployments();
  return [
    d.oracle, d.reserve, d.router,
    ...Object.values(d.baskets).map((b: any) => b.address),
    ...Object.values(d.tokens),
  ].map((a: string) => a.toLowerCase());
}

async function ensureWindow() {
  const acc = await evmAccount("deployer");
  const w = (await fetchEvmWindow({ rest: REST, address: acc.cosmos })) as any;
  const blocks = Number(w?.remainingBlocks ?? w?.remaining_blocks ?? 0);
  const txs = Number(w?.remainingTxs ?? w?.remaining_txs ?? 0);
  const scoped = (w?.allowedTargets ?? w?.allowed_targets ?? []).length > 0;
  if (w?.found && w?.live && blocks > 400 && txs > 30 && scoped) return;
  log(`window: ${w?.found ? `${blocks} blocks, ${txs} txs, ${scoped ? "scoped" : "unscoped"}` : "none"}; opening a scoped one`);
  await open("deployer", 17_280n, 1_000n, targets());
  await new Promise((r) => setTimeout(r, 6000)); // the window opens in the next block
}

async function maybeRound() {
  const d = loadDeployments();
  const last = Number(await publicClient.readContract({ address: d.oracle, abi: oracleAbi, functionName: "lastTimestamp" }));
  const age = Math.floor(Date.now() / 1000) - last;
  let reason = age >= HEARTBEAT ? `heartbeat (${age}s)` : "";
  if (!reason) {
    const p = await fetchPrices();
    for (const [name, id] of Object.entries(FEED)) {
      const [stored] = (await publicClient.readContract({ address: d.oracle, abi: oracleAbi, functionName: "latest", args: [id] })) as [bigint];
      const now = (p as any)[name] as number;
      const prev = Number(stored) / 1e18;
      const moved = Math.abs(now - prev) / prev * 10_000;
      if (moved >= DEVIATION_BPS) { reason = `${name} moved ${moved.toFixed(0)} bps`; break; }
    }
  }
  if (reason) {
    log(`oracle: ${reason}`);
    await submitRound(d.oracle);
  }
}

async function maybeRebalance() {
  if (Date.now() / 1000 - lastRebalance < REBALANCE_EVERY) return;
  lastRebalance = Date.now() / 1000;
  for (const key of Object.keys(loadDeployments().baskets)) {
    await rebalance(key, DRIFT_BPS).catch((e) => log(`rebalance ${key} failed: ${e.message?.slice(0, 200)}`));
  }
}

/**
 * Demo flow: the treasury (a QoreX-type coin-118 account) trades small amounts over the native
 * lane, hybrid-signed, exactly like an app user. It only ever sells shares it bought itself.
 */
async function maybeDemo() {
  if (!DEMO || Date.now() / 1000 - lastDemo < DEMO_EVERY) return;
  lastDemo = Date.now() / 1000;
  const keys = ["BLUEDW", "BALDW", "BLUEDW", "BALDW", "QOREDW", "DEGENDW"];
  const key = keys[Math.floor(demoSide / 2) % keys.length];
  const held = await treasuryShares(key);
  if (demoSide % 2 === 0 || held === 0n) {
    const usd = key === "QOREDW" ? "0.2" : key === "DEGENDW" ? "0.03" : String(1 + Math.round(Math.random() * 2));
    await nativeTrade("buy", key, usd);
  } else {
    await nativeTrade("sell", key, formatEther(held / 2n));
  }
  demoSide++;
}

async function health() {
  const acc = await evmAccount("deployer");
  const bal = await publicClient.getBalance({ address: acc.evm as Address });
  if (bal < 5n * 10n ** 18n) log(`WARNING: relayer has ${formatEther(bal)} QOR left, claim the faucet and fund it`);
}

log(`keeper up: heartbeat ${HEARTBEAT}s, deviation ${DEVIATION_BPS} bps, rebalance every ${REBALANCE_EVERY}s at ${DRIFT_BPS} bps${DEMO ? `, demo trades every ${DEMO_EVERY}s` : ""}`);
let ticks = 0;
for (;;) {
  for (const [name, fn] of [["window", ensureWindow], ["oracle", maybeRound], ["rebalance", maybeRebalance], ["demo", maybeDemo]] as const) {
    try {
      await fn();
    } catch (e: any) {
      log(`${name} error: ${(e?.shortMessage ?? e?.message ?? String(e)).slice(0, 300)}`);
    }
  }
  if (ticks++ % 30 === 0) await health().catch(() => {});
  await new Promise((r) => setTimeout(r, TICK * 1000));
}
