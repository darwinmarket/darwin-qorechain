/**
 * QoreX, the QoreChain wallet. Its native provider (`window.qorex.native`) builds, hybrid-signs
 * (secp256k1 + ML-DSA-87) and broadcasts a transaction from the messages a page hands it. Darwin
 * sends MsgCrossVMCall messages that call its EVM contracts, so every trade carries the user's
 * post-quantum signature, checked by the chain.
 */
import { toHex, type Hex } from "viem";
import { COSMOS_CHAIN_ID } from "./chain";
import type { EncodedMsg } from "./proto";

export type QorexKey = { bech32Address: string; address: number[]; pubKey: number[]; name: string; algo: string };
export type QorexResult = { txHash: string; code: number; height?: number; shield: "shielded" | "pending" | "downgraded" | "classical" | string };

type NativeProvider = {
  isQoreX: true;
  capabilities?: readonly string[];
  enable(chainId: string): Promise<void | null>;
  getKey(chainId: string): Promise<QorexKey>;
  signAndBroadcast(req: { chainId: string; messages: { typeUrl: string; value: Uint8Array | number[] }[]; memo?: string; gasLimit?: number | string }): Promise<QorexResult>;
};

declare global {
  interface Window {
    qorex?: { native?: NativeProvider };
  }
}

export const QOREX_INSTALL_URL = "https://docs.qorechain.io/qorex/browser-extension";

export function qorex(): NativeProvider | null {
  if (typeof window === "undefined") return null;
  const n = window.qorex?.native;
  return n && n.isQoreX ? n : null;
}

/** Wait briefly for the extension to inject itself. */
export async function waitForQorex(ms = 1500): Promise<NativeProvider | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const n = qorex();
    if (n) return n;
    await new Promise((r) => setTimeout(r, 100));
  }
  return qorex();
}

export type Account = { address: string; evm: Hex; name: string };

export async function connectQorex(): Promise<Account> {
  const n = await waitForQorex();
  if (!n) throw new Error("QoreX is not installed");
  await n.enable(COSMOS_CHAIN_ID);
  const key = await n.getKey(COSMOS_CHAIN_ID);
  // The EVM side sees the same 20 bytes as a 0x address.
  return { address: key.bech32Address, evm: toHex(Uint8Array.from(key.address)), name: key.name };
}

export async function signAndBroadcast(messages: EncodedMsg[], memo: string, gasLimit: number): Promise<QorexResult> {
  const n = qorex();
  if (!n) throw new Error("QoreX is not installed");
  if (n.capabilities && !n.capabilities.includes("signAndBroadcast")) throw new Error("Update QoreX: this version cannot sign and broadcast");
  const res = await n.signAndBroadcast({
    chainId: COSMOS_CHAIN_ID,
    messages: messages.map((m) => ({ typeUrl: m.typeUrl, value: m.value })),
    memo,
    gasLimit,
  });
  if (res.code !== 0) throw new Error(`Transaction ${res.txHash} failed with code ${res.code}`);
  return res;
}
