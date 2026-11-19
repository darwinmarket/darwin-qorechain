/**
 * Multi-user battery on qorechain-diana: N fresh QoreX-style users (coin 118, hybrid signing) trade
 * Darwin in parallel through native MsgCrossVMCall, exactly as the app does.
 *
 *   tsx src/battery.ts [users=8] [rounds=3] [firstIndex=20]
 *
 * Per user: funded by the deployer (half with ERC-20 fUSD, half with faucet-form bank fUSD),
 * registers its ML-DSA-87 key, then runs `rounds` random actions among buy / sell / redeem in kind,
 * on all four baskets. Every transaction must carry a verified hybrid signature on chain.
 * Afterwards: share accounting per user, basket solvency, router dust, NAV band.
 * Report: docs/e2e/battery-<date>.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BaseError, ContractFunctionRevertedError, decodeErrorResult, encodeFunctionData, maxUint256, toHex, type Abi, type Address, type Hex } from "viem";
import {
  TxClient, buildRegisterPqcKeyMsg, deriveNativeAccount, derivePqcCanonical, directSignerFromPrivateKey,
  fetchPqcStatus, qorechainRegistry, signProofOfPossession,
} from "@qorechain/sdk";
import { evmAccount, mnemonic } from "./accounts.js";
import { artifact, loadDeployments, ROOT, write } from "./evm.js";
import { crossVmCallMsg, evmTwin } from "./crossvm.js";
import { CONVERT_COIN_TYPE_URL, CONVERT_ERC20_TYPE_URL, ERC20_REGISTRY_TYPES } from "./erc20Msgs.js";
import { sendFromRole } from "./nativeClient.js";
import { CHAIN_ID, publicClient, REST, RPC } from "./net.js";

const USERS = Number(process.argv[2] ?? 8);
const ROUNDS = Number(process.argv[3] ?? 3);
const FIRST = Number(process.argv[4] ?? 20);

const d = loadDeployments();
const erc20 = artifact("WQOR").abi;
const basketAbi = artifact("DarwinBasket").abi;
const routerAbi = artifact("DarwinRouter").abi;
const registry = qorechainRegistry(ERC20_REGISTRY_TYPES);
const KEYS = Object.keys(d.baskets);
const FUSD_DENOM = `erc20:${d.tokens.fUSD}`;
const BUY_USD: Record<string, [number, number]> = { BLUEDW: [0.5, 3], BALDW: [0.5, 3], QOREDW: [0.1, 0.8], DEGENDW: [0.02, 0.2] };

type Tx = { user: number; action: string; hash: string; hybrid: boolean; gas: number };
const txs: Tx[] = [];
const failures: string[] = [];
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const bal = (token: Address, who: Address) => publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [who] }) as Promise<bigint>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seed = 0x5eed;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

async function hybridVerified(hash: string): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs/${hash}`);
    if (r.ok) {
      const j: any = await r.json();
      return j.tx_response.events.some((e: any) => e.type === "pqc_hybrid_verify" && e.attributes.some((a: any) => a.key === "status" && a.value === "verified"));
    }
    await sleep(1500);
  }
  return false;
}

async function makeUser(i: number) {
  const m = mnemonic();
  const acc = await deriveNativeAccount(m, { accountIndex: FIRST + i } as any);
  const pqc = derivePqcCanonical(acc.address, m);
  const signer = await directSignerFromPrivateKey(acc.privateKey, "qor");
  return { i, address: acc.address, twin: evmTwin(acc.address), pqc, signer };
}
type User = Awaited<ReturnType<typeof makeUser>>;

const ALL_ERRORS = [...artifact("DarwinRouter").abi, ...basketAbi, ...artifact("DarwinReserve").abi, ...artifact("DarwinOracle").abi].filter((x: any) => x.type === "error") as Abi;

/** Replay the cross-VM calls as eth_call from the user's twin to name the revert. A conversion
 *  message earlier in the same tx is not replayed, so a balance error after one is a side effect. */
async function diagnose(u: User, msgs: any[]): Promise<string> {
  for (const m of msgs) {
    if (!m.typeUrl.endsWith("MsgCrossVMCall")) continue;
    const data = toHex(m.value.payload) as Hex;
    try {
      await publicClient.call({ account: u.twin, to: m.value.targetContract, data });
    } catch (e: any) {
      const raw = e?.data ?? e?.cause?.data ?? (e instanceof BaseError ? (e.walk((x: any) => x?.data) as any)?.data : undefined);
      if (typeof raw === "string" && raw.startsWith("0x") && raw.length >= 10) {
        try {
          const r = decodeErrorResult({ abi: ALL_ERRORS, data: raw as Hex });
          return `${r.errorName}(${(r.args ?? []).map(String).join(",")}) at ${m.value.targetContract}`;
        } catch {
          return `revert ${raw.slice(0, 10)} at ${m.value.targetContract}`;
        }
      }
      return `revert at ${m.value.targetContract}: ${(e?.shortMessage ?? e?.message ?? "").slice(0, 100)}`;
    }
  }
  return "the calls simulate fine now (state changed between quote and inclusion)";
}

async function send(u: User, msgs: any[], action: string, gas = 1_600_000) {
  const client = await TxClient.connect({ rpcEndpoint: RPC, signer: u.signer, registry, pqcKeypair: u.pqc, rest: REST });
  let res: any;
  try {
    res = await client.signAndBroadcast(msgs, { amount: [{ denom: "uqor", amount: String(Math.ceil(gas * 0.11)) }], gas: String(gas) }, `darwin battery: ${action}`);
  } catch (e: any) {
    throw new Error(`${action}: ${await diagnose(u, msgs)} | ${(e?.message ?? "").slice(0, 80)}`);
  }
  if (res.code) throw new Error(`${action}: code ${res.code}, ${await diagnose(u, msgs)}, tx ${res.transactionHash}`);
  const hybrid = await hybridVerified(res.transactionHash);
  txs.push({ user: u.i, action, hash: res.transactionHash, hybrid, gas: Number(res.gasUsed) });
  if (!hybrid) failures.push(`user ${u.i} ${action}: no verified hybrid signature`);
  return res.transactionHash as string;
}

async function register(u: User) {
  const st = await fetchPqcStatus({ rest: REST, address: u.address });
  if (st.registered) return;
  const classical = await TxClient.connect({ rpcEndpoint: RPC, signer: u.signer, registry });
  const pop = signProofOfPossession({ chainId: CHAIN_ID, account: u.address, keypair: u.pqc });
  const r: any = await classical.signAndBroadcast([buildRegisterPqcKeyMsg(u.address, { pqcKeypair: u.pqc, proofOfPossession: pop })], { amount: [{ denom: "uqor", amount: "70000" }], gas: "700000" }, "register ML-DSA-87 key");
  if (r.code) throw new Error(`register: ${r.rawLog}`);
  txs.push({ user: u.i, action: "register key (classical bootstrap)", hash: r.transactionHash, hybrid: false, gas: Number(r.gasUsed) });
}

// ------------------------------------------------------------------------------------- funding
async function fund(users: User[]) {
  const dep = await evmAccount("deployer");
  log(`funding ${users.length} users: 2 QOR each, 15 fUSD each (half ERC-20, half bank form)`);
  await sendFromRole("deployer", [{
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: { fromAddress: dep.cosmos, toAddress: users[0].address, amount: [{ denom: "uqor", amount: "2000000" }] },
  }, ...users.slice(1).map((u) => ({
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: { fromAddress: dep.cosmos, toAddress: u.address, amount: [{ denom: "uqor", amount: "2000000" }] },
  }))], "hybrid", "1500000");
  await sleep(5000);
  const bankUsers = users.filter((u) => u.i % 2 === 1);
  const ercUsers = users.filter((u) => u.i % 2 === 0);
  for (const u of ercUsers) await write("deployer", d.tokens.fUSD, erc20, "transfer", [u.twin, 15_000_000n]);
  if (bankUsers.length) {
    // the deployer turns ERC-20 fUSD into bank form, then pays it like the faucet would
    const total = BigInt(bankUsers.length) * 15_000_000n;
    await sendFromRole("deployer", [{ typeUrl: CONVERT_ERC20_TYPE_URL, value: { contractAddress: d.tokens.fUSD, amount: total.toString(), receiver: dep.cosmos, sender: dep.cosmos } }], "hybrid", "900000");
    await sleep(5000);
    await sendFromRole("deployer", bankUsers.map((u) => ({
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: { fromAddress: dep.cosmos, toAddress: u.address, amount: [{ denom: FUSD_DENOM, amount: "15000000" }] },
    })), "hybrid", "1500000");
  }
  await sleep(5000);
}

// ------------------------------------------------------------------------------------- actions
async function bankFusd(u: User): Promise<bigint> {
  const j: any = await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${u.address}`)).json();
  return BigInt(j.balances.find((b: any) => b.denom === FUSD_DENOM)?.amount ?? "0");
}

const reserveAbi = artifact("DarwinReserve").abi;
let guardRefusals = 0;

/** Largest fUSD buy the reserve can serve right now (what the app's liquidity guard enforces). */
async function capacity(basket: Address): Promise<bigint> {
  const probe = 1_000_000n; // 1 fUSD
  const [shares] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, probe] })) as [bigint, bigint];
  const need = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "mintAmounts", args: [shares] })) as bigint[];
  const comps = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "components" })) as Address[];
  let max = 10n ** 30n;
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].toLowerCase() === d.tokens.fUSD.toLowerCase() || need[i] === 0n) continue;
    const inv = await bal(comps[i], d.reserve);
    const m = (inv * probe) / need[i];
    if (m < max) max = m;
  }
  return max;
}

async function buy(u: User, key: string) {
  const [lo, hi] = BUY_USD[key];
  let usd = BigInt(Math.round((lo + rand() * (hi - lo)) * 1e6));
  const basket = d.baskets[key].address as Address;
  // Mirror the app: never send a buy the reserve cannot fill (other users drain it in parallel).
  const cap = (await capacity(basket)) / 2n; // keep headroom for concurrent buyers
  if (usd > cap) {
    if (cap < 10_000n) {
      guardRefusals++;
      return log(`user ${u.i}: ${key} liquidity guard (capacity ${Number(cap) / 1e6} fUSD), skip`);
    }
    usd = cap;
  }
  const msgs = [];
  const erc = await bal(d.tokens.fUSD, u.twin);
  if (erc < usd) {
    const bank = await bankFusd(u);
    if (bank + erc < usd) return log(`user ${u.i}: out of fUSD, skip buy`);
    msgs.push({ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: FUSD_DENOM, amount: (usd - erc).toString() }, receiver: u.twin, sender: u.address } });
  }
  const allowance = (await publicClient.readContract({ address: d.tokens.fUSD, abi: erc20, functionName: "allowance", args: [u.twin, d.router] })) as bigint;
  if (allowance < usd) msgs.push(crossVmCallMsg(u.address, d.tokens.fUSD, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
  const [quoted] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, usd] })) as [bigint, bigint];
  msgs.push(crossVmCallMsg(u.address, d.router, encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, usd, (quoted * 995n) / 1000n, u.twin] })));
  const s0 = await bal(basket, u.twin);
  const h = await send(u, msgs, `buy ${key} ${(Number(usd) / 1e6).toFixed(2)} fUSD (${msgs.length} msgs)`, 2_000_000 + 400_000 * (msgs.length - 1));
  const s1 = await bal(basket, u.twin);
  if (s1 - s0 < (quoted * 995n) / 1000n) failures.push(`user ${u.i} buy ${key}: got ${s1 - s0}, quoted ${quoted} (${h})`);
}

async function sell(u: User, key: string) {
  const basket = d.baskets[key].address as Address;
  const held = await bal(basket, u.twin);
  if (held === 0n) return buy(u, key);
  const shares = held / 2n || held;
  const msgs = [];
  const allowance = (await publicClient.readContract({ address: basket, abi: erc20, functionName: "allowance", args: [u.twin, d.router] })) as bigint;
  if (allowance < shares) msgs.push(crossVmCallMsg(u.address, basket, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
  const [usdOut] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteSell", args: [basket, shares] })) as [bigint, bigint];
  msgs.push(crossVmCallMsg(u.address, d.router, encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, shares, (usdOut * 995n) / 1000n, u.twin] })));
  const u0 = await bal(d.tokens.fUSD, u.twin);
  await send(u, msgs, `sell ${key} ${(Number(shares) / 1e18).toFixed(4)} shares`, 1_600_000 + 400_000 * (msgs.length - 1));
  const u1 = await bal(d.tokens.fUSD, u.twin);
  if (u1 - u0 < (usdOut * 995n) / 1000n) failures.push(`user ${u.i} sell ${key}: got ${u1 - u0}, quoted ${usdOut}`);
}

async function redeem(u: User, key: string) {
  const basket = d.baskets[key].address as Address;
  const held = await bal(basket, u.twin);
  if (held === 0n) return buy(u, key);
  const shares = held / 3n || held;
  const expected = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "redeemAmounts", args: [shares] })) as bigint[];
  await send(u, [crossVmCallMsg(u.address, basket, encodeFunctionData({ abi: basketAbi, functionName: "redeem", args: [shares, u.twin] }))], `redeem ${key} in kind`, 1_100_000);
  if (!expected.some((x) => x > 0n)) failures.push(`user ${u.i} redeem ${key}: nothing paid`);
}

async function runUser(u: User) {
  try {
    await register(u);
    await buy(u, KEYS[u.i % KEYS.length]); // everyone starts with a buy
    for (let r = 0; r < ROUNDS; r++) {
      const key = KEYS[Math.floor(rand() * KEYS.length)];
      const x = rand();
      if (x < 0.5) await buy(u, key);
      else if (x < 0.8) await sell(u, key);
      else await redeem(u, key);
    }
    log(`user ${u.i} done`);
  } catch (e: any) {
    failures.push(`user ${u.i}: ${(e?.message ?? String(e)).slice(0, 400)}`);
    log(`user ${u.i} FAILED: ${(e?.message ?? e).toString().slice(0, 160)}`);
  }
}

// ------------------------------------------------------------------------------------- checks
async function invariants(users: User[]) {
  const out: string[] = [];
  for (const key of KEYS) {
    const b = d.baskets[key].address as Address;
    const supply = (await publicClient.readContract({ address: b, abi: basketAbi, functionName: "totalSupply" })) as bigint;
    const all = (await publicClient.readContract({ address: b, abi: basketAbi, functionName: "redeemAmounts", args: [supply] })) as bigint[];
    const comps = (await publicClient.readContract({ address: b, abi: basketAbi, functionName: "components" })) as Address[];
    for (let i = 0; i < comps.length; i++) {
      if (all[i] > (await bal(comps[i], b))) failures.push(`${key}: not fully backed in ${comps[i]}`);
    }
    const nps = Number((await publicClient.readContract({ address: b, abi: basketAbi, functionName: "navPerShare" })) as bigint) / 1e18;
    if (!(nps > 9 && nps < 11)) failures.push(`${key}: NAV per share ${nps}`);
    const holders = await Promise.all(users.map((u) => bal(b, u.twin)));
    out.push(`${key}: supply ${(Number(supply) / 1e18).toFixed(4)}, NAV/share ${nps.toFixed(4)}, battery users hold ${(Number(holders.reduce((a, c) => a + c, 0n)) / 1e18).toFixed(4)}`);
  }
  for (const t of [d.tokens.fUSD, d.tokens.fBTC, d.tokens.fETH, d.tokens.WQOR, d.tokens.QWAKK]) {
    if ((await bal(t, d.router)) !== 0n) failures.push(`router holds ${t}`);
  }
  return out;
}

const t0 = Date.now();
const users = await Promise.all(Array.from({ length: USERS }, (_, i) => makeUser(i)));
users.forEach((u) => log(`user ${u.i}: ${u.address} (EVM ${u.twin})`));
await fund(users);
log("users trade in parallel");
await Promise.all(users.map(runUser));
const state = await invariants(users);

// Give the users' leftover gas back to the deployer, so batteries do not drain it.
const dep = await evmAccount("deployer");
let returned = 0;
await Promise.all(users.map(async (u) => {
  try {
    const j: any = await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${u.address}`)).json();
    const uqor = BigInt(j.balances.find((b: any) => b.denom === "uqor")?.amount ?? "0");
    if (uqor <= 300_000n) return;
    const client = await TxClient.connect({ rpcEndpoint: RPC, signer: u.signer, registry, pqcKeypair: u.pqc, rest: REST });
    const r: any = await client.signAndBroadcast([{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: u.address, toAddress: dep.cosmos, amount: [{ denom: "uqor", amount: (uqor - 300_000n).toString() }] } }], { amount: [{ denom: "uqor", amount: "30000" }], gas: "250000" }, "darwin battery: return gas");
    if (!r.code) returned += Number(uqor - 300_000n) / 1e6;
  } catch { /* leftovers can be swept later with sweep.ts */ }
}));
log(`returned ${returned.toFixed(2)} QOR of leftover gas to the deployer`);

const verified = txs.filter((t) => t.hybrid).length;
const tradeTxs = txs.filter((t) => !t.action.startsWith("register"));
const summary = [
  `users ${USERS}, rounds ${ROUNDS}, transactions ${txs.length} (${tradeTxs.length} trades), ${verified}/${tradeTxs.length} trades with a verified hybrid signature`,
  `failures: ${failures.length}`,
  `buys refused by the liquidity guard before signing: ${guardRefusals}`,
  `duration ${Math.round((Date.now() - t0) / 1000)} s`,
];
console.log("\n" + summary.join("\n") + "\n" + state.join("\n") + (failures.length ? "\n" + failures.join("\n") : ""));

const date = new Date().toISOString().slice(0, 16).replace(":", "");
const dir = join(ROOT, "docs/e2e");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `battery-${date}.md`), [
  `# Multi-user battery, ${new Date().toISOString()}`,
  "",
  `Suite \`ops/src/battery.ts\` on qorechain-diana. ${USERS} fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1), trading in parallel through native MsgCrossVMCall.`,
  "",
  `**Result: ${failures.length === 0 ? "PASS" : "FAIL"}.** ${summary.join(". ")}.`,
  "",
  "## Baskets after the run",
  "",
  ...state.map((s) => `- ${s}`),
  "",
  ...(failures.length ? ["## Failures", "", ...failures.map((f) => `- ${f}`), ""] : []),
  "## Transactions",
  "",
  "| User | Action | Hybrid verified | Gas | Tx |",
  "|---|---|---|---|---|",
  ...txs.map((t) => `| ${t.user} | ${t.action} | ${t.action.startsWith("register") ? "n/a (bootstrap)" : t.hybrid ? "yes" : "NO"} | ${t.gas} | \`${t.hash}\` |`),
  "",
].join("\n"));
console.log(`report: docs/e2e/battery-${date}.md`);
if (failures.length) process.exitCode = 1;
