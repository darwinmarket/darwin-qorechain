/**
 * Server-only chain access: REST and RPC upstreams, the deployments record, hybrid-signed native
 * transactions from a role account (secp256k1 + ML-DSA-87, as QoreX does), contract calls on the
 * native lane (writeNative), and ML-DSA-87 signatures by the reporter and curator.
 */
import { StargateClient } from "@cosmjs/stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import { EthNativeSigner, pqcSign, qorechainRegistry } from "@qorechain/sdk";
import { encodeFunctionData, hexToBytes, toHex, type Abi, type Address, type Hex } from "viem";
import deployments from "@/config/deployments.json";
import { client } from "@/lib/qore/chain";
import { account, type Role } from "./keys";

export const REST = process.env.QORE_REST_UPSTREAM ?? "https://api-testnet.qore.host";
export const RPC = process.env.QORE_RPC_UPSTREAM ?? "https://rpc-testnet.qore.host";
export const CHAIN_ID = "qorechain-diana";
export const D = deployments as any;
export { client };

export const json = async (url: string) => {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "darwin-qorechain" }, cache: "no-store" });
  if (!r.ok) throw new Error(`${url.split("?")[0]}: ${r.status}`);
  return r.json();
};

async function sequence(address: string) {
  const r = await fetch(`${REST}/cosmos/auth/v1beta1/accounts/${address}`, { cache: "no-store" });
  const body = (await r.json()) as { account?: Record<string, any> };
  const acc = (body.account?.base_account ?? body.account ?? {}) as Record<string, string>;
  return { accountNumber: BigInt(acc.account_number ?? "0"), sequence: BigInt(acc.sequence ?? "0") };
}

/** Whether a message already went through: the hash of the transaction that carried it, or null. */
export type Done = () => Promise<string | null>;

/**
 * The relayer's committed transaction that executed with exactly this memo, among its latest ones
 * (indexed search on one event: this node returns nothing for AND queries). Memos are unique per
 * message, so a match is this message and no other.
 */
export async function findExecuted(role: Role, memo: string, depth = 30): Promise<string | null> {
  const acc = await account(role);
  const qs = new URLSearchParams({ query: `message.sender='${acc.cosmos}'`, order_by: "ORDER_BY_DESC", "pagination.limit": String(depth) });
  const r = await json(`${REST}/cosmos/tx/v1beta1/txs?${qs}`);
  const hit = ((r.tx_responses ?? []) as any[]).find((t) => t.code === 0 && String(t.tx?.body?.memo ?? "") === memo && executedIn(t));
  return hit?.txhash ?? null;
}

/** A committed tx_response whose cross-VM call executed. */
export const executedIn = (t: any) =>
  Boolean(t?.events?.some((e: any) => e.type === "crossvm_response" && e.attributes.some((a: any) => a.key === "status" && a.value === "executed")));

/**
 * Sign (hybrid) and broadcast native messages from a role account; returns the tx hash.
 * `done` makes it idempotent: a broadcast can land in a block while its caller got an error, so
 * before sending the same signed message again, ask whether it already went through.
 */
export async function sendNative(role: Role, messages: EncodeObject[], gas: number, memo = "", done?: Done): Promise<string> {
  // Parallel serverless calls can sign with the same account at the same moment, and the REST
  // sequence lags a block: on "account sequence mismatch, expected N", sign again with N.
  let forced: bigint | undefined;
  for (let attempt = 0; ; attempt++) {
    try {
      return await sendNativeOnce(role, messages, gas, memo, forced);
    } catch (e) {
      const m = /account sequence mismatch, expected (\d+)/.exec(String((e as Error)?.message ?? e));
      if (!m || attempt >= 6) throw e;
      forced = BigInt(m[1]);
      // at least a block (~1.4 s): the REST sequence lags one, and the racing call must land
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));
      // the mismatch may be our own earlier attempt, committed after all: never send it twice
      const landed = done ? await done().catch(() => null) : null;
      if (landed) return landed;
    }
  }
}

async function sendNativeOnce(role: Role, messages: EncodeObject[], gas: number, memo: string, forced?: bigint): Promise<string> {
  const acc = await account(role);
  const { accountNumber, sequence: fetched } = await sequence(acc.cosmos);
  const seq = forced != null && forced > fetched ? forced : fetched;
  // messages encoded by hand (lib/qore/proto.ts: { typeUrl, value: bytes }) pass through as they
  // are; a type the registry already knows must come in object form, or it is re-encoded empty
  const registry = qorechainRegistry();
  for (const m of messages)
    if (m.value instanceof Uint8Array && !registry.lookupType(m.typeUrl))
      registry.register(m.typeUrl, { encode: (v: Uint8Array) => ({ finish: () => v }), decode: (b: Uint8Array) => b, fromPartial: (v: Uint8Array) => v } as any);
  const signer = new EthNativeSigner(acc, { signMode: "hybrid", rest: REST, registry });
  const transport = await StargateClient.connect(RPC);
  try {
    const res = (await signer.signAndBroadcast(transport, {
      chainId: CHAIN_ID,
      accountNumber,
      sequence: seq,
      fee: { amount: [{ denom: "uqor", amount: String(Math.ceil(gas * 0.125)) }], gas: String(gas) },
      messages,
      memo,
    } as Parameters<EthNativeSigner["signAndBroadcast"]>[1])) as { transactionHash: string; code?: number; rawLog?: string };
    if (res.code) throw new Error(`tx ${res.transactionHash} failed: code ${res.code} ${res.rawLog ?? ""}`);
    return res.transactionHash;
  } finally {
    transport.disconnect();
  }
}

/** A cross-VM call in object form (MsgCrossVMCall is a type the signer's registry knows). */
export function crossVmMsg(sender: string, target: Address, data: Hex): EncodeObject {
  return {
    typeUrl: "/qorechain.crossvm.v1.MsgCrossVMCall",
    value: { sender, sourceVm: "cosmwasm", targetVm: "evm", targetContract: target, payload: hexToBytes(data), funds: [], async: false, asyncGasLimit: "0", asyncMaxFactor: "0" },
  } as EncodeObject;
}

/**
 * A contract call from a role, on the native lane: a MsgCrossVMCall hybrid-signed with the role's
 * secp256k1 and ML-DSA-87 keys, so the transaction itself is post-quantum and needs no EVM window
 * (an EVM transaction carries ECDSA alone; the QoreChain explorer labels it "not quantum-safe").
 * Simulated first from the role's 0x address, so a refusal is named before anything is spent.
 * A cross-VM call meters the EVM work at about 2.5x its EVM gas; out of gas is sent again with more.
 * Native calls leave no EVM logs: `memo` names what the transaction did, for the readers. It must
 * be unique to this call: `done` (by default, a committed executed transaction with this memo) is
 * asked before any resend and after any error, and a message that went through is a success.
 */
export async function writeNative(role: Role, address: Address, abi: Abi, functionName: string, args: unknown[], memo: string, done?: Done) {
  const landed: Done = done ?? (() => findExecuted(role, memo));
  const acc = await account(role);
  const data = encodeFunctionData({ abi, functionName, args } as any);
  const evmGas = await client.estimateContractGas({ address, abi, functionName, args, account: acc.evm as Address } as any);
  let gas = Math.max(1_200_000, Math.ceil(Number(evmGas) * 2.8) + 400_000);
  for (let attempt = 0; ; attempt++) {
    try {
      const transactionHash = await sendNative(role, [crossVmMsg(acc.cosmos, address, data)], gas, memo, landed);
      const t = await json(`${REST}/cosmos/tx/v1beta1/txs/${transactionHash}`).catch(() => null);
      if (t && !executedIn(t.tx_response)) throw new Error(`cross-VM call not executed in ${transactionHash}`);
      return { transactionHash, gasUsed: Number(t?.tx_response?.gas_used ?? 0) };
    } catch (e) {
      // a cut broadcast may have landed: then it is a success, and is never sent again
      await new Promise((r) => setTimeout(r, 2000));
      const hash = await landed().catch(() => null);
      if (hash) return { transactionHash: hash, gasUsed: 0 };
      if (attempt < 2 && /out of gas/i.test(String((e as Error)?.message ?? e))) {
        gas = Math.ceil(gas * 1.6);
        continue;
      }
      throw e;
    }
  }
}

/** ML-DSA-87 signature by a signing-only role (reporter, curator). */
export async function pqSign(role: Role, message: Hex): Promise<Hex> {
  const acc = await account(role);
  return toHex(pqcSign(acc.pqc.secretKey, Buffer.from(message.slice(2), "hex")));
}
