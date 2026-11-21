/**
 * PQC key registration and EVM authorisation windows for Darwin's role accounts.
 *
 *   tsx src/window.ts register <role|all>             register the ML-DSA-87 key (classical bootstrap tx)
 *   tsx src/window.ts open <role> [blocks] [txs] [targets...]
 *                                                     open a window; with targets it is SCOPED to them
 *   tsx src/window.ts close <role>
 */
import { buildRegisterPqcKeyMsg, closeEvmWindowMsg, fetchPqcStatus, openEvmWindowMsg, signProofOfPossession } from "@qorechain/sdk";
import { evmWindowCost } from "@qorechain/evm";
import { evmAccount, type Role } from "./accounts.js";
import { sendFromRole } from "./nativeClient.js";
import { CHAIN_ID, REST } from "./net.js";

const ROLES: Role[] = ["deployer", "reporter", "curator"];

export async function register(role: Role) {
  const acc = await evmAccount(role);
  const st = await fetchPqcStatus({ rest: REST, address: acc.cosmos });
  if (st.registered) return console.log(`${role}: PQC key already registered`);
  const proofOfPossession = signProofOfPossession({ chainId: CHAIN_ID, account: acc.cosmos, keypair: acc.pqc });
  const msg = buildRegisterPqcKeyMsg(acc.cosmos, { pqcKeypair: acc.pqc, proofOfPossession });
  console.log(`${role}: registered ${await sendFromRole(role, [msg], "classical", "700000")}`);
}

export async function open(role: Role, blocks = 17_280n, maxTxs = 1_000n, targets: string[] = []) {
  const acc = await evmAccount(role);
  // Each admitted tx may consume value + gasLimit x maxFeePerGas: budget 3M gas at 250 gwei.
  const perTx = evmWindowCost({ gas: 3_000_000n, maxFeePerGas: 250_000_000_000n });
  // WINDOW_MAX_QOR raises the value cap for a one-off transfer of QOR into the EVM (wrapping it for
  // the reserve); by default the cap only covers gas.
  const maxValue = process.env.WINDOW_MAX_QOR ? BigInt(process.env.WINDOW_MAX_QOR) * 10n ** 18n : perTx * maxTxs;
  const msg = openEvmWindowMsg({
    sender: acc.cosmos,
    blocks,
    maxTxs,
    maxValue,
    ...(targets.length ? { allowedTargets: targets } : {}),
  } as Parameters<typeof openEvmWindowMsg>[0]);
  const tx = await sendFromRole(role, [msg], "hybrid");
  console.log(`${role}: window ${tx} (${blocks} blocks, ${maxTxs} txs, ${targets.length ? `scoped to ${targets.length} targets` : "unscoped"})`);
  return tx;
}

export async function close(role: Role) {
  const acc = await evmAccount(role);
  console.log(`${role}: closed ${await sendFromRole(role, [closeEvmWindowMsg(acc.cosmos)], "hybrid")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, who, ...rest] = process.argv.slice(2);
  const roles = who === "all" ? ROLES : [who as Role];
  if (cmd === "register") for (const r of roles) await register(r);
  else if (cmd === "open") await open(who as Role, BigInt(rest[0] ?? 17280), BigInt(rest[1] ?? 1000), rest.slice(2));
  else if (cmd === "close") await close(who as Role);
  else console.error("usage: window.ts register <role|all> | open <role> [blocks] [txs] [targets...] | close <role>");
}
