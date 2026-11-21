/**
 * Every transaction Darwin's accounts sent on QoreChain since a date: each must carry a hybrid
 * signature the chain verified (pqc_hybrid_verify status=verified). An EVM transaction (ECDSA
 * alone, the explorer's "not quantum-safe") or a classical-only one is listed.
 *
 *   tsx src/pq-audit.ts [since=2026-11-21T09:00:00Z]
 *
 * Accounts: the deployer (keeper: rounds, rebalances, admin), the four relayers. The one expected
 * exception is a contract creation (a cross-VM call cannot create one): none since the date.
 */
import { evmAccount, RELAYERS, type Role } from "./accounts.js";
import { REST } from "./net.js";

const SINCE = Date.parse(process.argv[2] ?? "2026-11-21T09:00:00Z");

async function txsOf(sender: string) {
  const out: any[] = [];
  for (let page = 1; page <= 30; page++) {
    const qs = new URLSearchParams({ query: `message.sender='${sender}'`, order_by: "ORDER_BY_DESC", "pagination.limit": "100", page: String(page) });
    const r: any = await (await fetch(`${REST}/cosmos/tx/v1beta1/txs?${qs}`)).json();
    const txs = r.tx_responses ?? [];
    out.push(...txs.filter((t: any) => Date.parse(t.timestamp) >= SINCE));
    if (txs.length < 100 || txs.some((t: any) => Date.parse(t.timestamp) < SINCE)) break;
  }
  return out;
}

let bad = 0;
let total = 0;
for (const role of ["deployer", ...RELAYERS] as Role[]) {
  const a = await evmAccount(role);
  const txs = (await txsOf(a.cosmos)).filter((t) => t.code === 0);
  const kinds = new Map<string, number>();
  const notHybrid: string[] = [];
  for (const t of txs) {
    const type = (t.tx.body.messages as any[]).map((m) => m["@type"].split(".").at(-1)).join("+");
    kinds.set(type, (kinds.get(type) ?? 0) + 1);
    const hybrid = t.events.some((e: any) => e.type === "pqc_hybrid_verify" && e.attributes.some((x: any) => x.key === "status" && x.value === "verified"));
    if (!hybrid) notHybrid.push(`${t.txhash} ${type} ${t.timestamp}`);
  }
  total += txs.length;
  bad += notHybrid.length;
  console.log(`${role.padEnd(9)} ${txs.length} txs, ${txs.length - notHybrid.length} hybrid-verified [${[...kinds].map(([k, n]) => `${k} x${n}`).join(", ")}]`);
  for (const x of notHybrid) console.log(`  NOT HYBRID ${x}`);
}
console.log(`\n${total - bad}/${total} transactions since ${new Date(SINCE).toISOString()} carry a hybrid signature the chain verified`);
if (bad) process.exitCode = 1;
