/**
 * Multi-user battery of the windowless path (DarwinAccounts) on qorechain-diana, through the app's
 * API (APP, default production https://darwin.market/qorechain).
 *
 *   tsx src/account-battery.ts [users=10] [rounds=4] [firstIndex=60]
 *
 * N fresh QoreX-style users (coin 118): each registers its ML-DSA-87 key (the only thing a
 * DarwinAccount needs), receives QOR for gas and fUSD in bank form (as the faucet pays it), then,
 * in parallel with the others:
 *   - deposits fUSD with one hybrid-signed MsgSend (the relayer converts it onto the account);
 *   - trades `rounds` random buys and sells on the four baskets, each one message signed like
 *     QoreX's signArbitrary (secp256k1 + ML-DSA-87), never opening an EVM window or granting;
 *   - tries attacks: another user's signature for its own account, a replay, a message expired or
 *     dated too far ahead, a trade paying someone else, a deposit claimed twice and another user's
 *     deposit claimed as its own;
 *   - exits: sells the QOR baskets and withdraws every fUSD back to its wallet.
 * Then every account trade is re-verified off chain (the owner's ML-DSA-87 signature over the text
 * rebuilt from calldata, refused for nonce + 1), and the invariants: users' fUSD conserved up to
 * fees, account nonces = executed messages, nothing left on the relayer's EVM side, baskets fully
 * backed, no router dust, Activity lists each user's trades.
 * Report: docs/e2e/account-battery-<date>.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mldsa87 } from "@qorechain/pqc";
import { addressFromPublicKey, deriveCanonicalPqKey, deriveClassicalKey, signMessage } from "@qorechain/qoresign";
import { fetchEvmWindow } from "@qorechain/qoresign/network";
import {
  TxClient, buildRegisterPqcKeyMsg, deriveNativeAccount, derivePqcCanonical, directSignerFromPrivateKey,
  fetchPqcStatus, qorechainRegistry, signProofOfPossession,
} from "@qorechain/sdk";
import { decodeEventLog, decodeFunctionData, encodeAbiParameters, encodeFunctionData, hexToBytes, keccak256, maxUint256, parseAbi, type Address, type Hex } from "viem";
import { evmAccount, mnemonic, RELAYERS } from "./accounts.js";
import { artifact, loadDeployments, ROOT, write } from "./evm.js";
import { CONVERT_ERC20_TYPE_URL, ERC20_REGISTRY_TYPES } from "./erc20Msgs.js";
import { sendFromRole } from "./nativeClient.js";
import { CHAIN_ID, publicClient, REST, RPC } from "./net.js";

const APP = (process.env.APP ?? "https://darwin.market/qorechain").replace(/\/$/, "");
const USERS = Number(process.argv[2] ?? 10);
const ROUNDS = Number(process.argv[3] ?? 4);
const FIRST = Number(process.argv[4] ?? 60);
const FUND_FUSD = 12_000_000n; // 12 fUSD each, bank form

const d = loadDeployments();
const KEYS = Object.keys(d.baskets);
const FUSD_DENOM = `erc20:${d.tokens.fUSD}`;
const registry = qorechainRegistry(ERC20_REGISTRY_TYPES);
const routerAbi = artifact("DarwinRouter").abi;
const basketAbi = artifact("DarwinBasket").abi;
const factoryAbi = artifact("DarwinAccountFactory").abi;
const accountAbi = artifact("DarwinAccount").abi;
const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function transfer(address, uint256) returns (bool)",
]);
const callsType = [{ type: "tuple[]", components: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }] }] as const;
const BUY_USD: Record<string, [number, number]> = { BLUEDW: [0.5, 2.5], BALDW: [0.5, 2.5], QOREDW: [0.2, 1.5], DEGENDW: [0.1, 0.8] };

type Call = { target: Address; data: Hex };
type Op = { user: number; action: string; ok: boolean; tx?: string; ms: number; detail?: string };
const ops: Op[] = [];
const failures: string[] = [];
const attacks: { user: number; attack: string; refused: boolean; detail: string }[] = [];
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bal = (token: Address, who: Address) => publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [who] }) as Promise<bigint>;
let seed = 0xacc0;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

// ---- users ---------------------------------------------------------------------------------
async function makeUser(i: number) {
  const m = mnemonic();
  const acc = await deriveNativeAccount(m, { accountIndex: FIRST + i } as any);
  const classicalKey = deriveClassicalKey({ mnemonic: m, index: FIRST + i });
  if (addressFromPublicKey(classicalKey.publicKey, "secp256k1").bech32 !== acc.address) throw new Error(`user ${i}: classical key mismatch`);
  return {
    i,
    address: acc.address,
    pqc: derivePqcCanonical(acc.address, m),
    pqKey: deriveCanonicalPqKey({ mnemonic: m, address: acc.address }),
    classicalKey,
    signer: await directSignerFromPrivateKey(acc.privateKey, "qor"),
    account: "" as Address,
    deposited: 0n,
    withdrawn: 0n,
    executed: 0,
    trades: 0,
    lastSigned: null as null | Record<string, unknown>,
    deposits: [] as string[],
  };
}
type User = Awaited<ReturnType<typeof makeUser>>;

async function api(path: string, body?: unknown) {
  const r = await fetch(`${APP}/api/relay/${path}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" } as any);
  const text = await r.text();
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${r.status}: ${text.slice(0, 160)}`);
  }
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}
const info = (u: User) => api(`account?account=${u.address}`);

async function native(u: User, msgs: any[], memo: string, gas = 300_000) {
  const client = await TxClient.connect({ rpcEndpoint: RPC, signer: u.signer, registry, pqcKeypair: u.pqc, rest: REST });
  const r: any = await client.signAndBroadcast(msgs, { amount: [{ denom: "uqor", amount: String(Math.ceil(gas * 0.11)) }], gas: String(gas) }, memo);
  if (r.code) throw new Error(`${memo}: code ${r.code} ${r.rawLog ?? ""}`);
  return r.transactionHash as string;
}

async function register(u: User) {
  const st = await fetchPqcStatus({ rest: REST, address: u.address });
  if (st.registered) return;
  const classical = await TxClient.connect({ rpcEndpoint: RPC, signer: u.signer, registry });
  const pop = signProofOfPossession({ chainId: CHAIN_ID, account: u.address, keypair: u.pqc });
  const r: any = await classical.signAndBroadcast([buildRegisterPqcKeyMsg(u.address, { pqcKeypair: u.pqc, proofOfPossession: pop })], { amount: [{ denom: "uqor", amount: "70000" }], gas: "700000" }, "register ML-DSA-87 key");
  if (r.code) throw new Error(`register: ${r.rawLog}`);
  await sleep(4000);
}

/** What QoreX's signArbitrary produces for the account's current nonce. */
async function signed(u: User, calls: Call[], summary: string, opts: { owner?: User; deadlineIn?: number } = {}) {
  const owner = opts.owner ?? u;
  const acc = await info(owner);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (opts.deadlineIn ?? 300));
  const text = `${summary}\n\nDarwin account ${String(acc.account).toLowerCase()}\nnonce ${acc.nonce}\nvalid until ${deadline}\ncalls ${keccak256(encodeAbiParameters(callsType, [calls]))}`;
  // the signature is u's, whoever the owner field names
  const signature = signMessage({ chainId: CHAIN_ID, signer: u.address, data: text, classicalKey: u.classicalKey, pqKey: u.pqKey });
  return { owner: owner.address, calls, summary, deadline: String(deadline), signature };
}

async function op(u: User, action: string, fn: () => Promise<{ tx?: string; detail?: string } | void>) {
  const t = Date.now();
  try {
    const r = (await fn()) ?? {};
    ops.push({ user: u.i, action, ok: true, tx: r.tx, ms: Date.now() - t, detail: r.detail });
    return true;
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 300);
    ops.push({ user: u.i, action, ok: false, ms: Date.now() - t, detail: msg });
    failures.push(`user ${u.i} ${action}: ${msg}`);
    log(`user ${u.i} ${action} FAILED: ${msg.slice(0, 140)}`);
    return false;
  }
}

async function attack(u: User, name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    attacks.push({ user: u.i, attack: name, refused: false, detail: "ACCEPTED" });
    failures.push(`user ${u.i} attack accepted: ${name}`);
  } catch (e: any) {
    attacks.push({ user: u.i, attack: name, refused: true, detail: String(e?.message ?? e).slice(0, 140) });
  }
}

// ---- actions ---------------------------------------------------------------------------------
async function deposit(u: User, amount: bigint) {
  const rel = (await info(u)).relayer.cosmos;
  await op(u, `deposit ${(Number(amount) / 1e6).toFixed(2)} fUSD`, async () => {
    const tx = await native(u, [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: u.address, toAddress: rel, amount: [{ denom: FUSD_DENOM, amount: amount.toString() }] } }], "Darwin: deposit fUSD to your Darwin account");
    const before = BigInt((await info(u)).fusd);
    const r = await api("deposit", { owner: u.address, txHash: tx });
    const after = BigInt((await info(u)).fusd);
    if (after - before !== amount) throw new Error(`account fUSD +${after - before}, expected +${amount}`);
    u.deposited += amount;
    u.deposits.push(tx);
    return { tx: r.txHash, detail: `send ${tx.slice(0, 10)}…` };
  });
}

async function capacity(basket: Address): Promise<bigint> {
  const probe = 1_000_000n;
  const [shares] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, probe] })) as [bigint, bigint];
  const need = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "mintAmounts", args: [shares] })) as bigint[];
  const comps = (await publicClient.readContract({ address: basket, abi: basketAbi, functionName: "components" })) as Address[];
  let max = 10n ** 30n;
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].toLowerCase() === d.tokens.fUSD.toLowerCase() || need[i] === 0n) continue;
    const m = ((await bal(comps[i], d.reserve)) * probe) / need[i];
    if (m < max) max = m;
  }
  return max;
}

let resolvedAfterCut = 0;
async function exec(u: User, calls: Call[], summary: string) {
  const req = await signed(u, calls, summary);
  u.lastSigned = req;
  const before = BigInt((await info(u)).nonce);
  try {
    const r = await api("execute", req);
    u.executed++;
    return r;
  } catch (e: any) {
    // as the app does: a cut call (HTTP 5xx with no JSON answer) is resolved from the account's nonce
    if (!/^HTTP 5\d\d/.test(String(e?.message))) throw e;
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      if (BigInt((await info(u)).nonce) > before) {
        u.executed++;
        resolvedAfterCut++;
        return { txHash: "", returned: undefined };
      }
    }
    throw e;
  }
}

async function buy(u: User, key: string) {
  const [lo, hi] = BUY_USD[key];
  const basket = d.baskets[key].address as Address;
  let usd = BigInt(Math.round((lo + rand() * (hi - lo)) * 1e6));
  const cap = (await capacity(basket)) / 2n;
  if (usd > cap) usd = cap;
  const a = await info(u);
  if (BigInt(a.fusd) < usd) await deposit(u, usd - BigInt(a.fusd) + 1_000_000n);
  if (usd < 10_000n) return;
  await op(u, `buy ${key} ${(Number(usd) / 1e6).toFixed(2)} fUSD`, async () => {
    const acc = await info(u);
    const [q] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, usd] })) as [bigint, bigint];
    const calls: Call[] = [];
    if (BigInt(acc.allowance.fUSD) < usd) calls.push({ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] }) });
    calls.push({ target: d.router, data: encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, usd, (q * 99n) / 100n, acc.account] }) });
    const s0 = BigInt(acc.shares[key]);
    const r = await exec(u, calls, `Darwin: Buy ${(Number(usd) / 1e6).toFixed(2)} fUSD of ${key}`);
    const s1 = BigInt((await info(u)).shares[key]);
    if (s1 - s0 < (q * 99n) / 100n) throw new Error(`got ${s1 - s0} shares, quoted ${q}`);
    u.trades++;
    return { tx: r.txHash, detail: `+${(Number(s1 - s0) / 1e18).toFixed(4)} ${key}` };
  });
}

async function sell(u: User, key: string, all = false) {
  const basket = d.baskets[key].address as Address;
  const acc0 = await info(u);
  const held = BigInt(acc0.shares[key]);
  if (held === 0n) return all ? undefined : buy(u, key);
  const shares = all ? held : held / 2n || held;
  await op(u, `${all ? "exit: sell all" : "sell"} ${key} ${(Number(shares) / 1e18).toFixed(4)}`, async () => {
    const acc = await info(u);
    const [q] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteSell", args: [basket, shares] })) as [bigint, bigint];
    const calls: Call[] = [];
    if (BigInt(acc.allowance[key]) < shares) calls.push({ target: basket, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] }) });
    calls.push({ target: d.router, data: encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, shares, (q * 99n) / 100n, acc.account] }) });
    const f0 = BigInt(acc.fusd);
    const r = await exec(u, calls, `Darwin: Sell ${(Number(shares) / 1e18).toFixed(6)} ${key}`);
    const f1 = BigInt((await info(u)).fusd);
    if (f1 - f0 < (q * 99n) / 100n) throw new Error(`got ${f1 - f0} fUSD, quoted ${q}`);
    u.trades++;
    return { tx: r.txHash, detail: `+${(Number(f1 - f0) / 1e6).toFixed(4)} fUSD` };
  });
}

async function withdrawAll(u: User) {
  const acc = await info(u);
  const amount = BigInt(acc.fusd);
  if (amount === 0n) return;
  await op(u, `withdraw ${(Number(amount) / 1e6).toFixed(4)} fUSD`, async () => {
    const bank0 = await bankFusd(u.address);
    const r = await exec(u, [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [acc.relayer.evm, amount] }) }], `Darwin: withdraw ${(Number(amount) / 1e6).toFixed(2)} fUSD to your QoreX wallet`);
    let bank1 = bank0;
    for (let k = 0; k < 10 && bank1 - bank0 < amount; k++) {
      await sleep(2000);
      bank1 = await bankFusd(u.address);
    }
    if (bank1 - bank0 !== amount) throw new Error(`wallet fUSD +${bank1 - bank0}, expected +${amount}`);
    u.withdrawn += amount;
    return { tx: r.txHash, detail: `returned ${String(r.returned).slice(0, 10)}…` };
  });
}

async function bankFusd(address: string): Promise<bigint> {
  const j: any = await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${encodeURIComponent(FUSD_DENOM)}`)).json();
  return BigInt(j.balance?.amount ?? "0");
}

// ---- attacks -----------------------------------------------------------------------------------
async function attacksBy(u: User, victim: User) {
  const transfer = (to: Address, amount: bigint): Call[] => [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [to, amount] }) }];
  const rel = (await info(u)).relayer.evm as Address;
  await attack(u, "sign for another user's account (owner = victim)", async () => api("execute", await signed(u, transfer(rel, 1n), "Darwin: withdraw", { owner: victim })));
  await attack(u, "replay its own last executed message", async () => {
    if (!u.lastSigned) throw new Error("nothing executed yet");
    return api("execute", u.lastSigned);
  });
  await attack(u, "a message that already expired", async () => api("execute", await signed(u, transfer(rel, 1n), "Darwin: withdraw", { deadlineIn: -5 })));
  await attack(u, "a message valid for more than 15 minutes", async () => api("execute", await signed(u, transfer(rel, 1n), "Darwin: withdraw", { deadlineIn: 3600 })));
  await attack(u, "a buy that pays someone else", async () => {
    const acc = await info(u);
    const victimAcc = await info(victim);
    return api("execute", await signed(u, [{ target: d.router, data: encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [d.baskets.BLUEDW.address, 10_000n, 0n, victimAcc.account] }) }], `Darwin: Buy for ${acc.account}`));
  });
  await attack(u, "a transfer of fUSD to an address of its choosing", async () => api("execute", await signed(u, transfer(u.address === victim.address ? rel : ((await info(victim)).account as Address), 1n), "Darwin: gift")));
  await attack(u, "claim its own deposit twice", async () => {
    const tx = u.deposits[0];
    if (!tx) throw new Error("no deposit yet");
    const r = await api("deposit", { owner: u.address, txHash: tx });
    if (r.already) throw new Error("refused: already credited");
    return r;
  });
  await attack(u, "claim another user's deposit as its own", async () => {
    const tx = victim.deposits[0];
    if (!tx) throw new Error("victim has no deposit");
    return api("deposit", { owner: u.address, txHash: tx });
  });
}

// ---- verification -----------------------------------------------------------------------------
/**
 * Re-verify every account trade off chain, as the transaction page does in the browser: the
 * relayer's transaction must carry a verified hybrid signature (the native lane), and the owner's
 * ML-DSA-87 signature must verify over the text rebuilt from the calldata, for exactly one nonce.
 */
async function reverify(users: User[]) {
  let verified = 0, total = 0, hybrid = 0;
  for (const o of ops.filter((x) => x.ok && x.tx && /^[0-9A-F]{64}$/.test(x.tx) && /^(buy|sell|exit|withdraw)/.test(x.action))) {
    total++;
    try {
      const j: any = await (await fetch(`${REST}/cosmos/tx/v1beta1/txs/${o.tx}`)).json();
      const t = j.tx_response;
      if (t.events.some((e: any) => e.type === "pqc_hybrid_verify" && e.attributes.some((a: any) => a.key === "status" && a.value === "verified"))) hybrid++;
      const m = j.tx.body.messages.find((x: any) => x["@type"] === "/qorechain.crossvm.v1.MsgCrossVMCall");
      const call = decodeFunctionData({ abi: factoryAbi, data: ("0x" + Buffer.from(m.payload, "base64").toString("hex")) as Hex });
      const [ownerHex, calls, summary, deadline, sig] = call.args as [Hex, Call[], string, bigint, Hex];
      const u = users.find((x) => x.i === o.user)!;
      const account = (await publicClient.readContract({ address: d.accountFactory, abi: factoryAbi, functionName: "accountOf", args: [ownerHex] })) as Address;
      const msg = (n: bigint) => new TextEncoder().encode(`qorechain-msg-v1|${CHAIN_ID}|${summary}\n\nDarwin account ${account.toLowerCase()}\nnonce ${n}\nvalid until ${deadline}\ncalls ${keccak256(encodeAbiParameters(callsType, [calls]))}`);
      const nonce = Number((await publicClient.readContract({ address: account, abi: accountAbi, functionName: "nonce" })) as bigint);
      const matching: number[] = [];
      for (let n = 0; n < nonce; n++) if (mldsa87.verify(u.pqKey.publicKey, msg(BigInt(n)), hexToBytes(sig))) matching.push(n);
      if (matching.length === 1 && ownerHex.toLowerCase() === (await evmOf(u.address)).toLowerCase()) verified++;
      else failures.push(`user ${o.user} ${o.action}: signature re-verification failed (${o.tx}, nonces ${matching.join(",")})`);
    } catch (e: any) {
      failures.push(`user ${o.user} ${o.action}: re-verification error ${String(e?.message ?? e).slice(0, 100)}`);
    }
  }
  if (hybrid !== total) failures.push(`${total - hybrid} account transactions without a verified hybrid signature`);
  return `${verified}/${total} account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text for exactly one nonce; ${hybrid}/${total} hybrid-signed (ML-DSA-87) by the relayer`;
}
const evmOf = async (qor1: string) => (await import("@qorechain/qoresign")).parseAddress(qor1).hex;

async function relayerFunds() {
  const out: Record<string, { bank: bigint; evm: bigint }> = {};
  for (const role of RELAYERS) {
    const r = await evmAccount(role);
    out[role] = { bank: await bankFusd(r.cosmos), evm: await bal(d.tokens.fUSD, r.evm as Address) };
  }
  return out;
}

async function invariants(users: User[], relBefore: Record<string, { bank: bigint; evm: bigint }>) {
  const out: string[] = [];
  const after = await relayerFunds();
  const served = new Map<string, number>();
  for (const u of users) {
    const c = (await info(u)).relayer.cosmos as string;
    served.set(c, (served.get(c) ?? 0) + 1);
  }
  for (const role of RELAYERS) {
    const rel = await evmAccount(role);
    const b = relBefore[role], a = after[role];
    out.push(`${role}: serves ${served.get(rel.cosmos) ?? 0} users; EVM fUSD ${b.evm} -> ${a.evm}, bank fUSD ${b.bank} -> ${a.bank}`);
    if (a.evm !== b.evm) failures.push(`${role} EVM fUSD changed: ${b.evm} -> ${a.evm} (a withdrawal left halfway?)`);
    if (a.bank !== b.bank) failures.push(`${role} bank fUSD changed: ${b.bank} -> ${a.bank} (a deposit not credited?)`);
    const w: any = await fetchEvmWindow({ rest: REST, address: rel.cosmos });
    out.push(`${role} window: scoped to [${(w?.allowedTargets ?? []).join(", ")}], ${w?.remainingTxs} txs left`);
    if (!(w?.allowedTargets ?? []).map((x: string) => x.toLowerCase()).every((x: string) => x === d.accountFactory.toLowerCase())) failures.push(`${role} window not scoped to the factory alone`);
  }
  for (const u of users) {
    const a = await info(u);
    const evmWin: any = await fetchEvmWindow({ rest: REST, address: u.address }).catch(() => null);
    if (evmWin?.live) failures.push(`user ${u.i} has an EVM window (should never need one)`);
    if (Number(a.nonce) !== u.executed) failures.push(`user ${u.i}: account nonce ${a.nonce}, executed ${u.executed}`);
    const grants: any = await (await fetch(`${REST}/cosmos/authz/v1beta1/grants/granter/${u.address}`)).json().catch(() => ({ grants: [] }));
    if ((grants.grants ?? []).length) failures.push(`user ${u.i} has authz grants (should never need one)`);
  }
  for (const key of KEYS) {
    const b = d.baskets[key].address as Address;
    const supply = (await publicClient.readContract({ address: b, abi: basketAbi, functionName: "totalSupply" })) as bigint;
    const all = (await publicClient.readContract({ address: b, abi: basketAbi, functionName: "redeemAmounts", args: [supply] })) as bigint[];
    const comps = (await publicClient.readContract({ address: b, abi: basketAbi, functionName: "components" })) as Address[];
    for (let i = 0; i < comps.length; i++) if (all[i] > (await bal(comps[i], b))) failures.push(`${key}: not fully backed in ${comps[i]}`);
    const nps = Number((await publicClient.readContract({ address: b, abi: basketAbi, functionName: "navPerShare" })) as bigint) / 1e18;
    out.push(`${key}: supply ${(Number(supply) / 1e18).toFixed(4)}, NAV/share ${nps.toFixed(4)}`);
  }
  for (const t of [d.tokens.fUSD, d.tokens.fBTC, d.tokens.fETH, d.tokens.WQOR, d.tokens.QWAKK, d.tokens.fQOR, d.tokens.fQWAKK].filter(Boolean)) {
    if ((await bal(t, d.router)) !== 0n) failures.push(`router holds ${t}`);
  }
  // Activity: the app lists each user's account trades
  let listed = 0, expected = 0;
  for (const u of users) {
    const r = await fetch(`${APP}/api/trades?account=${u.address}`);
    const list: any[] = r.ok ? await r.json() : [];
    const n = (Array.isArray(list) ? list : []).filter((t) => t.account).length;
    listed += Math.min(n, u.trades);
    expected += u.trades;
    if (n < u.trades) failures.push(`user ${u.i}: Activity lists ${n} account trades, made ${u.trades}`);
  }
  out.push(`Activity: ${listed}/${expected} account trades listed`);
  // conservation: what each user put in comes back, minus fees and spreads
  for (const u of users) {
    const bank = await bankFusd(u.address);
    out.push(`user ${u.i}: deposited ${(Number(u.deposited) / 1e6).toFixed(2)}, withdrew ${(Number(u.withdrawn) / 1e6).toFixed(4)}, wallet ${(Number(bank) / 1e6).toFixed(4)} fUSD`);
    if (u.withdrawn > u.deposited) failures.push(`user ${u.i} withdrew more than it deposited`);
  }
  return out;
}

// ---- run -----------------------------------------------------------------------------------------
const t0 = Date.now();
log(`app ${APP}, ${USERS} users, ${ROUNDS} rounds, indexes ${FIRST}..${FIRST + USERS - 1}`);
const users = await Promise.all(Array.from({ length: USERS }, (_, i) => makeUser(i)));
for (const u of users) u.account = (await info(u)).account;
users.forEach((u) => log(`user ${u.i}: ${u.address} -> account ${u.account}`));
const relBefore = await relayerFunds();

// funding: 1.5 QOR of gas, and 12 fUSD in bank form (the faucet's form)
const dep = await evmAccount("deployer");
const need = FUND_FUSD * BigInt(USERS);
const depBank = await bankFusd(dep.cosmos);
const toConvert = depBank >= need ? 0n : need - depBank;
const depErc = await bal(d.tokens.fUSD, dep.evm as Address);
if (toConvert > 0n && depErc < toConvert) {
  log(`deployer draws ${(Number(need - depErc) / 1e6).toFixed(2)} fUSD from the reserve (admin, ML-DSA-87)`);
  const { adminCall } = await import("./evm.js");
  const { encodeAbiParameters: enc, parseAbiParameters } = await import("viem");
  await adminCall(d.reserve, artifact("DarwinReserve").abi, "withdraw", "withdraw", enc(parseAbiParameters("address, uint256, address"), [d.tokens.fUSD, toConvert - depErc, dep.evm as Address]), [d.tokens.fUSD, toConvert - depErc, dep.evm]);
}
if (toConvert > 0n) {
  await sendFromRole("deployer", [{ typeUrl: CONVERT_ERC20_TYPE_URL, value: { contractAddress: d.tokens.fUSD, amount: toConvert.toString(), receiver: dep.cosmos, sender: dep.cosmos } } as any], "hybrid", "2000000");
  await sleep(5000);
}
await sendFromRole("deployer", users.map((u) => ({ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: dep.cosmos, toAddress: u.address, amount: [{ denom: FUSD_DENOM, amount: FUND_FUSD.toString() }, { denom: "uqor", amount: "1500000" }] } })), "hybrid", "2500000"); // coins sorted by denom
await sleep(6000);
log("funded; registering keys");
await Promise.all(users.map((u) => register(u).catch((e) => failures.push(`user ${u.i} register: ${String(e).slice(0, 200)}`))));

log("users trade in parallel");
await Promise.all(users.map(async (u) => {
  await deposit(u, 4_000_000n);
  await buy(u, KEYS[u.i % KEYS.length]);
  for (let r = 0; r < ROUNDS; r++) {
    const key = KEYS[Math.floor(rand() * KEYS.length)];
    if (rand() < 0.6) await buy(u, key);
    else await sell(u, key);
  }
}));
log("attacks");
for (const u of users.slice(0, Math.min(USERS, 4))) await attacksBy(u, users[(u.i + 1) % USERS]);
log("exit: sell the QOR baskets, withdraw everything");
await Promise.all(users.map(async (u) => {
  for (const key of ["QOREDW", "DEGENDW"]) await sell(u, key, true);
  await withdrawAll(u);
}));

log("re-verifying signatures and invariants");
const sigs = await reverify(users);
const state = await invariants(users, relBefore);

// leftover gas and fUSD back to the deployer
let back = 0;
await Promise.all(users.map(async (u) => {
  try {
    const j: any = await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${u.address}`)).json();
    const uqor = BigInt(j.balances.find((b: any) => b.denom === "uqor")?.amount ?? "0");
    const fusd = BigInt(j.balances.find((b: any) => b.denom === FUSD_DENOM)?.amount ?? "0");
    const amount = [...(fusd > 0n ? [{ denom: FUSD_DENOM, amount: fusd.toString() }] : []), ...(uqor > 200_000n ? [{ denom: "uqor", amount: (uqor - 200_000n).toString() }] : [])];
    if (!amount.length) return;
    await native(u, [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: u.address, toAddress: dep.cosmos, amount } }], "darwin battery: return leftovers", 250_000);
    back += Number(uqor - 200_000n) / 1e6;
  } catch { /* sweep.ts can collect later */ }
}));

const okOps = ops.filter((o) => o.ok);
const tradeOps = okOps.filter((o) => /^(buy|sell|exit)/.test(o.action));
const lat = tradeOps.map((o) => o.ms).sort((a, b) => a - b);
const pct = (p: number) => (lat.length ? (lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] / 1000).toFixed(1) : "-");
const summary = [
  `users ${USERS}, rounds ${ROUNDS}, operations ${ops.length} (${okOps.length} ok), trades ${tradeOps.length}, deposits ${okOps.filter((o) => o.action.startsWith("deposit")).length}, withdrawals ${okOps.filter((o) => o.action.startsWith("withdraw")).length}`,
  `attacks ${attacks.length}, refused ${attacks.filter((a) => a.refused).length}`,
  `calls cut before their answer and resolved from the account's nonce: ${resolvedAfterCut}`,
  sigs,
  `trade latency (sign -> confirmed on chain, through the API): p50 ${pct(0.5)} s, p90 ${pct(0.9)} s, max ${pct(1)} s`,
  `failures: ${failures.length}`,
  `duration ${Math.round((Date.now() - t0) / 1000)} s, ${back.toFixed(2)} QOR of leftover gas returned`,
];
console.log("\n" + summary.join("\n") + "\n" + state.join("\n") + (failures.length ? "\n\nFAILURES\n" + failures.join("\n") : ""));

const date = new Date().toISOString().slice(0, 19).replace(/:/g, "");
const dir = join(ROOT, "docs/e2e");
mkdirSync(dir, { recursive: true });
const file = `account-battery-${date}.md`;
writeFileSync(join(dir, file), [
  `# DarwinAccount battery, ${new Date().toISOString()}`,
  "",
  `Suite \`ops/src/account-battery.ts\` against ${APP} on qorechain-diana: ${USERS} fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.`,
  "",
  `**Result: ${failures.length === 0 ? "PASS" : "FAIL"}.**`,
  "",
  ...summary.map((s) => `- ${s}`),
  "",
  "## State after the run",
  "",
  ...state.map((s) => `- ${s}`),
  "",
  "## Attacks",
  "",
  "| User | Attack | Refused | Answer |",
  "|---|---|---|---|",
  ...attacks.map((a) => `| ${a.user} | ${a.attack} | ${a.refused ? "yes" : "**NO**"} | ${a.detail.replace(/\|/g, "/")} |`),
  "",
  ...(failures.length ? ["## Failures", "", ...failures.map((f) => `- ${f}`), ""] : []),
  "## Operations",
  "",
  "| User | Action | OK | ms | Tx | Detail |",
  "|---|---|---|---|---|---|",
  ...ops.map((o) => `| ${o.user} | ${o.action} | ${o.ok ? "yes" : "**NO**"} | ${o.ms} | ${o.tx ? `\`${o.tx}\`` : ""} | ${(o.detail ?? "").replace(/\|/g, "/").slice(0, 160)} |`),
  "",
].join("\n"));
console.log(`report: docs/e2e/${file}`);
if (failures.length) process.exitCode = 1;
