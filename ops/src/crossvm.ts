/**
 * Call Darwin's EVM contracts from the native lane with MsgCrossVMCall, hybrid-signed
 * (secp256k1 + ML-DSA-87). This is how a QoreX user trades: QoreX signs native transactions with
 * both keys, and the cross-VM message carries the EVM calldata. No EVM window, no ECDSA-only path.
 *
 *   tsx src/crossvm.ts approve            treasury approves fUSD to the router
 *   tsx src/crossvm.ts buy <BASKET> <fUSD> treasury buys a basket through the router
 *   tsx src/crossvm.ts sell <BASKET>       treasury sells all its shares
 */
import { encodeFunctionData, maxUint256, parseUnits, type Address, type Hex } from "viem";
import { fromBech32 } from "@cosmjs/encoding";
import { artifact, loadDeployments } from "./evm.js";
import { treasuryClient } from "./nativeClient.js";
import { publicClient } from "./net.js";

const CROSSVM_TYPE_URL = "/qorechain.crossvm.v1.MsgCrossVMCall";

/** The 0x twin of a qor1 address: the same 20 bytes. */
export const evmTwin = (bech32: string) => `0x${Buffer.from(fromBech32(bech32, 90).data).toString("hex")}` as Address;

export function crossVmCallMsg(sender: string, target: Address, data: Hex) {
  return {
    typeUrl: CROSSVM_TYPE_URL,
    value: {
      sender,
      sourceVm: "cosmwasm",
      targetVm: "evm",
      targetContract: target,
      payload: Buffer.from(data.slice(2), "hex"),
      funds: [],
      async: false,
      asyncGasLimit: "0",
      asyncMaxFactor: "0",
    },
  };
}

/** Trade from the treasury (coin 118) over the native lane, hybrid-signed. Returns the tx hash. */
export async function nativeTrade(cmd: "approve" | "approveBasket" | "buy" | "sell", key?: string, amount?: string) {
  const d = loadDeployments();
  const { client, address } = await treasuryClient();
  const me = evmTwin(address);
  const erc20 = artifact("WQOR").abi;
  const routerAbi = artifact("DarwinRouter").abi;
  const msgs = [];
  if (cmd === "approve") {
    msgs.push(crossVmCallMsg(address, d.tokens.fUSD, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
  } else if (cmd === "approveBasket") {
    msgs.push(crossVmCallMsg(address, d.baskets[key!].address, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
  } else if (cmd === "buy") {
    const basket = d.baskets[key!].address as Address;
    msgs.push(crossVmCallMsg(address, d.router, encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, parseUnits(amount!, 6), 0n, me] })));
  } else if (cmd === "sell") {
    const basket = d.baskets[key!].address as Address;
    const held = (await publicClient.readContract({ address: basket, abi: erc20, functionName: "balanceOf", args: [me] })) as bigint;
    const shares = amount ? parseUnits(amount, 18) : held;
    if (shares === 0n || shares > held) throw new Error(`treasury holds ${held} ${key}`);
    const allowance = (await publicClient.readContract({ address: basket, abi: erc20, functionName: "allowance", args: [me, d.router] })) as bigint;
    if (allowance < shares) msgs.push(crossVmCallMsg(address, basket, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
    msgs.push(crossVmCallMsg(address, d.router, encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, shares, 0n, me] })));
  }
  const gas = 2_000_000 + 400_000 * (msgs.length - 1);
  const res: any = await client.signAndBroadcast(msgs, { amount: [{ denom: "uqor", amount: String(Math.ceil(gas * 0.11)) }], gas: String(gas) }, `darwin: ${cmd} via cross-VM`);
  if (res.code) throw new Error(`native ${cmd} failed: ${res.rawLog}`);
  console.log(`native ${cmd} ${key ?? ""} ${amount ?? ""}: hybrid-signed tx ${res.transactionHash} (gas ${res.gasUsed})`);
  return res.transactionHash as string;
}

export async function treasuryShares(key: string): Promise<bigint> {
  const d = loadDeployments();
  const { address } = await treasuryClient();
  return (await publicClient.readContract({ address: d.baskets[key].address, abi: artifact("WQOR").abi, functionName: "balanceOf", args: [evmTwin(address)] })) as bigint;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, key, amount] = process.argv.slice(2);
  if (!["approve", "approveBasket", "buy", "sell"].includes(cmd)) {
    throw new Error("usage: crossvm.ts approve | buy <BASKET> <fUSD> | approveBasket <BASKET> | sell <BASKET> [shares]");
  }
  await nativeTrade(cmd as any, key, amount);
}
