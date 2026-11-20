/**
 * Hybrid-signed (secp256k1 + ML-DSA-87) native-lane clients.
 *
 *  - The treasury is a coin-118 account: cosmjs DIRECT signer + the canonical ML-DSA-87 key.
 *  - The EVM role accounts are eth_secp256k1 (coin 60): they sign native messages through
 *    the SDK's EthNativeSigner, exactly as QoreX does for an Ethereum account.
 */
import { StargateClient } from "@cosmjs/stargate";
import type { EncodeObject } from "@cosmjs/proto-signing";
import { EthNativeSigner, TxClient, directSignerFromPrivateKey, qorechainRegistry } from "@qorechain/sdk";
import { ERC20_REGISTRY_TYPES } from "./erc20Msgs.js";
import { REST, RPC, CHAIN_ID } from "./net.js";
import { evmAccount, treasury, type Role } from "./accounts.js";

export async function treasuryClient() {
  const t = await treasury();
  const signer = await directSignerFromPrivateKey(t.native.privateKey, "qor");
  const registry = qorechainRegistry(ERC20_REGISTRY_TYPES);
  const client = await TxClient.connect({
    rpcEndpoint: RPC,
    signer,
    registry,
    pqcKeypair: t.pqc,
    rest: REST,
  });
  return { client, address: t.native.address };
}

async function accountSequence(address: string) {
  const res = await fetch(`${REST}/cosmos/auth/v1beta1/accounts/${address}`);
  if (res.status === 404) throw new Error(`${address} does not exist on chain yet: fund it first`);
  const body = (await res.json()) as { account?: Record<string, any> };
  const acc = (body.account?.base_account ?? body.account ?? {}) as Record<string, string>;
  return { accountNumber: BigInt(acc.account_number ?? "0"), sequence: BigInt(acc.sequence ?? "0") };
}

/** Sign and broadcast native messages from an EVM role account (eth_secp256k1 + ML-DSA-87). */
export async function sendFromRole(
  role: Role,
  messages: EncodeObject[],
  mode: "hybrid" | "classical" = "hybrid",
  gas = "800000",
  memo = "",
): Promise<string> {
  const acc = await evmAccount(role);
  const { accountNumber, sequence } = await accountSequence(acc.cosmos);
  const signer = new EthNativeSigner(acc, { signMode: mode, rest: REST, registry: qorechainRegistry(ERC20_REGISTRY_TYPES) });
  const transport = await StargateClient.connect(RPC);
  try {
    const res = await signer.signAndBroadcast(transport, {
      chainId: CHAIN_ID,
      accountNumber,
      sequence,
      fee: { amount: [{ denom: "uqor", amount: String(Math.ceil(Number(gas) * 0.125)) }], gas },
      messages,
      memo,
    } as Parameters<EthNativeSigner["signAndBroadcast"]>[1]);
    const r = res as { transactionHash: string; code?: number; rawLog?: string };
    if (r.code) throw new Error(`tx ${r.transactionHash} failed: code ${r.code} ${r.rawLog ?? ""}`);
    return r.transactionHash;
  } finally {
    transport.disconnect();
  }
}
