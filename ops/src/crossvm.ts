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

if (import.meta.url === `file://${process.argv[1]}`) {
  const d = loadDeployments();
  const { client, address } = await treasuryClient();
  const me = evmTwin(address);
  const [cmd, key, amount] = process.argv.slice(2);
  const erc20 = artifact("WQOR").abi;
  const routerAbi = artifact("DarwinRouter").abi;
  let msg;
  if (cmd === "approve") {
    msg = crossVmCallMsg(address, d.tokens.fUSD, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] }));
  } else if (cmd === "buy") {
    const basket = d.baskets[key].address as Address;
    msg = crossVmCallMsg(address, d.router, encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, parseUnits(amount, 6), 0n, me] }));
  } else if (cmd === "approveBasket") {
    msg = crossVmCallMsg(address, d.baskets[key].address, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] }));
  } else if (cmd === "sell") {
    const basket = d.baskets[key].address as Address;
    const held = (await publicClient.readContract({ address: basket, abi: erc20, functionName: "balanceOf", args: [me] })) as bigint;
    msg = crossVmCallMsg(address, d.router, encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, held, 0n, me] }));
  } else {
    throw new Error("usage: crossvm.ts approve | buy <BASKET> <fUSD> | approveBasket <BASKET> | sell <BASKET>");
  }
  console.log(`treasury ${address} (EVM ${me}): ${cmd}`);
  const res: any = await client.signAndBroadcast([msg], { amount: [{ denom: "uqor", amount: "150000" }], gas: "1500000" }, `darwin: ${cmd} via cross-VM`);
  console.log(`code ${res.code ?? 0} tx ${res.transactionHash} gasUsed ${res.gasUsed}`);
  if (res.code) console.log(res.rawLog);
}
