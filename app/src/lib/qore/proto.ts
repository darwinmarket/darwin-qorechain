/**
 * The few protobuf messages the app sends through QoreX, encoded by hand (no SDK in the bundle).
 *
 *   qorechain.crossvm.v1.MsgCrossVMCall { sender=1, source_vm=2, target_vm=3, target_contract=4,
 *                                         payload=5 (bytes), funds=6, async=7, ... }
 *   cosmos.evm.erc20.v1.MsgConvertCoin  { coin=1 (Coin{denom=1, amount=2}), receiver=2, sender=3 }
 */
import { hexToBytes, type Hex } from "viem";

class Writer {
  private chunks: number[] = [];
  private varint(n: number) {
    while (n > 0x7f) {
      this.chunks.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    this.chunks.push(n);
  }
  private tag(field: number, wire: number) {
    this.varint((field << 3) | wire);
  }
  bytes(field: number, b: Uint8Array) {
    if (!b.length) return this;
    this.tag(field, 2);
    this.varint(b.length);
    for (const x of b) this.chunks.push(x);
    return this;
  }
  string(field: number, s: string) {
    return this.bytes(field, new TextEncoder().encode(s));
  }
  finish() {
    return Uint8Array.from(this.chunks);
  }
}

export const CROSSVM_TYPE_URL = "/qorechain.crossvm.v1.MsgCrossVMCall";
export const CONVERT_COIN_TYPE_URL = "/cosmos.evm.erc20.v1.MsgConvertCoin";

export type EncodedMsg = { typeUrl: string; value: Uint8Array };

/** Call an EVM contract from the native lane. The chain derives the source lane from the sender. */
export function crossVmCall(sender: string, target: Hex, calldata: Hex): EncodedMsg {
  const value = new Writer()
    .string(1, sender)
    .string(2, "cosmwasm") // placeholder: ignored by the chain, must be a known VM name
    .string(3, "evm")
    .string(4, target)
    .bytes(5, hexToBytes(calldata))
    .finish();
  return { typeUrl: CROSSVM_TYPE_URL, value };
}

/** Move a bank coin (the faucet's form) to its ERC-20 form on `receiver`. */
export function convertCoin(sender: string, receiver: Hex, denom: string, amount: bigint): EncodedMsg {
  const coin = new Writer().string(1, denom).string(2, amount.toString()).finish();
  const value = new Writer().bytes(1, coin).string(2, receiver).string(3, sender).finish();
  return { typeUrl: CONVERT_COIN_TYPE_URL, value };
}

export const CONVERT_ERC20_TYPE_URL = "/cosmos.evm.erc20.v1.MsgConvertERC20";
export const SEND_TYPE_URL = "/cosmos.bank.v1beta1.MsgSend";

/**
 * Move an ERC-20 balance of `sender` back to its bank form on `receiver` (both qor1: the chain
 * decodes the sender as bech32 and refuses its 0x form).
 *   cosmos.evm.erc20.v1.MsgConvertERC20 { contract_address=1, amount=2, receiver=3, sender=4 }
 */
export function convertErc20(sender: string, receiver: string, contract: Hex, amount: bigint): EncodedMsg {
  const value = new Writer().string(1, contract).string(2, amount.toString()).string(3, receiver).string(4, sender).finish();
  return { typeUrl: CONVERT_ERC20_TYPE_URL, value };
}

/** cosmos.bank.v1beta1.MsgSend { from_address=1, to_address=2, amount=3 (Coin) }: QoreX shows and signs it. */
export function bankSend(from: string, to: string, denom: string, amount: bigint): EncodedMsg {
  const coin = new Writer().string(1, denom).string(2, amount.toString()).finish();
  const value = new Writer().string(1, from).string(2, to).bytes(3, coin).finish();
  return { typeUrl: SEND_TYPE_URL, value };
}
