/**
 * Darwin's testnet accounts, all derived from one BIP-39 mnemonic.
 *
 *  - treasury : m/44'/118'/0'/0/0, the QoreX account that receives the faucet. Native lane only.
 *  - deployer : m/44'/60'/0'/0/0 (index 0), eth_secp256k1. Deploys and owns the contracts.
 *  - reporter : index 1. Its ML-DSA-87 key signs every oracle price round.
 *  - curator  : index 2. Its ML-DSA-87 key signs every basket rebalance.
 *
 * The mnemonic is read from QORE_MNEMONIC or from ~/.config/qorechain/testnet.mnemonic.
 * It is a testnet-only phrase: never reuse it on mainnet.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  deriveNativeAccount,
  derivePqcCanonical,
  deriveUnifiedAccount,
  type UnifiedAccount,
} from "@qorechain/sdk";

export function mnemonic(): string {
  const env = process.env.QORE_MNEMONIC?.trim();
  if (env) return env;
  const file = join(homedir(), ".config/qorechain/testnet.mnemonic");
  if (!existsSync(file)) throw new Error("Set QORE_MNEMONIC or create ~/.config/qorechain/testnet.mnemonic");
  return readFileSync(file, "utf8").trim();
}

export type Role = "deployer" | "reporter" | "curator" | "relayer" | "relayer2" | "relayer3" | "relayer4";
// relayer: executes QoreX users' signed trade intents through their authz grants (relayer.ts), and,
// with relayer2..4, forms the pool that submits DarwinAccount messages (app/src/server/accounts.ts)
export const ROLE_INDEX: Record<Role, number> = { deployer: 0, reporter: 1, curator: 2, relayer: 3, relayer2: 4, relayer3: 5, relayer4: 6 };
export const RELAYERS: Role[] = ["relayer", "relayer2", "relayer3", "relayer4"];

export async function evmAccount(role: Role): Promise<UnifiedAccount> {
  return deriveUnifiedAccount(mnemonic(), ROLE_INDEX[role]);
}

export async function treasury() {
  const m = mnemonic();
  const native = await deriveNativeAccount(m);
  const pqc = derivePqcCanonical(native.address, m);
  return { native, pqc };
}
