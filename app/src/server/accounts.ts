/**
 * Server-only: Darwin's relayer for DarwinAccounts (contracts/src/account), the windowless path.
 *
 *   info(owner)        the user's account address, whether it exists, its nonce and balances;
 *   deposit(owner, tx) the user sent fUSD (bank form) to the relayer with a MsgSend QoreX signed;
 *                      the relayer converts exactly that amount to its ERC-20 form, straight onto
 *                      the user's account (MsgConvertCoin with the account as receiver);
 *   execute(req)       a message the user signed in QoreX: both halves checked here against the
 *                      user's keys on chain (QoreSign), then submitted through the factory, where
 *                      the account checks the ML-DSA-87 half again with pqcVerify. A withdrawal
 *                      (the account's fUSD handed to the relayer) is returned to the user's QoreX
 *                      wallet in its bank form (MsgConvertERC20 with the user as receiver).
 *
 * Single use: the account's nonce for trades; for deposits and withdrawals, the relayer's own memos
 * (`darwin deposit <tx>`, `darwin withdraw <tx>`), read back from the chain, so it survives restarts.
 * The relayer's EVM window is scoped to the factory, the only contract it calls (the conversions
 * need no target of their own, but 2M gas: below it the chain reports "failed to retrieve balance").
 */
import { fetchEvmWindow, verifyMessageWithChain } from "@qorechain/qoresign/network";
import { parseAddress, type MessageSignature } from "@qorechain/qoresign";
import { openEvmWindowMsg } from "@qorechain/sdk";
import { evmWindowCost } from "@qorechain/evm";
import { createWalletClient, decodeFunctionData, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { accountAbi, accountErc20Abi, accountRouterAbi, factoryAbi, FACTORY, textFor, type Call } from "@/lib/qore/account";
import { erc20Abi } from "@/lib/qore/abis";
import { diana, EVM_RPC, ROUTER, TOKEN_INFO, TOKENS } from "@/lib/qore/chain";
import { convertCoin, convertErc20 } from "@/lib/qore/proto";
import { account } from "./keys";
import { CHAIN_ID, client, D, json, REST, sendNative } from "./chain";
import { freshRound } from "./keeper";

const ADDR = /^qor1[02-9ac-hj-np-z]{38}$/;
const FUSD_DENOM = TOKEN_INFO.fUSD.denom!;
const BASKETS = Object.entries(D.baskets as Record<string, { address: string }>).map(([k, b]) => [k, b.address.toLowerCase()] as const);
const ALLOWED = new Set([ROUTER, TOKENS.fUSD, ...BASKETS.map(([, a]) => a)].map((a) => a.toLowerCase()));

const twinOf = (qor1: string) => parseAddress(qor1).hex as Address;

export async function accountOf(owner: string): Promise<Address> {
  return (await client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "accountOf", args: [twinOf(owner)] })) as Address;
}

async function nonceOf(acc: Address): Promise<bigint> {
  const code = await client.getCode({ address: acc });
  if (!code || code === "0x") return 0n;
  return (await client.readContract({ address: acc, abi: accountAbi, functionName: "nonce" })) as bigint;
}

export async function info(owner: string) {
  if (!ADDR.test(owner)) throw new Error("bad account");
  const acc = await accountOf(owner);
  const rel = await account("relayer");
  const [code, nonce, fusd, ...shares] = await Promise.all([
    client.getCode({ address: acc }),
    nonceOf(acc),
    client.readContract({ address: TOKENS.fUSD, abi: erc20Abi, functionName: "balanceOf", args: [acc] }),
    ...BASKETS.map(([, b]) => client.readContract({ address: b as Address, abi: erc20Abi, functionName: "balanceOf", args: [acc] })),
  ]);
  const allowances = await Promise.all([
    client.readContract({ address: TOKENS.fUSD, abi: erc20Abi, functionName: "allowance", args: [acc, ROUTER] }),
    ...BASKETS.map(([, b]) => client.readContract({ address: b as Address, abi: erc20Abi, functionName: "allowance", args: [acc, ROUTER] })),
  ]);
  return {
    account: acc,
    exists: Boolean(code && code !== "0x"),
    nonce: String(nonce),
    fusd: String(fusd),
    shares: Object.fromEntries(BASKETS.map(([k], i) => [k, String(shares[i])])),
    allowance: { fUSD: String(allowances[0]), ...Object.fromEntries(BASKETS.map(([k], i) => [k, String(allowances[i + 1])])) },
    relayer: { cosmos: rel.cosmos, evm: rel.evm as Address },
    factory: FACTORY,
  };
}

// ---- single use of deposits and withdrawals, from the relayer's own memos --------------------
const done = new Set<string>();
async function relayerMemo(tag: string): Promise<boolean> {
  if (done.has(tag)) return true;
  const rel = await account("relayer");
  const q = encodeURIComponent(`message.sender='${rel.cosmos}'`);
  const r = await json(`${REST}/cosmos/tx/v1beta1/txs?query=${q}&order_by=ORDER_BY_DESC&pagination.limit=50`).catch(() => ({ tx_responses: [] }));
  return (r.tx_responses ?? []).some((t: any) => t.code === 0 && String(t.tx?.body?.memo ?? "") === tag);
}

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>) => (queue = queue.then(fn, fn)) as Promise<T>;

/** The user's MsgSend of fUSD to the relayer becomes the same amount of ERC-20 fUSD on the user's account. */
export async function deposit(owner: string, txHash: string) {
  if (!ADDR.test(owner)) throw new Error("bad account");
  if (!/^[0-9A-Fa-f]{64}$/.test(txHash)) throw new Error("bad tx hash");
  const hash = txHash.toUpperCase();
  const rel = await account("relayer");
  let tx: any = null;
  for (let i = 0; i < 10 && !tx; i++) {
    tx = await json(`${REST}/cosmos/tx/v1beta1/txs/${hash}`).catch(() => null);
    if (!tx) await new Promise((r) => setTimeout(r, 1500));
  }
  if (!tx?.tx_response) throw new Error("deposit transaction not found");
  if (tx.tx_response.code !== 0) throw new Error("the deposit transaction failed on chain");
  let amount = 0n;
  for (const m of tx.tx.body.messages as any[]) {
    if (m["@type"] !== "/cosmos.bank.v1beta1.MsgSend" || m.from_address !== owner || m.to_address !== rel.cosmos) continue;
    for (const c of m.amount ?? []) if (c.denom === FUSD_DENOM) amount += BigInt(c.amount);
  }
  if (amount === 0n) throw new Error("no fUSD sent from this account to Darwin's relayer in that transaction");
  const acc = await accountOf(owner);
  const tag = `darwin deposit ${hash}`;
  return serial(async () => {
    if (await relayerMemo(tag)) return { account: acc, amount: String(amount), already: true };
    await ensureRelayerWindow();
    const out = await sendNative("relayer", [convertCoin(rel.cosmos, acc, FUSD_DENOM, amount) as any], 2_000_000, tag);
    done.add(tag);
    return { account: acc, amount: String(amount), txHash: out };
  });
}

// ---- the relayer's EVM side ------------------------------------------------------------------
async function ensureRelayerWindow() {
  const rel = await account("relayer");
  const w: any = await fetchEvmWindow({ rest: REST, address: rel.cosmos }).catch(() => null);
  const scoped = (w?.allowedTargets ?? []).map((a: string) => a.toLowerCase());
  const need = [FACTORY.toLowerCase()];
  if (w?.live && Number(w.remainingBlocks) > 600 && Number(w.remainingTxs) > 20 && need.every((a) => scoped.includes(a))) return;
  const maxTxs = 1_000n;
  const msg = openEvmWindowMsg({
    sender: rel.cosmos,
    blocks: 17_280n,
    maxTxs,
    maxValue: evmWindowCost({ gas: 8_000_000n, maxFeePerGas: 250_000_000_000n }) * maxTxs,
    allowedTargets: need,
  } as any);
  await sendNative("relayer", [msg as any], 500_000);
  await new Promise((r) => setTimeout(r, 6000));
}

export type ExecuteRequest = { owner: string; calls: Call[]; summary: string; deadline: string; signature: MessageSignature };

/** What the calls do, checked before anything is spent; withdrawals are recognised to finish them. */
function classify(calls: Call[], acc: Address, relayerEvm: Address): { kind: "buy" | "sell" | "withdraw"; amount?: bigint } {
  const decoded = calls.map((c) => {
    const target = c.target.toLowerCase();
    if (target === ROUTER.toLowerCase()) return { target, fn: decodeFunctionData({ abi: accountRouterAbi, data: c.data }) };
    return { target, fn: decodeFunctionData({ abi: accountErc20Abi, data: c.data }) };
  });
  const last = decoded.at(-1)!;
  if (last.fn.functionName === "buy" || last.fn.functionName === "sell") {
    if (String(last.fn.args[3]).toLowerCase() !== acc.toLowerCase()) throw new Error("a trade must pay the account itself");
    for (const d of decoded.slice(0, -1)) if (d.fn.functionName !== "approve" || String(d.fn.args[0]).toLowerCase() !== ROUTER.toLowerCase()) throw new Error("only approvals of the router may precede a trade");
    return { kind: last.fn.functionName };
  }
  if (decoded.length === 1 && last.fn.functionName === "transfer" && last.target === TOKENS.fUSD.toLowerCase() && String(last.fn.args[0]).toLowerCase() === relayerEvm.toLowerCase())
    return { kind: "withdraw", amount: last.fn.args[1] as bigint };
  throw new Error("Darwin relays trades and fUSD withdrawals only");
}

export async function execute(req: ExecuteRequest) {
  const { owner, calls, summary } = req ?? ({} as ExecuteRequest);
  if (!ADDR.test(owner)) throw new Error("bad account");
  if (typeof req.deadline !== "string" || !/^\d{1,12}$/.test(req.deadline)) throw new Error("bad deadline");
  const deadline = BigInt(req.deadline);
  if (!Array.isArray(calls) || calls.length < 1 || calls.length > 3) throw new Error("one to three calls");
  if (calls.some((c) => !ALLOWED.has(String(c.target).toLowerCase()) || !/^0x[0-9a-fA-F]*$/.test(c.data))) throw new Error("only Darwin's contracts");
  if (typeof summary !== "string" || summary.length > 200) throw new Error("bad summary");
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= now || deadline > now + 900n) throw new Error("the message expired, or expires more than 15 minutes ahead");
  if (!req.signature?.pq?.signature) throw new Error("the message carries no ML-DSA-87 signature");

  const rel = await account("relayer");
  const acc = await accountOf(owner);
  const what = classify(calls, acc, rel.evm as Address);
  const nonce = await nonceOf(acc);
  const text = textFor(acc, calls, summary, nonce, deadline);
  // both halves, against the owner's keys on chain, before the relayer spends anything
  await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: owner, data: text, signature: req.signature, requirePq: true });

  return serial(async () => {
    if ((await nonceOf(acc)) !== nonce) throw new Error("this message was already executed");
    if (what.kind !== "withdraw") await freshRound();
    await ensureRelayerWindow();
    const w = createWalletClient({ account: privateKeyToAccount(rel.privateKey as unknown as Hex), chain: diana, transport: http(EVM_RPC, { retryCount: 3, retryDelay: 2000 }) });
    const pqSignature = ("0x" + Buffer.from(req.signature.pq!.signature, "base64").toString("hex")) as Hex;
    const args = [twinOf(owner), calls, summary, deadline, pqSignature] as const;
    const gas = await client.estimateContractGas({ address: FACTORY, abi: factoryAbi, functionName: "execute", args, account: w.account! } as any);
    const hash = await w.writeContract({ address: FACTORY, abi: factoryAbi, functionName: "execute", args, account: w.account!, chain: diana, gas: (gas * 125n) / 100n } as any);
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success") throw new Error(`reverted on chain in ${hash}`);
    let returned: string | undefined;
    if (what.kind === "withdraw") {
      const tag = `darwin withdraw ${hash}`;
      returned = await sendNative("relayer", [convertErc20(rel.cosmos, owner, TOKENS.fUSD, what.amount!) as any], 2_000_000, tag);
      done.add(tag);
    }
    return { txHash: hash, account: acc, kind: what.kind, returned, gasUsed: String(receipt.gasUsed) };
  });
}

