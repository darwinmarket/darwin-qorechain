/**
 * QoreX, the QoreChain wallet. Its native provider (`window.qorex.native`) builds, hybrid-signs
 * (secp256k1 + ML-DSA-87) and broadcasts a transaction from the messages a page hands it. Darwin
 * sends MsgCrossVMCall messages that call its EVM contracts, so every trade carries the user's
 * post-quantum signature, checked by the chain.
 */
import { connectQorex as connectAdapter, hasQorexSignAndBroadcast, isQorexRejection, qorexSignAndBroadcast } from "@qorechain/wallet-adapter";
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

export { QOREX_INSTALL_URL } from "./links";

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

export { isQorexRejection };

/**
 * Connect through @qorechain/wallet-adapter: it feature-detects `signAndBroadcast` (QoreX extension
 * >= 0.3.5, app >= 1.1.5) and prompts the connection for the testnet chain id.
 */
export async function connectQorex(): Promise<Account> {
  const n = await waitForQorex();
  if (!n) throw new Error("QoreX is not installed");
  if (!hasQorexSignAndBroadcast(n as any)) throw new Error("Update QoreX: this version cannot sign and broadcast");
  await connectAdapter({ chainId: COSMOS_CHAIN_ID, provider: n as any });
  const key = await n.getKey(COSMOS_CHAIN_ID);
  // The EVM side sees the same 20 bytes as a 0x address.
  return { address: key.bech32Address, evm: toHex(Uint8Array.from(key.address)), name: key.name };
}

/** Hand QoreX the messages; it builds, hybrid-signs (secp256k1 + ML-DSA-87) and broadcasts. */
/**
 * Run a QoreX request; if QoreX answers that it is locked, ask it to connect, which opens QoreX
 * for the user to unlock, then run the same request once more. A locked wallet refuses signing
 * requests outright, but answers a connection request with its unlock screen.
 */
export async function withUnlock<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const n = qorex();
    if (!n || !/wallet is locked/i.test(msg)) throw e;
    await n.enable(COSMOS_CHAIN_ID);
    return request();
  }
}

export async function signAndBroadcast(messages: EncodedMsg[], memo: string, gasLimit: number): Promise<QorexResult> {
  return withUnlock(() => signAndBroadcastOnce(messages, memo, gasLimit));
}

async function signAndBroadcastOnce(messages: EncodedMsg[], memo: string, gasLimit: number): Promise<QorexResult> {
  const n = qorex();
  if (!n) throw new Error("QoreX is not installed");
  // validates the request (1-32 messages, memo <= 256 bytes, gas 100k-5M) before the prompt
  const res = (await qorexSignAndBroadcast({
    chainId: COSMOS_CHAIN_ID,
    messages: messages.map((m) => ({ typeUrl: m.typeUrl, value: m.value })),
    memo,
    gasLimit,
    provider: n as any,
  })) as QorexResult;
  if (res.code !== 0) throw new Error(`Transaction ${res.txHash} failed with code ${res.code}`);
  return res;
}
