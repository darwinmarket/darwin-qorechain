/**
 * Server-only: the testnet role keys, derived from the testnet mnemonic.
 *
 * On Vercel the mnemonic is an encrypted environment variable (QORE_MNEMONIC); locally it is read
 * from ~/.config/qorechain/testnet.mnemonic. It is testnet-only and never sent to the browser:
 * this module is imported by route handlers alone.
 *
 * Roles (coin 60 = eth_secp256k1, each with its own ML-DSA-87 key registered on chain):
 *   deployer 0  admin, relays oracle rounds and rebalances (scoped EVM window)
 *   reporter 1  signs price rounds, never sends a transaction
 *   curator  2  signs rebalances, never sends a transaction
 *   relayer  3  executes QoreX users' signed intents through their authz grants
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { deriveUnifiedAccount, type UnifiedAccount } from "@qorechain/sdk";

export type Role = "deployer" | "reporter" | "curator" | "relayer";
const ROLE_INDEX: Record<Role, number> = { deployer: 0, reporter: 1, curator: 2, relayer: 3 };

function mnemonic(): string {
  const env = process.env.QORE_MNEMONIC?.trim();
  if (env) return env;
  const file = join(homedir(), ".config/qorechain/testnet.mnemonic");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  throw new Error("server keys unavailable: set QORE_MNEMONIC");
}

const cache = new Map<Role, Promise<UnifiedAccount>>();
export function account(role: Role): Promise<UnifiedAccount> {
  if (!cache.has(role)) cache.set(role, deriveUnifiedAccount(mnemonic(), ROLE_INDEX[role]));
  return cache.get(role)!;
}
