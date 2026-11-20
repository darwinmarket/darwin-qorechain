/**
 * Give the real QOR and QWAKK back to QoreChain's public pools once the QOR baskets hold fQOR and
 * fQWAKK. Buying them had drained the fUSD/QOR and fBTC/QOR pools by half or more and lifted
 * QWAKK's price: other teams trade on those pools.
 *
 *   1. withdraw the reserve's WQOR and QWAKK (ML-DSA-87 admin signature), unwrap WQOR;
 *   2. sell the QWAKK back on pool 6 (QWAKK/QOR);
 *   3. keep KEEP_QOR for gas, sell the rest back on pool 2 (fUSD/QOR) and pool 4 (fBTC/QOR), in the
 *      proportions they were bought from;
 *   4. the fUSD and fBTC that come back return to the reserve.
 * Every swap stays within the AMM's 5% price-impact cap (`swapChunked`).
 *
 *   tsx src/return-to-amm.ts [keepQor=1500]
 */
import { encodeAbiParameters, parseAbiParameters, type Address, type Hex } from "viem";
import { evmAccount } from "./accounts.js";
import { adminCall, artifact, loadDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";
import { sendFromRole } from "./nativeClient.js";
import { CONVERT_COIN_TYPE_URL, CONVERT_ERC20_TYPE_URL } from "./erc20Msgs.js";
import { bankBalance, swapChunked } from "./amm.js";

const KEEP_QOR = BigInt(Number(process.argv[2] ?? 1500)) * 1_000_000n;
// what source-qor.ts took: 5,224 QOR from pool 2 and 14,528 from pool 4
const SHARE_POOL_2 = 26n;

const d = loadDeployments();
const dep = await evmAccount("deployer");
const me = dep.evm as Address;
const erc20 = artifact("WQOR").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const enc = (t: string, v: unknown[]) => encodeAbiParameters(parseAbiParameters(t), v as any) as Hex;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const balOf = async (t: Address, who: Address) => (await publicClient.readContract({ address: t, abi: erc20, functionName: "balanceOf", args: [who] })) as bigint;

for (const sym of ["WQOR", "QWAKK"]) {
  const t = d.tokens[sym] as Address;
  const amount = await balOf(t, d.reserve);
  if (amount > 0n) {
    await adminCall(d.reserve, reserveAbi, "withdraw", "withdraw", enc("address, uint256, address", [t, amount, me]), [t, amount, me]);
    console.log(`reserve -> deployer ${amount} ${sym} (ML-DSA-87 admin signature)`);
  }
}
const wqor = await balOf(d.tokens.WQOR, me);
if (wqor > 0n) {
  await write("deployer", d.tokens.WQOR, erc20, "withdraw", [wqor]);
  console.log(`unwrapped ${Number(wqor) / 1e18} WQOR`);
}

const qwakkDenom = `erc20:${d.tokens.QWAKK}`;
const qwakk = await balOf(d.tokens.QWAKK, me);
if (qwakk > 0n) {
  await sendFromRole("deployer", [{ typeUrl: CONVERT_ERC20_TYPE_URL, value: { contractAddress: d.tokens.QWAKK, amount: qwakk.toString(), receiver: dep.cosmos, sender: dep.cosmos } }], "hybrid", "900000");
  await sleep(5000);
}
const qwakkBank = await bankBalance(dep.cosmos, qwakkDenom);
if (qwakkBank > 0n) console.log(`QWAKK back to pool 6: +${Number(await swapChunked("6", qwakkDenom, qwakkBank)) / 1e6} QOR`);

const qor = await bankBalance(dep.cosmos, "uqor");
const spare = qor > KEEP_QOR ? qor - KEEP_QOR : 0n;
const to2 = (spare * SHARE_POOL_2) / 100n;
const to4 = spare - to2;
const back: Record<string, bigint> = {};
if (to2 > 0n) back.fUSD = await swapChunked("2", "uqor", to2);
if (to4 > 0n) back.fBTC = await swapChunked("4", "uqor", to4);

for (const [sym, amount] of Object.entries(back)) {
  if (amount <= 0n) continue;
  await sendFromRole("deployer", [{ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: `erc20:${d.tokens[sym]}`, amount: amount.toString() }, receiver: me, sender: dep.cosmos } }], "hybrid", "900000");
  await sleep(5000);
  await write("deployer", d.tokens[sym], erc20, "transfer", [d.reserve, amount]);
  console.log(`reserve <- ${amount} ${sym}`);
}
console.log(`kept ${Number(await bankBalance(dep.cosmos, "uqor")) / 1e6} QOR on the deployer for gas`);
