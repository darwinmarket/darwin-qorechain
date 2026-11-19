/**
 * Trade a basket through the router from the deployer account, the way the app does it.
 *
 *   tsx src/trade.ts buy  <BASKET> <fUSD amount>
 *   tsx src/trade.ts sell <BASKET> <shares | all>
 */
import { formatUnits, maxUint256, parseUnits, type Address } from "viem";
import { evmAccount } from "./accounts.js";
import { artifact, loadDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";

const routerAbi = artifact("DarwinRouter").abi;
const erc20 = artifact("WQOR").abi;

async function allowance(token: Address, owner: Address, spender: Address) {
  return (await publicClient.readContract({ address: token, abi: erc20, functionName: "allowance", args: [owner, spender] })) as bigint;
}
async function balance(token: Address, owner: Address) {
  return (await publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [owner] })) as bigint;
}

export async function buy(key: string, usd: number) {
  const d = loadDeployments();
  const me = (await evmAccount("deployer")).evm as Address;
  const basket = d.baskets[key].address as Address;
  const usdIn = parseUnits(usd.toFixed(6), 6);
  if ((await allowance(d.tokens.fUSD, me, d.router)) < usdIn) await write("deployer", d.tokens.fUSD, erc20, "approve", [d.router, maxUint256]);
  const [shares] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, usdIn] })) as [bigint, bigint];
  const minShares = (shares * 995n) / 1000n;
  const r = await write("deployer", d.router, routerAbi, "buy", [basket, usdIn, minShares, me]);
  console.log(`buy ${key}: ${usd} fUSD -> ~${formatUnits(shares, 18)} shares (gas ${r.gasUsed}, tx ${r.transactionHash})`);
  return r;
}

export async function sell(key: string, amount: string) {
  const d = loadDeployments();
  const me = (await evmAccount("deployer")).evm as Address;
  const basket = d.baskets[key].address as Address;
  const held = await balance(basket, me);
  const shares = amount === "all" ? held : parseUnits(amount, 18);
  if (shares === 0n) throw new Error(`no ${key} to sell`);
  if ((await allowance(basket, me, d.router)) < shares) await write("deployer", basket, erc20, "approve", [d.router, maxUint256]);
  const [usdOut] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteSell", args: [basket, shares] })) as [bigint, bigint];
  const r = await write("deployer", d.router, routerAbi, "sell", [basket, shares, (usdOut * 995n) / 1000n, me]);
  console.log(`sell ${key}: ${formatUnits(shares, 18)} shares -> ~${formatUnits(usdOut, 6)} fUSD (gas ${r.gasUsed}, tx ${r.transactionHash})`);
  return r;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, key, amount] = process.argv.slice(2);
  if (cmd === "buy") await buy(key, Number(amount));
  else if (cmd === "sell") await sell(key, amount ?? "all");
  else console.error("usage: trade.ts buy <BASKET> <fUSD> | sell <BASKET> <shares|all>");
}
