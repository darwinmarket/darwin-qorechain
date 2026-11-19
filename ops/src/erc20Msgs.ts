/**
 * Protobuf types for the x/erc20 conversion messages, which @qorechain/sdk's
 * default registry does not ship. Field numbers follow cosmos/evm erc20/v1 tx.proto.
 *
 *   MsgConvertCoin  { Coin coin = 1; string receiver = 2; string sender = 3; }
 *   MsgConvertERC20 { string contract_address = 1; string amount = 2; string receiver = 3; string sender = 4; }
 */
import { BinaryReader, BinaryWriter } from "cosmjs-types/binary";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import type { GeneratedType } from "@cosmjs/proto-signing";

export const CONVERT_COIN_TYPE_URL = "/cosmos.evm.erc20.v1.MsgConvertCoin";
export const CONVERT_ERC20_TYPE_URL = "/cosmos.evm.erc20.v1.MsgConvertERC20";

export interface MsgConvertCoin { coin: Coin; receiver: string; sender: string }
export interface MsgConvertERC20 { contractAddress: string; amount: string; receiver: string; sender: string }

export const MsgConvertCoin: GeneratedType = {
  encode(m: MsgConvertCoin, w: BinaryWriter = BinaryWriter.create()) {
    if (m.coin) Coin.encode(m.coin, w.uint32(10).fork()).ldelim();
    if (m.receiver) w.uint32(18).string(m.receiver);
    if (m.sender) w.uint32(26).string(m.sender);
    return w;
  },
  decode(input: Uint8Array | BinaryReader, length?: number): MsgConvertCoin {
    const r = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? r.len : r.pos + length;
    const m: MsgConvertCoin = { coin: { denom: "", amount: "" }, receiver: "", sender: "" };
    while (r.pos < end) {
      const tag = r.uint32();
      if (tag >>> 3 === 1) m.coin = Coin.decode(r, r.uint32());
      else if (tag >>> 3 === 2) m.receiver = r.string();
      else if (tag >>> 3 === 3) m.sender = r.string();
      else r.skipType(tag & 7);
    }
    return m;
  },
  fromPartial(o: Partial<MsgConvertCoin>): MsgConvertCoin {
    return { coin: Coin.fromPartial(o.coin ?? {}), receiver: o.receiver ?? "", sender: o.sender ?? "" };
  },
} as unknown as GeneratedType;

export const MsgConvertERC20: GeneratedType = {
  encode(m: MsgConvertERC20, w: BinaryWriter = BinaryWriter.create()) {
    if (m.contractAddress) w.uint32(10).string(m.contractAddress);
    if (m.amount) w.uint32(18).string(m.amount);
    if (m.receiver) w.uint32(26).string(m.receiver);
    if (m.sender) w.uint32(34).string(m.sender);
    return w;
  },
  decode(input: Uint8Array | BinaryReader, length?: number): MsgConvertERC20 {
    const r = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? r.len : r.pos + length;
    const m: MsgConvertERC20 = { contractAddress: "", amount: "", receiver: "", sender: "" };
    while (r.pos < end) {
      const tag = r.uint32();
      const f = tag >>> 3;
      if (f === 1) m.contractAddress = r.string();
      else if (f === 2) m.amount = r.string();
      else if (f === 3) m.receiver = r.string();
      else if (f === 4) m.sender = r.string();
      else r.skipType(tag & 7);
    }
    return m;
  },
  fromPartial(o: Partial<MsgConvertERC20>): MsgConvertERC20 {
    return { contractAddress: o.contractAddress ?? "", amount: o.amount ?? "", receiver: o.receiver ?? "", sender: o.sender ?? "" };
  },
} as unknown as GeneratedType;

export const ERC20_REGISTRY_TYPES: ReadonlyArray<[string, GeneratedType]> = [
  [CONVERT_COIN_TYPE_URL, MsgConvertCoin],
  [CONVERT_ERC20_TYPE_URL, MsgConvertERC20],
];
