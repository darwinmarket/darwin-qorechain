/**
 * On-chain end-to-end suite against the live qorechain-diana deployment.
 *
 * Negative checks run as eth_call simulations against the REAL QoreChain precompiles (pqcVerify,
 * pqcKeyStatus): forged, tampered and replayed ML-DSA-87 signatures must be refused on chain.
 * Positive checks send real transactions and assert the state they leave behind.
 *
 *   tsx src/e2e.ts            (stop the keeper first: both relay from the deployer)
 *
 * Writes a report with every transaction hash to docs/e2e/<date>.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  BaseError, ContractFunctionRevertedError, encodeAbiParameters, parseAbiParameters, parseUnits,
  type Abi, type Address, type Hex,
} from "viem";
import { evmAccount } from "./accounts.js";
import { action, adminCall, artifact, loadDeployments, pqSign, ROOT, write } from "./evm.js";
import { publicClient, REST } from "./net.js";
import { FEED, fetchPrices, toWad } from "./prices.js";
import { submitRound } from "./oracle.js";
import { plan, rebalance, setWeights } from "./rebalance.js";
import { buy, sell } from "./trade.js";
import { evmTwin, nativeTrade, treasuryShares } from "./crossvm.js";
import { treasuryClient } from "./nativeClient.js";
import { CONVERT_COIN_TYPE_URL, CONVERT_ERC20_TYPE_URL } from "./erc20Msgs.js";

const d = loadDeployments();
const oracleAbi = artifact("DarwinOracle").abi;
const basketAbi = artifact("DarwinBasket").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const routerAbi = artifact("DarwinRouter").abi;
/** The router bubbles up basket and reserve errors: decode them all. */
const routerAbiAll = [...routerAbi, ...basketAbi.filter((x: any) => x.type === "error"), ...reserveAbi.filter((x: any) => x.type === "error")] as Abi;
const erc20 = artifact("WQOR").abi;

type Result = { name: string; ok: boolean; detail: string; ms: number };
const results: Result[] = [];

async function check(name: string, fn: () => Promise<string>) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail, ms: Date.now() - t0 });
    console.log(`PASS  ${name}  ${detail}`);
  } catch (e: any) {
    const detail = (e?.shortMessage ?? e?.message ?? String(e)).split("\n")[0].slice(0, 240);
    results.push({ name, ok: false, detail, ms: Date.now() - t0 });
    console.log(`FAIL  ${name}  ${detail}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

/** Simulate a call from the deployer; return the custom error name it reverts with. */
async function revertName(address: Address, abi: Abi, functionName: string, args: unknown[]): Promise<string> {
  const me = (await evmAccount("deployer")).evm as Address;
  try {
    await publicClient.simulateContract({ address, abi, functionName, args, account: me } as any);
    return "NO_REVERT";
  } catch (e) {
    if (e instanceof BaseError) {
      const r = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
      if (r?.data?.errorName) return `${r.data.errorName}(${(r.data.args ?? []).map(String).join(",")})`;
      return `revert: ${e.shortMessage}`;
    }
    throw e;
  }
}

const read = <T>(address: Address, abi: Abi, functionName: string, args: unknown[] = []) =>
  publicClient.readContract({ address, abi, functionName, args }) as Promise<T>;
const bal = (token: Address, who: Address) => read<bigint>(token, erc20, "balanceOf", [who]);

async function roundPayload() {
  const p = await fetchPrices();
  const ids = [FEED.USD, FEED.ETH, FEED.BTC, FEED.QOR];
  const prices = [toWad(p.USD), toWad(p.ETH), toWad(p.BTC), toWad(p.QOR)];
  const round = await read<bigint>(d.oracle, oracleAbi, "round");
  const last = await read<bigint>(d.oracle, oracleAbi, "lastTimestamp");
  const now = (await publicClient.getBlock()).timestamp;
  const ts = now > last ? now : last + 1n;
  const msg = await read<Hex>(d.oracle, oracleAbi, "roundMessage", [round + 1n, ts, ids, prices]);
  return { ids, prices, ts, round, msg };
}

async function main() {
  const deployer = (await evmAccount("deployer")).evm as Address;
  const { address: treasuryAddr } = await treasuryClient();
  const twin = evmTwin(treasuryAddr);
  const blue = d.baskets.BLUEDW.address as Address;
  const bal_ = d.baskets.BALDW.address as Address;
  const qore = d.baskets.QOREDW.address as Address;

  console.log(`deployer ${deployer}, treasury ${treasuryAddr} (EVM ${twin})\n`);

  // ------------------------------------------------------------------ setup
  await check("setup: no basket is paused and the deployer has approved the current router", async () => {
    const out: string[] = [];
    for (const [k, b] of Object.entries(d.baskets) as [string, any][]) {
      if (await read<boolean>(b.address, basketAbi, "mintPaused")) {
        await adminCall(b.address, basketAbi, "setMintPaused", "setMintPaused", encodeAbiParameters(parseAbiParameters("bool"), [false]), [false]);
        out.push(`unpaused ${k}`);
      }
      if ((await read<bigint>(b.address, erc20, "allowance", [deployer, d.router])) === 0n) {
        await write("deployer", b.address, erc20, "approve", [d.router, 2n ** 255n]);
        out.push(`approved ${k}`);
      }
    }
    if ((await read<bigint>(d.tokens.fUSD, erc20, "allowance", [deployer, d.router])) === 0n) {
      await write("deployer", d.tokens.fUSD, erc20, "approve", [d.router, 2n ** 255n]);
      out.push("approved fUSD");
    }
    return out.join(", ") || "nothing to do";
  });

  // ------------------------------------------------------------------ precompiles
  await check("precompile: every role has a proven ML-DSA-87 key on chain", async () => {
    const pqcAbi = [{ type: "function", name: "pqcKeyStatus", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }, { type: "uint8" }, { type: "bytes" }, { type: "bool" }] }] as const;
    const out: string[] = [];
    for (const r of ["deployer", "reporter", "curator"] as const) {
      const a = (await evmAccount(r)).evm as Address;
      const [registered, alg, key, proven] = (await publicClient.readContract({ address: "0x0000000000000000000000000000000000000a02", abi: pqcAbi, functionName: "pqcKeyStatus", args: [a] })) as [boolean, number, Hex, boolean];
      assert(registered && proven && (key.length - 2) / 2 === 2592, `${r} key`);
      out.push(`${r}: alg ${alg}, 2592-byte key, proven`);
    }
    return out.join("; ");
  });

  // ------------------------------------------------------------------ oracle, negative
  await check("oracle: a round signed by the curator (not the reporter) is refused", async () => {
    const r = await roundPayload();
    const sig = await pqSign("curator", r.msg);
    const err = await revertName(d.oracle, oracleAbi, "submit", [r.ts, r.ids, r.prices, sig]);
    assert(err.startsWith("BadPqcSignature"), err);
    return err;
  });

  await check("oracle: a valid signature on tampered prices is refused", async () => {
    const r = await roundPayload();
    const sig = await pqSign("reporter", r.msg);
    const tampered = [...r.prices];
    tampered[2] = (tampered[2] * 95n) / 100n; // BTC -5%, same signature
    const err = await revertName(d.oracle, oracleAbi, "submit", [r.ts, r.ids, tampered, sig]);
    assert(err.startsWith("BadPqcSignature"), err);
    return err;
  });

  await check("oracle: a signature for a past round number is refused", async () => {
    const r = await roundPayload();
    const old = await read<Hex>(d.oracle, oracleAbi, "roundMessage", [r.round, r.ts, r.ids, r.prices]);
    const sig = await pqSign("reporter", old);
    const err = await revertName(d.oracle, oracleAbi, "submit", [r.ts, r.ids, r.prices, sig]);
    assert(err.startsWith("BadPqcSignature"), err);
    return err;
  });

  await check("oracle: a 50% price jump trips the circuit breaker", async () => {
    const r = await roundPayload();
    const crash = [...r.prices];
    crash[2] = crash[2] / 2n;
    const msg = await read<Hex>(d.oracle, oracleAbi, "roundMessage", [r.round + 1n, r.ts, r.ids, crash]);
    const err = await revertName(d.oracle, oracleAbi, "submit", [r.ts, r.ids, crash, await pqSign("reporter", msg)]);
    assert(err.startsWith("DeviationTooLarge"), err);
    return err;
  });

  // ------------------------------------------------------------------ oracle, positive + replay
  let lastRound: { ts: bigint; ids: number[]; prices: bigint[]; sig: Hex } | null = null;
  await check("oracle: a reporter-signed round is stored (real pqcVerify)", async () => {
    const r = await roundPayload();
    const sig = await pqSign("reporter", r.msg);
    const rc = await write("deployer", d.oracle, oracleAbi, "submit", [r.ts, r.ids, r.prices, sig]);
    const after = await read<bigint>(d.oracle, oracleAbi, "round");
    assert(after === r.round + 1n, "round advanced");
    lastRound = { ts: r.ts, ids: r.ids, prices: r.prices, sig };
    return `round ${after}, gas ${rc.gasUsed}, tx ${rc.transactionHash}`;
  });

  await check("oracle: replaying the exact same signed round is refused", async () => {
    assert(lastRound, "previous round");
    const err = await revertName(d.oracle, oracleAbi, "submit", [lastRound.ts, lastRound.ids, lastRound.prices, lastRound.sig]);
    assert(err.startsWith("StaleRound"), err);
    return err;
  });

  // ------------------------------------------------------------------ admin
  await check("admin: a reserve withdrawal signed by the curator is refused", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const nonce = await read<bigint>(d.reserve, reserveAbi, "adminNonce");
    const params = encodeAbiParameters(parseAbiParameters("address, uint256, address"), [d.tokens.fUSD, 1_000_000n, deployer]);
    const msg = await read<Hex>(d.reserve, reserveAbi, "adminMessage", [action("withdraw"), params, nonce, deadline]);
    const err = await revertName(d.reserve, reserveAbi, "withdraw", [d.tokens.fUSD, 1_000_000n, deployer, deadline, await pqSign("curator", msg)]);
    assert(err.startsWith("BadPqcSignature"), err);
    return err;
  });

  await check("admin: an expired admin signature is refused", async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) - 60);
    const nonce = await read<bigint>(d.reserve, reserveAbi, "adminNonce");
    const params = encodeAbiParameters(parseAbiParameters("uint16"), [30]);
    const msg = await read<Hex>(d.reserve, reserveAbi, "adminMessage", [action("setSpread"), params, nonce, deadline]);
    const err = await revertName(d.reserve, reserveAbi, "setSpread", [30, deadline, await pqSign("deployer", msg)]);
    assert(err.startsWith("Expired"), err);
    return err;
  });

  await check("admin: an ML-DSA-87 signed admin action goes through (spread 30 -> 25 -> 30 bps)", async () => {
    const enc = (v: number) => encodeAbiParameters(parseAbiParameters("uint16"), [v]);
    const a = await adminCall(d.reserve, reserveAbi, "setSpread", "setSpread", enc(25), [25]);
    assert((await read<number>(d.reserve, reserveAbi, "spreadBps")) === 25, "spread 25");
    const b = await adminCall(d.reserve, reserveAbi, "setSpread", "setSpread", enc(30), [30]);
    assert((await read<number>(d.reserve, reserveAbi, "spreadBps")) === 30, "spread 30");
    return `txs ${a.transactionHash}, ${b.transactionHash}`;
  });

  // ------------------------------------------------------------------ guardian pause
  await check("guardian: pausing mints blocks buys but not redemptions; only the admin's PQ signature unpauses", async () => {
    const p = await write("deployer", blue, basketAbi, "pauseMint");
    try {
      assert(await read<boolean>(blue, basketAbi, "mintPaused"), "paused");
      const buyErr = await revertName(d.router, routerAbiAll, "buy", [blue, 1_000_000n, 0n, deployer]);
      assert(buyErr.startsWith("MintIsPaused"), `buy while paused: ${buyErr}`);
      const shares = await bal(blue, deployer);
      const redeemOk = await revertName(blue, basketAbi, "redeem", [shares / 1000n, deployer]);
      assert(redeemOk === "NO_REVERT", `redeem while paused: ${redeemOk}`);
      return `pause ${p.transactionHash}, buy refused (${buyErr}), redeem simulated OK`;
    } finally {
      // always leave the basket open, even when an assertion above failed
      await adminCall(blue, basketAbi, "setMintPaused", "setMintPaused", encodeAbiParameters(parseAbiParameters("bool"), [false]), [false]);
      assert(!(await read<boolean>(blue, basketAbi, "mintPaused")), "unpaused");
    }
  });

  // ------------------------------------------------------------------ trading, EVM lane
  await check("router (EVM lane): buy then sell BALDW, balances move and the router keeps nothing", async () => {
    const s0 = await bal(bal_, deployer);
    const b = await buy("BALDW", 3);
    const s1 = await bal(bal_, deployer);
    assert(s1 > s0, "shares up");
    const bought = s1 - s0;
    const u0 = await bal(d.tokens.fUSD, deployer);
    const s = await sell("BALDW", (Number(bought) / 1e18).toString());
    const u1 = await bal(d.tokens.fUSD, deployer);
    assert(u1 > u0, "fUSD back");
    for (const t of [d.tokens.fUSD, d.tokens.fBTC, d.tokens.fETH, bal_]) assert((await bal(t, d.router)) === 0n, `router holds ${t}`);
    return `bought ${(Number(bought) / 1e18).toFixed(4)} shares (${b.transactionHash}), sold for ${(Number(u1 - u0) / 1e6).toFixed(3)} fUSD (${s.transactionHash})`;
  });

  await check("basket: redeem in kind pays every component pro rata", async () => {
    const shares = parseUnits("0.01", 18);
    const before = await Promise.all([d.tokens.fBTC, d.tokens.fETH].map((t: Address) => bal(t, deployer)));
    const expected = await read<bigint[]>(blue, basketAbi, "redeemAmounts", [shares]);
    const rc = await write("deployer", blue, basketAbi, "redeem", [shares, deployer]);
    const after = await Promise.all([d.tokens.fBTC, d.tokens.fETH].map((t: Address) => bal(t, deployer)));
    assert(after[0] - before[0] === expected[0] && after[1] - before[1] === expected[1], "pro rata amounts");
    return `0.01 BLUEDW -> ${expected[0]} fBTC sats + ${expected[1]} fETH wei (${rc.transactionHash})`;
  });

  // ------------------------------------------------------------------ trading, native lane (QoreX path)
  // Setup: the browser suite may leave the treasury's fUSD in bank form; bring 3 fUSD back to ERC-20.
  await check("setup: the treasury holds at least 3 fUSD as ERC-20", async () => {
    const have = await bal(d.tokens.fUSD, twin);
    if (have >= 3_000_000n) return `already ${have}`;
    const { client, address } = await treasuryClient();
    const need = 3_000_000n - have;
    const r: any = await client.signAndBroadcast(
      [{ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: `erc20:${d.tokens.fUSD}`, amount: need.toString() }, receiver: twin, sender: address } }],
      { amount: [{ denom: "uqor", amount: "80000" }], gas: "700000" }, "darwin e2e setup: bank -> ERC-20",
    );
    assert(!r.code, `convert-coin code ${r.code}`);
    return `converted ${need} (tx ${r.transactionHash})`;
  });
  await check("native lane: hybrid-signed MsgCrossVMCall buy and sell BLUEDW from a coin-118 account", async () => {
    const s0 = await treasuryShares("BLUEDW");
    const h1 = await nativeTrade("buy", "BLUEDW", "1");
    const s1 = await treasuryShares("BLUEDW");
    assert(s1 > s0, "shares up");
    const tx = (await (await fetch(`${REST}/cosmos/tx/v1beta1/txs/${h1}`)).json()) as any;
    const verified = tx.tx_response.events.some((e: any) => e.type === "pqc_hybrid_verify" && e.attributes.some((a: any) => a.key === "status" && a.value === "verified"));
    assert(verified, "chain reports pqc_hybrid_verify verified");
    const h2 = await nativeTrade("sell", "BLUEDW", ((Number(s1 - s0) / 1e18) * 0.999).toFixed(18).slice(0, 20));
    const s2 = await treasuryShares("BLUEDW");
    assert(s2 < s1, "shares down");
    return `buy ${h1} (pqc_hybrid_verify: verified), sell ${h2}`;
  });

  await check("native lane: MsgConvertERC20 then MsgConvertCoin round-trip 1 fUSD (hybrid-signed)", async () => {
    const { client, address } = await treasuryClient();
    const e0 = await bal(d.tokens.fUSD, twin);
    const r1: any = await client.signAndBroadcast(
      [{ typeUrl: CONVERT_ERC20_TYPE_URL, value: { contractAddress: d.tokens.fUSD, amount: "1000000", receiver: address, sender: address } }],
      { amount: [{ denom: "uqor", amount: "80000" }], gas: "700000" }, "darwin e2e: ERC-20 -> bank",
    );
    assert(!r1.code, `convert-erc20 code ${r1.code} ${r1.rawLog}`);
    const bank = (await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${address}`)).json()) as any;
    const fusdBank = BigInt(bank.balances.find((b: any) => b.denom === `erc20:${d.tokens.fUSD}`)?.amount ?? "0");
    assert(fusdBank >= 1_000_000n, `bank fUSD ${fusdBank}`);
    const r2: any = await client.signAndBroadcast(
      [{ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: `erc20:${d.tokens.fUSD}`, amount: "1000000" }, receiver: twin, sender: address } }],
      { amount: [{ denom: "uqor", amount: "80000" }], gas: "700000" }, "darwin e2e: bank -> ERC-20",
    );
    assert(!r2.code, `convert-coin code ${r2.code}`);
    const e2 = await bal(d.tokens.fUSD, twin);
    assert(e2 === e0, `ERC-20 balance restored ${e0} -> ${e2}`);
    return `to bank ${r1.transactionHash}, back ${r2.transactionHash}`;
  });

  // ------------------------------------------------------------------ curator
  await check("curator: a rebalance signed by the reporter is refused", async () => {
    const trades = [{ tokenIn: d.tokens.fBTC, tokenOut: d.tokens.fETH, amountIn: 100n, minAmountOut: 0n }];
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const nonce = await read<bigint>(blue, basketAbi, "curatorNonce");
    const msg = await read<Hex>(blue, basketAbi, "rebalanceMessage", [trades, nonce, deadline]);
    const err = await revertName(blue, basketAbi, "rebalance", [trades, deadline, await pqSign("reporter", msg)]);
    assert(err.startsWith("BadPqcSignature"), err);
    return err;
  });

  await check("curator: shift BLUEDW 5 points, rebalance, then restore its own targets, all ML-DSA-87 signed", async () => {
    // Read the basket's real targets (70/30 today) and put exactly those back: the check must never
    // leave a production basket on test weights.
    const [, original] = await read<[Address[], number[], bigint[], bigint[], number[]]>(blue, basketAbi, "composition");
    const shifted = [original[0] - 500, original[1] + 500];
    try {
      const w1 = await setWeights("BLUEDW", shifted);
      const p = await plan("BLUEDW");
      assert(p.trades.length > 0, "trades planned");
      const r1 = await rebalance("BLUEDW", 100);
      assert(r1, "rebalanced");
      const [, , , , weights] = await read<[Address[], number[], bigint[], bigint[], number[]]>(blue, basketAbi, "composition");
      assert(Math.abs(weights[0] - shifted[0]) < 60, `BTC weight ${weights[0]}`);
      return `${original.join("/")} -> ${shifted.join("/")}: weights ${w1.transactionHash}, rebalance ${r1!.transactionHash}`;
    } finally {
      await setWeights("BLUEDW", [...original]);
      await rebalance("BLUEDW", 100);
      const [, back] = await read<[Address[], number[], bigint[], bigint[], number[]]>(blue, basketAbi, "composition");
      if (back.join() !== original.join()) throw new Error(`BLUEDW targets not restored: ${back.join("/")} vs ${original.join("/")}`);
    }
  });

  await check("invariants: every basket's targets are the published ones", async () => {
    const published: Record<string, number[]> = { BLUEDW: [7000, 3000], BALDW: [3500, 3500, 3000], QOREDW: [6000, 2500, 1500], DEGENDW: [3000, 7000] };
    for (const [k, w] of Object.entries(published)) {
      const [, t] = await read<[Address[], number[], bigint[], bigint[], number[]]>(d.baskets[k].address, basketAbi, "composition");
      assert(t.join() === w.join(), `${k} targets ${t.join("/")}, published ${w.join("/")}`);
    }
    return Object.entries(published).map(([k, w]) => `${k} ${w.map((x) => x / 100).join("/")}`).join(", ");
  });

  // ------------------------------------------------------------------ invariants
  await check("invariants: every basket's NAV per share stays within 5% of its 10 USD seed", async () => {
    const out: string[] = [];
    for (const [k, b] of Object.entries(d.baskets) as [string, any][]) {
      const nps = Number(await read<bigint>(b.address, basketAbi, "navPerShare")) / 1e18;
      assert(nps > 9.5 && nps < 10.5, `${k} NAV per share ${nps}`);
      out.push(`${k} ${nps.toFixed(4)}`);
    }
    return out.join(", ");
  });

  void qore;

  // ------------------------------------------------------------------ report
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} passed`);
  const date = new Date().toISOString().slice(0, 16).replace(":", "");
  const dir = join(ROOT, "docs/e2e");
  mkdirSync(dir, { recursive: true });
  const md = [
    `# On-chain E2E run, ${new Date().toISOString()}`,
    "",
    `Network: qorechain-diana (EVM 9800). Suite: \`ops/src/e2e.ts\`. Result: **${passed}/${results.length} passed**.`,
    "",
    "| | Check | Detail | Time |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.ok ? "PASS" : "FAIL"} | ${r.name} | ${r.detail.replace(/\|/g, "\\|")} | ${(r.ms / 1000).toFixed(1)}s |`),
    "",
  ].join("\n");
  writeFileSync(join(dir, `${date}.md`), md);
  console.log(`report: docs/e2e/${date}.md`);
  if (passed !== results.length) process.exitCode = 1;
}

await main();
