/**
 * Server-only chain access: REST and RPC upstreams, the deployments record, hybrid-signed native
 * transactions from a role account (secp256k1 + ML-DSA-87, as QoreX does), EVM writes from the
 * deployer, and ML-DSA-87 signatures by the reporter and curator.
 */
import { StargateClient } from "@cosmjs/stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import { EthNativeSigner, pqcSign, qorechainRegistry } from "@qorechain/sdk";
import { createWalletClient, http, toHex, type Abi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import deployments from "@/config/deployments.json";
import { client, diana, EVM_RPC } from "@/lib/qore/chain";
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

/** Sign (hybrid) and broadcast native messages from a role account; returns the tx hash. */
export async function sendNative(role: Role, messages: EncodeObject[], gas: number, memo = ""): Promise<string> {
  const acc = await account(role);
  const { accountNumber, sequence: seq } = await sequence(acc.cosmos);
  const signer = new EthNativeSigner(acc, { signMode: "hybrid", rest: REST, registry: qorechainRegistry() });
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

/** An EVM transaction from the deployer (admitted by its scoped EVM window). */
export async function writeEvm(address: Address, abi: Abi, functionName: string, args: unknown[]) {
  const acc = await account("deployer");
  const wallet = createWalletClient({ account: privateKeyToAccount(acc.privateKey as unknown as Hex), chain: diana, transport: http(EVM_RPC, { retryCount: 3, retryDelay: 2000 }) });
  const hash = await wallet.writeContract({ address, abi, functionName, args, chain: diana, account: wallet.account! } as any);
  return client.waitForTransactionReceipt({ hash });
}

/** ML-DSA-87 signature by a signing-only role (reporter, curator). */
export async function pqSign(role: Role, message: Hex): Promise<Hex> {
  const acc = await account(role);
  return toHex(pqcSign(acc.pqc.secretKey, Buffer.from(message.slice(2), "hex")));
}
