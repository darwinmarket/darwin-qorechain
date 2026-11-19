/**
 * Build Darwin trades as native-lane messages for QoreX.
 *
 * Buy: [MsgConvertCoin (only if the fUSD sits in bank form)] + [approve fUSD (only if needed)] +
 *      router.buy, as MsgCrossVMCall. One transaction, one hybrid signature.
 * Sell: [approve shares (only if needed)] + router.sell.
 */
import { encodeFunctionData, maxUint256, type Address, type Hex } from "viem";
import { erc20Abi, routerAbi } from "./abis";
import { client, ROUTER, TOKEN_INFO, TOKENS } from "./chain";
import { convertCoin, crossVmCall, type EncodedMsg } from "./proto";
import type { Account } from "./qorex";

export const SLIPPAGE_BPS = 50n;

export async function quoteBuy(basket: Address, usdIn: bigint) {
  const [shares, fee] = (await client.readContract({ address: ROUTER, abi: routerAbi, functionName: "quoteBuy", args: [basket, usdIn] })) as readonly [bigint, bigint];
  return { shares, fee };
}

export async function quoteSell(basket: Address, shares: bigint) {
  const [usdOut, fee] = (await client.readContract({ address: ROUTER, abi: routerAbi, functionName: "quoteSell", args: [basket, shares] })) as readonly [bigint, bigint];
  return { usdOut, fee };
}

export async function buildBuy(acc: Account, basket: Address, usdIn: bigint, erc20Usd: bigint, bankUsd: bigint) {
  const msgs: EncodedMsg[] = [];
  if (erc20Usd < usdIn) {
    const need = usdIn - erc20Usd;
    if (bankUsd < need) throw new Error("Not enough fUSD");
    msgs.push(convertCoin(acc.address, acc.evm, TOKEN_INFO.fUSD.denom!, need));
  }
  const allowance = (await client.readContract({ address: TOKENS.fUSD, abi: erc20Abi, functionName: "allowance", args: [acc.evm, ROUTER] })) as bigint;
  if (allowance < usdIn) {
    msgs.push(crossVmCall(acc.address, TOKENS.fUSD, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [ROUTER, maxUint256] })));
  }
  const { shares } = await quoteBuy(basket, usdIn);
  const minShares = (shares * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  msgs.push(crossVmCall(acc.address, ROUTER, encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, usdIn, minShares, acc.evm] })));
  // Measured: a 3-leg buy is ~630k EVM gas plus ~730k for the cross-VM call and hybrid check.
  return { msgs, shares, gas: 2_000_000 + 400_000 * (msgs.length - 1) };
}

export async function buildSell(acc: Account, basket: Address, shares: bigint) {
  const msgs: EncodedMsg[] = [];
  const allowance = (await client.readContract({ address: basket, abi: erc20Abi, functionName: "allowance", args: [acc.evm, ROUTER] })) as bigint;
  if (allowance < shares) {
    msgs.push(crossVmCall(acc.address, basket, encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [ROUTER, maxUint256] })));
  }
  const { usdOut } = await quoteSell(basket, shares);
  const minOut = (usdOut * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  msgs.push(crossVmCall(acc.address, ROUTER, encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, shares, minOut, acc.evm] })));
  return { msgs, usdOut, gas: 1_600_000 + 400_000 * (msgs.length - 1) };
}

export type _Hex = Hex;
