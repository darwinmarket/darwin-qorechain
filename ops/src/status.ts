import { fetchPqcStatus, isRegisteredPqcKey, fetchEvmWindow } from "@qorechain/sdk";
import { evmAccount, treasury, type Role } from "./accounts.js";
import { REST, publicClient } from "./net.js";
import { formatEther } from "viem";

async function bank(address: string) {
  const r = await fetch(`${REST}/cosmos/bank/v1beta1/balances/${address}`);
  const j = (await r.json()) as { balances?: { denom: string; amount: string }[] };
  return (j.balances ?? []).map((b) => `${b.amount} ${b.denom.replace(/^erc20:(0x.{6}).*/, "erc20:$1…")}`).join(", ") || "empty";
}

const t = await treasury();
const ts = await fetchPqcStatus({ rest: REST, address: t.native.address });
console.log(`treasury ${t.native.address}`);
console.log(`  pqc: ${ts.registered ? (isRegisteredPqcKey(ts, t.pqc.publicKey) ? "registered (matches canonical key)" : "registered, DIFFERENT key") : "not registered"}`);
console.log(`  bank: ${await bank(t.native.address)}`);
for (const role of ["deployer", "reporter", "curator"] as Role[]) {
  const a = await evmAccount(role);
  const s = await fetchPqcStatus({ rest: REST, address: a.cosmos });
  const w = await fetchEvmWindow({ rest: REST, address: a.cosmos }).catch(() => null);
  const bal = await publicClient.getBalance({ address: a.evm as `0x${string}` });
  console.log(`${role.padEnd(8)} ${a.evm} ${a.cosmos}`);
  console.log(`  pqc: ${s.registered ? (isRegisteredPqcKey(s, a.pqc.publicKey) ? "registered" : "registered, DIFFERENT key") : "not registered"}  window: ${w && (w as any).found ? JSON.stringify(w) : "none"}  evm balance: ${formatEther(bal)} QOR`);
}
