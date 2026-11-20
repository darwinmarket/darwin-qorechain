/**
 * The relayer pool of DarwinAccounts (app/src/server/accounts.ts): relayer (index 3) and relayer2..4
 * (4, 5, 6). Idempotent: tops each one up to TARGET QOR from the deployer, registers its ML-DSA-87
 * key (with proof of possession) and opens its EVM window, scoped to the account factory alone.
 *
 *   tsx src/relayer-pool.ts [targetQor=40]
 */
import { fetchEvmWindow } from "@qorechain/qoresign/network";
import { evmAccount, RELAYERS } from "./accounts.js";
import { loadDeployments } from "./evm.js";
import { sendFromRole } from "./nativeClient.js";
import { REST } from "./net.js";
import { open, register } from "./window.js";

const TARGET = BigInt(Number(process.argv[2] ?? 40) * 1e6);
const d = loadDeployments();
const dep = await evmAccount("deployer");
const uqor = async (a: string) => BigInt(((await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${a}/by_denom?denom=uqor`)).json()) as any).balance?.amount ?? "0");

const tops = [];
for (const role of RELAYERS) {
  const acc = await evmAccount(role);
  const have = await uqor(acc.cosmos);
  if (have < TARGET) tops.push({ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: dep.cosmos, toAddress: acc.cosmos, amount: [{ denom: "uqor", amount: String(TARGET - have) }] } });
  console.log(`${role}: ${acc.cosmos} (${acc.evm}) ${Number(have) / 1e6} QOR`);
}
if (tops.length) {
  console.log("top-up", await sendFromRole("deployer", tops as any, "hybrid", "1200000"));
  await new Promise((r) => setTimeout(r, 6000));
}
for (const role of RELAYERS) {
  await register(role);
  const acc = await evmAccount(role);
  const w: any = await fetchEvmWindow({ rest: REST, address: acc.cosmos }).catch(() => null);
  const scoped = (w?.allowedTargets ?? []).map((a: string) => a.toLowerCase());
  if (w?.live && Number(w.remainingBlocks) > 2000 && scoped.length === 1 && scoped[0] === d.accountFactory.toLowerCase()) {
    console.log(`${role}: window ok (${w.remainingTxs} txs, ${w.remainingBlocks} blocks)`);
    continue;
  }
  await new Promise((r) => setTimeout(r, 5000));
  await open(role, 17_280n, 1_000n, [d.accountFactory.toLowerCase()]);
}
