/**
 * Reconcile every DarwinAccount deposit with its credits, over the relayers' whole history.
 *
 *   tsx src/reconcile-deposits.ts          audit only
 *   tsx src/reconcile-deposits.ts --fix    also credit deposits never credited (deployer covers any
 *                                          shortfall of the relayer's float first)
 *
 * A deposit is a MsgSend of fUSD to a relayer with memo "Darwin: deposit…"; its credit is the
 * relayer's transaction with memo `darwin deposit <hash>`. Found by the multi-user battery of
 * 2026-11-20: the relayer's first settle read only its latest 100 transactions and credited ten
 * deposits twice. This audit reads every page of both sides.
 */
import { parseAddress } from "@qorechain/qoresign";
import { evmAccount, RELAYERS, type Role } from "./accounts.js";
import { artifact, loadDeployments } from "./evm.js";
import { sendFromRole } from "./nativeClient.js";
import { publicClient, REST } from "./net.js";

const FIX = process.argv.includes("--fix");
const d = loadDeployments();
const FUSD_DENOM = `erc20:${d.tokens.fUSD}`;

async function all(query: string) {
  const out: any[] = [];
  for (let page = 1; page <= 50; page++) {
    const qs = new URLSearchParams({ query, order_by: "ORDER_BY_ASC", "pagination.limit": "100", page: String(page) });
    const r: any = await (await fetch(`${REST}/cosmos/tx/v1beta1/txs?${qs}`)).json();
    const txs = r.tx_responses ?? [];
    out.push(...txs);
    if (txs.length < 100) break;
  }
  return out;
}
const bank = async (a: string) => BigInt(((await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${a}/by_denom?denom=${encodeURIComponent(FUSD_DENOM)}`)).json()) as any).balance?.amount ?? "0");

const rows: string[] = [];
let shortfallTotal = 0n;
for (const role of RELAYERS as Role[]) {
  const rel = await evmAccount(role);
  const [incoming, own] = await Promise.all([all(`transfer.recipient='${rel.cosmos}'`), all(`message.sender='${rel.cosmos}'`)]);
  const credits = new Map<string, number>();
  for (const t of own) {
    const m = /^darwin deposit ([0-9A-F]{64})$/.exec(String(t.tx?.body?.memo ?? ""));
    if (m && t.code === 0) credits.set(m[1], (credits.get(m[1]) ?? 0) + 1);
  }
  let received = 0n, credited = 0n, over = 0n;
  const missing: { hash: string; from: string; amount: bigint }[] = [];
  for (const t of incoming) {
    if (t.code !== 0 || !String(t.tx?.body?.memo ?? "").startsWith("Darwin: deposit")) continue;
    for (const m of t.tx.body.messages as any[]) {
      if (!m["@type"].endsWith("MsgSend") || m.to_address !== rel.cosmos) continue;
      const amount = (m.amount ?? []).filter((c: any) => c.denom === FUSD_DENOM).reduce((s: bigint, c: any) => s + BigInt(c.amount), 0n);
      if (amount === 0n) continue;
      received += amount;
      const n = credits.get(t.txhash) ?? 0;
      credited += amount * BigInt(n);
      if (n === 0) missing.push({ hash: t.txhash, from: m.from_address, amount });
      if (n > 1) {
        over += amount * BigInt(n - 1);
        rows.push(`${role}: deposit ${t.txhash.slice(0, 12)}… of ${Number(amount) / 1e6} fUSD from ${m.from_address} credited ${n} times`);
      }
    }
  }
  const float = await bank(rel.cosmos);
  const owed = missing.reduce((s, x) => s + x.amount, 0n);
  rows.push(`${role}: received ${Number(received) / 1e6} fUSD in deposits, credited ${Number(credited) / 1e6}, over-credited ${Number(over) / 1e6}, never credited ${missing.length} (${Number(owed) / 1e6}), float ${Number(float) / 1e6}`);
  for (const x of missing) rows.push(`${role}: NOT credited ${x.hash} ${Number(x.amount) / 1e6} fUSD from ${x.from}`);
  if (FIX && missing.length) {
    if (float < owed) {
      const short = owed - float;
      shortfallTotal += short;
      const dep = await evmAccount("deployer");
      rows.push(`${role}: deployer covers the float's shortfall of ${Number(short) / 1e6} fUSD`);
      await sendFromRole("deployer", [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: dep.cosmos, toAddress: rel.cosmos, amount: [{ denom: FUSD_DENOM, amount: short.toString() }] } } as any], "hybrid", "300000");
      await new Promise((r) => setTimeout(r, 6000));
    }
    const factoryAbi = artifact("DarwinAccountFactory").abi;
    for (const x of missing) {
      const acc = (await publicClient.readContract({ address: d.accountFactory, abi: factoryAbi, functionName: "accountOf", args: [parseAddress(x.from).hex] })) as string;
      const tx = await sendFromRole(role, [
        { typeUrl: "/cosmos.evm.erc20.v1.MsgConvertCoin", value: { coin: { denom: FUSD_DENOM, amount: x.amount.toString() }, receiver: acc, sender: rel.cosmos } } as any,
        { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: rel.cosmos, toAddress: x.from, amount: [{ denom: "uqor", amount: "1" }] } } as any,
      ], "hybrid", "2000000", `darwin deposit ${x.hash}`);
      rows.push(`${role}: credited ${x.hash.slice(0, 12)}… -> ${acc} (${tx})`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
console.log(rows.join("\n"));
if (shortfallTotal) console.log(`deployer covered ${Number(shortfallTotal) / 1e6} fUSD in total`);
