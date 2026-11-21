/**
 * Darwin keeper: one loop that keeps the protocol alive on qorechain-diana.
 *
 *  - Signing: every call goes out as a hybrid-signed MsgCrossVMCall (evm.ts write): no EVM window
 *    (allowed_targets), so a leaked secp256k1 key of the keeper can touch nothing else.
 *  - Oracle: submits an ML-DSA-87 signed round every HEARTBEAT seconds, or sooner when a price
 *    moved more than DEVIATION_BPS.
 *  - Rebalance: only every Monday 12:00 UTC, with the curator's ML-DSA-87 signature.
 *  - Demo flow (DEMO_TRADES=1): the treasury trades small amounts from the native lane,
 *    hybrid-signed, like a QoreX user, so the app shows life. It never sells seed shares.
 *
 *   tsx src/keeper.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { formatEther, type Address } from "viem";
import { evmAccount } from "./accounts.js";
import { artifact, loadDeployments } from "./evm.js";
import { publicClient, REST } from "./net.js";
import { FEED, fetchPrices } from "./prices.js";
import { submitRound } from "./oracle.js";
import { rebalance } from "./rebalance.js";
import { lastSlot } from "./lib/schedule.js";
import { evmTwin, nativeTrade, treasuryShares } from "./crossvm.js";
import { bankBalance } from "./amm.js";
import { treasuryClient } from "./nativeClient.js";
import { CONVERT_COIN_TYPE_URL } from "./erc20Msgs.js";

const HEARTBEAT = Number(process.env.HEARTBEAT ?? 600);
const DEVIATION_BPS = Number(process.env.DEVIATION_BPS ?? 25);
/**
 * Rebalancing policy: only on schedule, every Monday 12:00 UTC (or daily at 12:00 UTC with
 * REBALANCE_SCHEDULE=daily). At each slot a basket goes back to target if any weight drifted
 * >= SCHEDULED_DRIFT_BPS. Nothing is rebalanced between two slots, whatever the drift.
 */
const REBALANCE_SCHEDULE = (process.env.REBALANCE_SCHEDULE ?? "weekly") as "weekly" | "daily";
const SCHEDULED_DRIFT_BPS = Number(process.env.SCHEDULED_DRIFT_BPS ?? 100);
const REBALANCE_CHECK_EVERY = 900;
const STATE_FILE = new URL("../.keeper-state.json", import.meta.url);
const DEMO_EVERY = Number(process.env.DEMO_EVERY ?? 2700);
const DEMO = process.env.DEMO_TRADES === "1";
const TICK = 60;

const oracleAbi = artifact("DarwinOracle").abi;
const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);

let lastRebalanceCheck = 0;


function readState(): { lastScheduled?: string } {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}
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
  if (Date.now() / 1000 - lastRebalanceCheck < REBALANCE_CHECK_EVERY) return;
  lastRebalanceCheck = Date.now() / 1000;
  const state = readState();
  const slot = lastSlot(new Date(), REBALANCE_SCHEDULE);
  if (state.lastScheduled && new Date(state.lastScheduled) >= slot) return; // not due: wait for the next slot
  for (const key of Object.keys(loadDeployments().baskets)) {
    await rebalance(key, SCHEDULED_DRIFT_BPS).catch((e) => log(`rebalance ${key} failed: ${e.message?.slice(0, 200)}`));
  }
  writeFileSync(STATE_FILE, JSON.stringify({ ...state, lastScheduled: slot.toISOString() }, null, 2));
  log(`scheduled ${REBALANCE_SCHEDULE} rebalance for the ${slot.toISOString()} slot done`);
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
    const want = key === "QOREDW" ? 0.2 : key === "DEGENDW" ? 0.03 : 1 + Math.round(Math.random() * 2);
    const d = loadDeployments();
    const { address } = await treasuryClient();
    let erc = Number((await publicClient.readContract({ address: d.tokens.fUSD, abi: artifact("WQOR").abi, functionName: "balanceOf", args: [evmTwin(address)] })) as bigint) / 1e6;
    if (erc < want) {
      // top up from the faucet's bank-form fUSD, if any
      const bank = await bankBalance(address, `erc20:${d.tokens.fUSD}`);
      if (bank > 0n) {
        await toTwin(`erc20:${d.tokens.fUSD}`, bank);
        erc += Number(bank) / 1e6;
      }
    }
    const usd = Math.min(want, Math.floor(erc * 0.9 * 100) / 100);
    if (usd < 0.02) {
      log("demo: treasury is out of fUSD, claim the faucet (skipping)");
      demoSide++;
      return;
    }
    await nativeTrade("buy", key, usd.toFixed(2));
  } else {
    await nativeTrade("sell", key, formatEther(held / 2n));
  }
  demoSide++;
}

/** Move the treasury's bank-form coin to ERC-20 on its own EVM twin. */
async function toTwin(denom: string, amount: bigint) {
  const { client, address } = await treasuryClient();
  const res: any = await client.signAndBroadcast(
    [{ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom, amount: amount.toString() }, receiver: evmTwin(address), sender: address } }],
    { amount: [{ denom: "uqor", amount: "80000" }], gas: "700000" }, "darwin keeper: faucet fUSD to ERC-20",
  );
  if (res.code) throw new Error(`convert failed: ${res.rawLog}`);
  log(`demo: converted ${amount} faucet fUSD to ERC-20 (tx ${res.transactionHash})`);
}

async function health() {
  const acc = await evmAccount("deployer");
  const bal = await publicClient.getBalance({ address: acc.evm as Address });
  if (bal < 5n * 10n ** 18n) log(`WARNING: relayer has ${formatEther(bal)} QOR left, claim the faucet and fund it`);
}

log(`keeper up: heartbeat ${HEARTBEAT}s, deviation ${DEVIATION_BPS} bps, rebalance ${REBALANCE_SCHEDULE} at 12:00 UTC only (${SCHEDULED_DRIFT_BPS} bps)${DEMO ? `, demo trades every ${DEMO_EVERY}s` : ""}`);
let ticks = 0;
for (;;) {
  for (const [name, fn] of [["oracle", maybeRound], ["rebalance", maybeRebalance], ["demo", maybeDemo]] as const) {
    try {
      await fn();
    } catch (e: any) {
      log(`${name} error: ${(e?.shortMessage ?? e?.message ?? String(e)).slice(0, 300)}`);
    }
  }
  if (ticks++ % 30 === 0) await health().catch(() => {});
  await new Promise((r) => setTimeout(r, TICK * 1000));
}
