/**
 * Buy QOR on QoreChain's native AMM with Fest tokens, for the reserve of the QOR baskets. At QOR's
 * market price a faucet claim (100 QOR) is worth about $0.33, while the fUSD/QOR and fBTC/QOR pools
 * hold tens of thousands of QOR: the reserve's spare fUSD and fBTC buy it there.
 *
 *   tsx src/source-qor.ts <fUSD> <fBTC>      e.g. 450 0.02
 *
 * Steps, all from the deployer, hybrid-signed: withdraw what the deployer lacks from the reserve
 * (ML-DSA-87 admin signature), MsgConvertERC20 to bank form, MsgSwapExactIn on pool 2 (fUSD/QOR) and
 * pool 4 (fBTC/QOR) with a 2% slippage bound. The QOR lands on the deployer; `refill.ts qwakk` and
 * `refill.ts qor` then move it into the reserve.
 */
import { encodeAbiParameters, parseAbiParameters, parseUnits, type Address, type Hex } from "viem";
import { evmAccount } from "./accounts.js";
import { adminCall, artifact, loadDeployments } from "./evm.js";
import { publicClient } from "./net.js";
import { sendFromRole } from "./nativeClient.js";
import { CONVERT_ERC20_TYPE_URL } from "./erc20Msgs.js";
import { bankBalance, pool, quote } from "./amm.js";

const [fusdArg, fbtcArg] = process.argv.slice(2);
if (!fusdArg || !fbtcArg) throw new Error("usage: source-qor.ts <fUSD> <fBTC>");
const d = loadDeployments();
const dep = await evmAccount("deployer");
const me = dep.evm as Address;
const erc20 = artifact("WQOR").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const enc = (t: string, v: unknown[]) => encodeAbiParameters(parseAbiParameters(t), v as any) as Hex;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const legs = [
  { sym: "fUSD", amount: parseUnits(fusdArg, 6), poolId: "2" },
  { sym: "fBTC", amount: parseUnits(fbtcArg, 8), poolId: "4" },
].filter((l) => l.amount > 0n);

/** Largest input whose swap moves the pool price by at most ~4.5% (the module caps a swap at 5%). */
const maxChunk = (rIn: bigint) => (rIn * 22n) / 1000n;

const qor0 = await bankBalance(dep.cosmos, "uqor");
for (const l of legs) {
  const token = d.tokens[l.sym] as Address;
  const denom = `erc20:${token}`;
  // already in bank form from an earlier, interrupted run? convert only the rest
  const inBank = await bankBalance(dep.cosmos, denom);
  if (inBank < l.amount) {
    const need = l.amount - inBank;
    const have = (await publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [me] })) as bigint;
    if (have < need) {
      await adminCall(d.reserve, reserveAbi, "withdraw", "withdraw", enc("address, uint256, address", [token, need - have, me]), [token, need - have, me]);
      console.log(`reserve -> deployer ${need - have} ${l.sym} (ML-DSA-87 admin signature)`);
    }
    const t1 = await sendFromRole("deployer", [{ typeUrl: CONVERT_ERC20_TYPE_URL, value: { contractAddress: token, amount: need.toString(), receiver: dep.cosmos, sender: dep.cosmos } }], "hybrid", "900000");
    console.log(`${need} ${l.sym} to bank form (${t1})`);
    await sleep(5000);
  }
  // swap in chunks, up to 8 per transaction, each within the module's price-impact cap
  let left = l.amount;
  while (left > 0n) {
    const p = await pool(l.poolId);
    let rIn = BigInt(p.token_a === denom ? p.reserve_a : p.reserve_b);
    let rOut = BigInt(p.token_a === denom ? p.reserve_b : p.reserve_a);
    const msgs = [];
    let expected = 0n;
    for (let k = 0; k < 8 && left > 0n; k++) {
      const x = left < maxChunk(rIn) ? left : maxChunk(rIn);
      const net = (x * 9970n) / 10_000n;
      const out = (net * rOut) / (rIn + net);
      msgs.push({ typeUrl: "/qorechain.amm.v1.MsgSwapExactIn", value: { sender: dep.cosmos, poolId: l.poolId, tokenIn: { denom, amount: x.toString() }, denomOut: "uqor", minOut: ((out * 98n) / 100n).toString() } });
      rIn += x; rOut -= out; left -= x; expected += out;
    }
    const t = await sendFromRole("deployer", msgs, "hybrid", String(400_000 * msgs.length + 200_000));
    console.log(`pool ${l.poolId}: ${msgs.length} swaps, ~${Number(expected) / 1e6} QOR (${t}), ${left} ${l.sym} left`);
    await sleep(5000);
  }
}
const got = (await bankBalance(dep.cosmos, "uqor")) - qor0;
console.log(`deployer +${Number(got) / 1e6} QOR`);
