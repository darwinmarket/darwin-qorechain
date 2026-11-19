/**
 * EVM-side helpers: wallet clients for the role accounts, Foundry artifacts, deployment records and
 * ML-DSA-87 signing of the messages the contracts expose (adminMessage, roundMessage,
 * rebalanceMessage, weightsMessage).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWalletClient, http, stringToHex, toHex, type Abi, type Address, type Hex, type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { pqcSign } from "@qorechain/sdk";
import { diana, EVM_RPC, publicClient } from "./net.js";
import { evmAccount, type Role } from "./accounts.js";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, "../..");
export const OUT = join(ROOT, "contracts/out");
export const DEPLOYMENTS = join(ROOT, "deployments/diana.json");

export function artifact(name: string): { abi: Abi; bytecode: Hex } {
  const a = JSON.parse(readFileSync(join(OUT, `${name}.sol/${name}.json`), "utf8"));
  return { abi: a.abi, bytecode: a.bytecode.object };
}

export type Deployments = Record<string, any>;
export function loadDeployments(): Deployments {
  return existsSync(DEPLOYMENTS) ? JSON.parse(readFileSync(DEPLOYMENTS, "utf8")) : {};
}
export function saveDeployments(d: Deployments) {
  mkdirSync(dirname(DEPLOYMENTS), { recursive: true });
  writeFileSync(DEPLOYMENTS, JSON.stringify(d, null, 2) + "\n");
}

const wallets = new Map<Role, WalletClient>();
export async function wallet(role: Role): Promise<WalletClient> {
  let w = wallets.get(role);
  if (!w) {
    const acc = await evmAccount(role);
    w = createWalletClient({ account: privateKeyToAccount(acc.privateKey as Hex), chain: diana, transport: http(EVM_RPC, { retryCount: 3, retryDelay: 2000 }) });
    wallets.set(role, w);
  }
  return w;
}

/** Send a contract write from `role` and wait for it; returns the receipt. */
export async function write(role: Role, address: Address, abi: Abi, functionName: string, args: unknown[] = [], value?: bigint) {
  const w = await wallet(role);
  const hash = await w.writeContract({ address, abi, functionName, args, value, chain: diana, account: w.account! } as any);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted in ${hash}`);
  return receipt;
}

export async function deploy(role: Role, name: string, args: unknown[] = []): Promise<Address> {
  const { abi, bytecode } = artifact(name);
  const w = await wallet(role);
  const hash = await w.deployContract({ abi, bytecode, args, chain: diana, account: w.account! } as any);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`deploy ${name} failed in ${hash}`);
  console.log(`  ${name.padEnd(14)} ${receipt.contractAddress}  (tx ${hash})`);
  return receipt.contractAddress;
}

/** ML-DSA-87 signature (hex) by `role` over raw message bytes. */
export async function pqSign(role: Role, message: Hex): Promise<Hex> {
  const acc = await evmAccount(role);
  return toHex(pqcSign(acc.pqc.secretKey, Buffer.from(message.slice(2), "hex")));
}

export const action = (name: string) => stringToHex(name, { size: 32 });

/**
 * Run an admin action on a PqcAdmin contract: read the exact message the contract will check,
 * sign it with the admin's ML-DSA-87 key, then relay it from `relayer`.
 */
export async function adminCall(
  contract: Address, abi: Abi, fn: string, actionName: string, params: Hex, args: unknown[],
  relayer: Role = "deployer",
) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const nonce = (await publicClient.readContract({ address: contract, abi, functionName: "adminNonce" })) as bigint;
  const msg = (await publicClient.readContract({
    address: contract, abi, functionName: "adminMessage", args: [action(actionName), params, nonce, deadline],
  })) as Hex;
  const sig = await pqSign("deployer", msg); // the deployer account is the admin
  return write(relayer, contract, abi, fn, [...args, deadline, sig]);
}
