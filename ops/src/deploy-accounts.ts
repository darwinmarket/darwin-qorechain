/**
 * Deploy DarwinAccountFactory (contracts/src/account): QoreX users' accounts controlled only by
 * their ML-DSA-87 key. Allowed targets: the router, every live basket and fUSD.
 *
 *   tsx src/deploy-accounts.ts
 *
 * A contract creation is refused in a scoped window, so the deployer opens a short unscoped one,
 * deploys, then goes back to its scoped window. The relayer gets its own window scoped to the
 * factory, the only contract it ever calls for these accounts.
 */
import type { Address } from "viem";
import { evmAccount } from "./accounts.js";
import { deploy, loadDeployments, saveDeployments } from "./evm.js";
import { close, open } from "./window.js";

const d = loadDeployments();
const baskets = Object.values(d.baskets as Record<string, { address: Address }>).map((b) => b.address);
const targets: Address[] = [d.router, d.tokens.fUSD, ...baskets];

if (!d.accountFactory) {
  await close("deployer").catch(() => {});
  await open("deployer", 600n, 5n);
  await new Promise((r) => setTimeout(r, 6000));
  const admin = (await evmAccount("deployer")).evm as Address;
  d.accountFactory = await deploy("deployer", "DarwinAccountFactory", [admin, targets]);
  d.steps["deploy DarwinAccountFactory"] = new Date().toISOString();
  saveDeployments(d);
}
console.log("factory", d.accountFactory, "targets", targets.length);

// back to the deployer's scoped window (as app/src/server/keeper.ts ensureWindow keeps it)
const scoped = [d.oracle, d.reserve, d.router, ...baskets, ...Object.values(d.tokens as Record<string, string>)].map((a: string) => a.toLowerCase());
await close("deployer").catch(() => {});
await open("deployer", 17_280n, 1_000n, scoped);
await close("relayer").catch(() => {});
await open("relayer", 17_280n, 1_000n, [String(d.accountFactory).toLowerCase()]);
