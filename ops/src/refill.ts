/**
 * Refill the reserve's inventory from the deployer.
 *   tsx src/refill.ts qor <QOR>        wrap QOR and send the WQOR to the reserve
 *   tsx src/refill.ts token <SYMBOL>   send the deployer's whole balance of a token to the reserve
 */
import { parseEther, type Address } from "viem";
import { evmAccount } from "./accounts.js";
import { artifact, loadDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";

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
  if (bal === 0n) throw new Error(`deployer holds no ${arg}`);
  const r = await write("deployer", d.tokens[arg], erc20, "transfer", [d.reserve, bal]);
  console.log(`reserve <- ${bal} ${arg} (${r.transactionHash})`);
} else {
  console.error("usage: refill.ts qor <QOR> | token <SYMBOL>");
}
