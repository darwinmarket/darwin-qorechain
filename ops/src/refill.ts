/**
 * Refill the reserve's inventory from the deployer.
 *   tsx src/refill.ts qor <QOR>        wrap QOR and send the WQOR to the reserve
 *   tsx src/refill.ts token <SYMBOL> [amount]  send the deployer's balance (or part of it) to the reserve
 *   tsx src/refill.ts qwakk <QOR>      buy QWAKK on the native AMM from the deployer (hybrid-signed),
 *                                      convert it to ERC-20 and send it to the reserve
 */
import { parseEther, type Address } from "viem";
import { evmAccount } from "./accounts.js";
import { artifact, loadDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";
import { sendFromRole } from "./nativeClient.js";
import { bankBalance, pool, quote } from "./amm.js";
import { CONVERT_COIN_TYPE_URL } from "./erc20Msgs.js";

const erc20 = artifact("WQOR").abi;
const d = loadDeployments();
const [cmd, arg] = process.argv.slice(2);
if (cmd === "qor") {
  const wei = parseEther(arg);
  const a = await write("deployer", d.tokens.WQOR, erc20, "deposit", [], wei);
  const b = await write("deployer", d.tokens.WQOR, erc20, "transfer", [d.reserve, wei]);
  console.log(`reserve <- ${arg} WQOR (wrap ${a.transactionHash}, transfer ${b.transactionHash})`);
} else if (cmd === "token") {
  const me = (await evmAccount("deployer")).evm as Address;
  const bal = (await publicClient.readContract({ address: d.tokens[arg], abi: erc20, functionName: "balanceOf", args: [me] })) as bigint;
  const amount = process.argv[4] ? BigInt(process.argv[4]) : bal;
  if (bal === 0n || amount > bal) throw new Error(`deployer holds ${bal} ${arg}`);
  const r = await write("deployer", d.tokens[arg], erc20, "transfer", [d.reserve, amount]);
  console.log(`reserve <- ${amount} ${arg} (${r.transactionHash})`);
} else if (cmd === "qwakk") {
  const acc = await evmAccount("deployer");
  const denom = `erc20:${d.tokens.QWAKK}`;
  const p = await pool("6");
  const amountIn = BigInt(Math.round(Number(arg) * 1e6));
  const q = quote(p, "uqor", amountIn);
  const before = await bankBalance(acc.cosmos, denom);
  const t1 = Number(arg) === 0 ? "none (sweeping held QWAKK)" : await sendFromRole("deployer", [{ typeUrl: "/qorechain.amm.v1.MsgSwapExactIn", value: { sender: acc.cosmos, poolId: "6", tokenIn: { denom: "uqor", amount: amountIn.toString() }, denomOut: denom, minOut: ((q.out * 98n) / 100n).toString() } }]);
  await new Promise((r) => setTimeout(r, 4000));
  const got = Number(arg) === 0 ? before : (await bankBalance(acc.cosmos, denom)) - before;
  const t2 = await sendFromRole("deployer", [{ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom, amount: got.toString() }, receiver: acc.evm, sender: acc.cosmos } }]);
  await new Promise((r) => setTimeout(r, 4000));
  const t3 = await write("deployer", d.tokens.QWAKK, erc20, "transfer", [d.reserve, got]);
  console.log(`reserve <- ${got} QWAKK for ${arg} QOR (swap ${t1}, convert ${t2}, transfer ${t3.transactionHash})`);
} else {
  console.error("usage: refill.ts qor <QOR> | token <SYMBOL> [amount] | qwakk <QOR>");
}
