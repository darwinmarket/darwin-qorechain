/**
 * Server-only: Darwin's relayers for DarwinAccounts (contracts/src/account), the windowless path.
 *
 *   info(owner)        the user's account address, whether it exists, its nonce and balances, and
 *                      the relayer that serves this user;
 *   deposit(owner, tx) the user sent fUSD (bank form) to its relayer with a MsgSend QoreX signed;
 *                      the relayer converts exactly that amount to its ERC-20 form, straight onto
 *                      the user's account (MsgConvertCoin with the account as receiver);
 *   execute(req)       a message the user signed in QoreX: both halves checked here against the
 *                      user's keys on chain (QoreSign), then submitted through the factory, where
 *                      the account checks the ML-DSA-87 half again with pqcVerify. A withdrawal
 *                      (the account's fUSD handed to the relayer) is returned to the user's QoreX
 *                      wallet in its bank form (MsgConvertERC20 with the user as receiver).
 *
 * A pool of relayers: serverless calls run in parallel instances, and two instances signing with one
 * account collide on its sequence (found by the multi-user battery). Each user is served by one
 * relayer of the pool, fixed by its address, so users spread over the pool; a collision that still
 * happens is retried with the sequence the chain expects (server/chain.ts).
 *
 * Single use: the account's nonce for trades; for deposits and withdrawals, the relayer's own memos
 * (`darwin deposit <tx>`, `darwin withdraw <tx>`), read back from the chain, so it survives restarts.
 * settleDeposits() and settleWithdrawals() finish any deposit or withdrawal a cut call left
 * halfway. Executions go out on the native lane, as MsgCrossVMCall hybrid-signed by the relayer
 * (secp256k1 + ML-DSA-87): no EVM window, and no ECDSA-only transaction. The conversions need 2M gas
 * (below it the chain reports "failed to retrieve balance").
 */
import { verifyMessageWithChain } from "@qorechain/qoresign/network";
import { addressFromBytes, parseAddress, type MessageSignature } from "@qorechain/qoresign";
import {
  BaseError, bytesToHex, decodeErrorResult, decodeFunctionData, encodeFunctionData, getAddress, hexToBytes, keccak256, parseAbi, parseTransaction,
  type Address, type Hex,
} from "viem";
import { accountAbi, accountErc20Abi, accountRouterAbi, factoryAbi, FACTORY, textFor, type Call } from "@/lib/qore/account";
import { erc20Abi } from "@/lib/qore/abis";
import { ROUTER, TOKEN_INFO, TOKENS } from "@/lib/qore/chain";
import { convertCoin, convertErc20 } from "@/lib/qore/proto";
import { account, RELAYERS, type Role } from "./keys";
import { CHAIN_ID, client, crossVmMsg, D, json, REST, sendNative } from "./chain";
import { freshRound } from "./keeper";

const ADDR = /^qor1[02-9ac-hj-np-z]{38}$/;
const FUSD_DENOM = TOKEN_INFO.fUSD.denom!;
const BASKETS = Object.entries(D.baskets as Record<string, { address: string }>).map(([k, b]) => [k, b.address.toLowerCase()] as const);
const ALLOWED = new Set([ROUTER, TOKENS.fUSD, ...BASKETS.map(([, a]) => a)].map((a) => a.toLowerCase()));
/** Memo of the app's deposits: settleDeposits() credits only these, never another transfer. */
export const DEPOSIT_MEMO = "Darwin: deposit";
/**
 * Deposits credited from this time on carry a 1 uqor marker to the depositor, which makes the credit
 * findable by an indexed search (relayer -> depositor). Older deposits are reconciled by
 * ops/src/reconcile-deposits.ts, never by settleDeposits().
 */
export const MARKED_SINCE = Date.parse("2026-11-21T00:30:00Z");

const ERRORS = parseAbi([
  "error CallFailed(uint256 index, bytes reason)",
  "error Slippage(uint256 amount, uint256 limit)",
  "error TooSmall()",
  "error ZeroAmount()",
  "error ZeroShares()",
  "error MintIsPaused()",
  "error InsufficientInventory(address token, uint256 needed, uint256 available)",
  "error PriceStale(uint16 feedId, uint64 updatedAt)",
  "error NoFeed(address token)",
  "error NotListed(address token)",
  "error TargetNotAllowed(address target)",
  "error Expired(uint256 deadline)",
  "error NoCalls()",
  "error BadPqcSignature(address account)",
  "error PqcKeyNotRegistered(address account)",
  "error PqcKeyNotProven(address account)",
  "error NotMlDsa87(address account, uint8 algorithmId)",
  "error OwnerNotQuantumSafe(address owner)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error SafeERC20FailedOperation(address token)",
]);

/** A revert as words: CallFailed is unwrapped to the call that failed and its own reason. */
function revertReason(e: unknown): string | null {
  const raw = (e instanceof BaseError ? (e.walk((x: any) => typeof x?.data === "string") as any)?.data : undefined) ?? (e as any)?.data;
  if (typeof raw !== "string" || !raw.startsWith("0x")) return null;
  const name = (data: Hex): string => {
    try {
      const r = decodeErrorResult({ abi: ERRORS, data });
      if (r.errorName === "CallFailed") return `call ${r.args[0]} failed: ${name(r.args[1] as Hex)}`;
      return `${r.errorName}(${(r.args ?? []).map(String).join(", ")})`;
    } catch {
      return data === "0x" ? "reverted without a reason" : `revert ${data.slice(0, 10)}`;
    }
  };
  return name(raw as Hex);
}
const humane = (reason: string) =>
  /InsufficientInventory/.test(reason)
    ? `the vault cannot fill this right now (${reason})`
    : /ERC20InsufficientBalance/.test(reason)
      ? `not enough balance on your Darwin account (${reason})`
      : /Slippage/.test(reason)
        ? `the price moved past your limit (${reason})`
        : /PriceStale/.test(reason)
          ? `the oracle price is stale; try again in a minute (${reason})`
          : reason;

const twinOf = (qor1: string) => parseAddress(qor1).hex as Address;
/** 1 uqor to the depositor. MsgSend is a type the signer's registry knows: it takes the object form
 *  (a hand-encoded value would be re-encoded as an empty message). */
const marker = (from: string, to: string) => ({ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: from, toAddress: to, amount: [{ denom: "uqor", amount: "1" }] } }) as any;

/** The relayer of the pool that serves `owner`: fixed by its address, so a user's calls stay in order. */
export function relayerFor(owner: string): Role {
  const h = keccak256(hexToBytes(twinOf(owner)));
  return RELAYERS[parseInt(h.slice(2, 6), 16) % RELAYERS.length];
}
const pool = () => Promise.all(RELAYERS.map(async (role) => ({ role, ...(await account(role)) })));

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
  const rel = await account(relayerFor(owner));
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
/**
 * Has `role` already sent the transaction tagged `tag` to `owner`? Searched by an indexed event
 * (the owner as a transfer recipient), every page, keeping the relayer's own: a credit or a return always
 * transfers something to the owner (the 1 uqor marker, or the returned fUSD). Reading only the
 * relayer's latest transactions missed older credits under load and credited them twice (found
 * by the multi-user battery).
 */
const done = new Set<string>();
async function relayerMemo(role: Role, tag: string, owner: string): Promise<boolean> {
  if (done.has(tag)) return true;
  const rel = await account(role);
  // this node's search returns nothing for AND queries: search by recipient, filter the sender here
  const query = `transfer.recipient='${owner}'`;
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({ query, order_by: "ORDER_BY_DESC", "pagination.limit": "100", page: String(page) });
    const r = await json(`${REST}/cosmos/tx/v1beta1/txs?${qs}`); // a failed search must not read as "not done"
    const txs = (r.tx_responses ?? []) as any[];
    const fromRelayer = (t: any) => t.events?.some((e: any) => e.type === "tx" && e.attributes.some((x: any) => x.key === "fee_payer" && x.value === rel.cosmos));
    if (txs.some((t) => t.code === 0 && String(t.tx?.body?.memo ?? "") === tag && fromRelayer(t))) {
      done.add(tag);
      return true;
    }
    if (txs.length < 100) return false;
  }
  throw new Error("too many transactions to search");
}

/** One queue per relayer in this instance: its transactions go out in order. */
const queues = new Map<Role, Promise<unknown>>();
function serial<T>(role: Role, fn: () => Promise<T>): Promise<T> {
  const next = (queues.get(role) ?? Promise.resolve()).then(fn, fn);
  queues.set(role, next.catch(() => undefined));
  return next as Promise<T>;
}

/** The fUSD a deposit transaction sent to one of Darwin's relayers, and which one. */
async function depositOf(hash: string, txJson?: any) {
  let tx: any = txJson ?? null;
  for (let i = 0; i < 10 && !tx; i++) {
    tx = await json(`${REST}/cosmos/tx/v1beta1/txs/${hash}`).catch(() => null);
    if (!tx) await new Promise((r) => setTimeout(r, 1500));
  }
  if (!tx?.tx_response) throw new Error("deposit transaction not found");
  if (tx.tx_response.code !== 0) throw new Error("the deposit transaction failed on chain");
  const relayers = await pool();
  const out: { from: string; role: Role; amount: bigint }[] = [];
  for (const m of tx.tx.body.messages as any[]) {
    if (m["@type"] !== "/cosmos.bank.v1beta1.MsgSend") continue;
    const rel = relayers.find((r) => r.cosmos === m.to_address);
    if (!rel) continue;
    const amount = (m.amount ?? []).filter((c: any) => c.denom === FUSD_DENOM).reduce((s: bigint, c: any) => s + BigInt(c.amount), 0n);
    if (amount > 0n) out.push({ from: m.from_address, role: rel.role, amount });
  }
  return { sends: out, memo: String(tx.tx.body.memo ?? "") };
}

async function credit(owner: string, role: Role, amount: bigint, hash: string) {
  const acc = await accountOf(owner);
  const tag = `darwin deposit ${hash}`;
  return serial(role, async () => {
    if (await relayerMemo(role, tag, owner)) return { account: acc, amount: String(amount), already: true as const };
    const rel = await account(role);
    // the 1 uqor marker to the depositor makes this credit findable by relayerMemo()
    const out = await sendNative(role, [convertCoin(rel.cosmos, acc, FUSD_DENOM, amount) as any, marker(rel.cosmos, owner)], 2_000_000, tag);
    done.add(tag);
    return { account: acc, amount: String(amount), txHash: out };
  });
}

/** The user's MsgSend of fUSD to its relayer becomes the same amount of ERC-20 fUSD on its account. */
export async function deposit(owner: string, txHash: string) {
  if (!ADDR.test(owner)) throw new Error("bad account");
  if (!/^[0-9A-Fa-f]{64}$/.test(txHash)) throw new Error("bad tx hash");
  const hash = txHash.toUpperCase();
  const { sends } = await depositOf(hash);
  const mine = sends.filter((s) => s.from === owner);
  if (!mine.length) throw new Error("no fUSD sent from this account to Darwin's relayers in that transaction");
  const role = mine[0].role;
  const amount = mine.filter((s) => s.role === role).reduce((a, s) => a + s.amount, 0n);
  return credit(owner, role, amount, hash);
}

/**
 * Credit deposits whose claim never reached the server, or was cut: the app's MsgSends of fUSD to
 * each relayer in the last 48 hours (memo "Darwin: deposit…") without their `darwin deposit <tx>`
 * memo are converted onto the sender's account now. Runs before each deposit and in the daily cron.
 */
export async function settleDeposits(): Promise<string[]> {
  const out: string[] = [];
  for (const rel of await pool()) {
    const qs = new URLSearchParams({ query: `transfer.recipient='${rel.cosmos}'`, order_by: "ORDER_BY_DESC", "pagination.limit": "50" });
    const r = await json(`${REST}/cosmos/tx/v1beta1/txs?${qs}`).catch(() => ({ tx_responses: [] }));
    const txs = (r.tx_responses ?? []) as any[];
    for (const t of txs) {
      if (t.code !== 0 || Date.now() - Date.parse(t.timestamp) > 48 * 3600_000) continue;
      if (Date.parse(t.timestamp) < MARKED_SINCE) continue; // before the marker: reconciled offline
      if (!String(t.tx?.body?.memo ?? "").startsWith(DEPOSIT_MEMO)) continue;
      const { sends } = await depositOf(t.txhash, { tx: t.tx, tx_response: t }).catch(() => ({ sends: [] as any[] }));
      for (const s of sends.filter((x: any) => x.role === rel.role)) {
        if (!ADDR.test(s.from)) continue;
        try {
          const c = await credit(s.from, rel.role, s.amount, t.txhash);
          if (!("already" in c)) out.push(`credited ${s.amount} to ${s.from} (${c.txHash})`);
        } catch (e) {
          out.push(`deposit ${t.txhash} not credited: ${String((e as Error)?.message ?? e).slice(0, 120)}`);
        }
      }
    }
  }
  return out;
}

// ---- withdrawals ---------------------------------------------------------------------------------
/**
 * Finish withdrawals left halfway: a withdrawal is two transactions (the account hands fUSD to the
 * relayer, then the relayer returns it to the owner's wallet), and a serverless call can be cut
 * between them. The factory's recent transactions are read back; every successful withdrawal to a
 * relayer of the pool without its `darwin withdraw <hash>` memo is completed now. Runs before each
 * withdrawal and in the daily cron. A second return of the same withdrawal cannot happen silently:
 * a relayer's EVM side holds only in-flight withdrawals, so a duplicate conversion would fail.
 */
export async function settleWithdrawals(): Promise<string[]> {
  const relayers = await pool();
  const recent = async (query: string) =>
    ((await json(`${REST}/cosmos/tx/v1beta1/txs?${new URLSearchParams({ query, order_by: "ORDER_BY_DESC", "pagination.limit": "50" })}`).catch(() => ({ tx_responses: [] }))).tx_responses ?? []) as any[];
  const [evmTxs, nativeTxs] = await Promise.all([recent(`ethereum_tx.recipient='${getAddress(FACTORY)}'`), recent(`crossvm_request.target_contract='${FACTORY.toLowerCase()}'`)]);
  const out: string[] = [];
  for (const t of [...evmTxs, ...nativeTxs]) {
    if (Date.now() - Date.parse(t.timestamp) > 48 * 3600_000) continue;
    // a withdrawal younger than two minutes may still be finishing in its own call
    if (Date.now() - Date.parse(t.timestamp) < 120_000) continue;
    const input = executionInput(t);
    if (!input) continue;
    const hash = input.hash;
    try {
      const exec = decodeFunctionData({ abi: factoryAbi, data: input.data });
      if (exec.functionName !== "execute") continue;
      const calls = exec.args[1] as readonly Call[];
      if (calls.length !== 1 || calls[0].target.toLowerCase() !== TOKENS.fUSD.toLowerCase()) continue;
      const call = decodeFunctionData({ abi: accountErc20Abi, data: calls[0].data });
      if (call.functionName !== "transfer") continue;
      const rel = relayers.find((x) => x.evm.toLowerCase() === String(call.args[0]).toLowerCase());
      if (!rel) continue;
      const tag = `darwin withdraw ${hash}`;
      const owner = addressFromBytes(hexToBytes(exec.args[0] as Hex)).bech32;
      if (await relayerMemo(rel.role, tag, owner)) continue;
      const back = await serial(rel.role, async () => {
        if (await relayerMemo(rel.role, tag, owner)) return null;
        const b = await sendNative(rel.role, [convertErc20(rel.cosmos, owner, TOKENS.fUSD, call.args[1] as bigint) as any], 2_000_000, tag);
        done.add(tag);
        return b;
      });
      if (back) out.push(`returned ${call.args[1]} to ${owner} (${back})`);
    } catch {
      /* not a withdrawal */
    }
  }
  return out;
}

/**
 * The factory.execute calldata of a transaction, and its hash as Darwin names it: an EVM
 * transaction (before the native lane: its 0x hash) or a relayer's MsgCrossVMCall (its tx hash).
 */
function executionInput(t: any): { data: Hex; hash: string } | null {
  if (t.code !== 0) return null;
  for (const m of t.tx?.body?.messages ?? []) {
    if (m["@type"] === "/cosmos.evm.vm.v1.MsgEthereumTx" && m.raw) {
      if (t.events?.some((e: any) => e.type === "ethereum_tx" && e.attributes.some((a: any) => a.key === "ethereumTxFailed"))) return null;
      const hash = t.events?.find((e: any) => e.type === "ethereum_tx")?.attributes?.find((a: any) => a.key === "ethereumTxHash")?.value;
      const data = parseTransaction(m.raw as Hex).data;
      return hash && data ? { data, hash } : null;
    }
    if (m["@type"] === "/qorechain.crossvm.v1.MsgCrossVMCall" && String(m.target_contract).toLowerCase() === FACTORY.toLowerCase() && m.payload) {
      const ok = t.events?.some((e: any) => e.type === "crossvm_response" && e.attributes.some((a: any) => a.key === "status" && a.value === "executed"));
      return ok ? { data: bytesToHex(Uint8Array.from(Buffer.from(m.payload, "base64"))), hash: t.txhash } : null;
    }
  }
  return null;
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

  const role = relayerFor(owner);
  const rel = await account(role);
  const acc = await accountOf(owner);
  const what = classify(calls, acc, rel.evm as Address);
  const nonce = await nonceOf(acc);
  const text = textFor(acc, calls, summary, nonce, deadline);
  // both halves, against the owner's keys on chain, before the relayer spends anything
  await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: owner, data: text, signature: req.signature, requirePq: true });

  // the price round is shared: prepare it outside the relayer's queue
  if (what.kind !== "withdraw") await freshRound();
  if (what.kind === "withdraw") await settleWithdrawals().catch(() => []);

  return serial(role, async () => {
    if ((await nonceOf(acc)) !== nonce) throw new Error("this message was already executed");
    const pqSignature = ("0x" + Buffer.from(req.signature.pq!.signature, "base64").toString("hex")) as Hex;
    const args = [twinOf(owner), calls, summary, deadline, pqSignature] as const;
    // simulate first, from the relayer's EVM address: a refusal is named before anything is spent
    let evmGas: bigint;
    try {
      evmGas = await client.estimateContractGas({ address: FACTORY, abi: factoryAbi, functionName: "execute", args, account: rel.evm as Address } as any);
    } catch (e) {
      const reason = revertReason(e);
      throw new Error(reason ? `refused before sending: ${humane(reason)}` : String((e as Error)?.message ?? e).split("\n")[0]);
    }
    // Sent on the native lane: a MsgCrossVMCall the relayer hybrid-signs (secp256k1 + ML-DSA-87),
    // so the transaction itself is post-quantum, and the user's ML-DSA-87 signature inside is
    // checked again by the account (pqcVerify). An EVM transaction would carry ECDSA alone.
    const data = encodeFunctionData({ abi: factoryAbi, functionName: "execute", args });
    // a cross-VM call meters the EVM execution in native gas, at about 2.5x the EVM estimate
    let gas = Math.max(1_200_000, Math.ceil(Number(evmGas) * 2.8) + 400_000);
    let hash: string | undefined;
    for (let attempt = 0; !hash; attempt++) {
      try {
        hash = await sendNative(role, [crossVmMsg(rel.cosmos, FACTORY, data)], gas, `darwin execute ${acc.toLowerCase()} ${nonce}`);
      } catch (e) {
        // a cut broadcast may still have landed: the account's nonce tells
        if ((await nonceOf(acc)) !== nonce) throw new Error("this message was already executed");
        // out of gas reverts the whole call, nonce included: send again with more
        if (attempt < 2 && /out of gas/i.test(String((e as Error)?.message ?? e))) {
          gas = Math.ceil(gas * 1.6);
          continue;
        }
        throw e;
      }
    }
    let returned: string | undefined;
    if (what.kind === "withdraw") {
      const tag = `darwin withdraw ${hash}`;
      try {
        returned = await sendNative(role, [convertErc20(rel.cosmos, owner, TOKENS.fUSD, what.amount!) as any], 2_000_000, tag);
      } catch (e) {
        // returned meanwhile by a settle in another call? then the user has its fUSD: not a failure
        await new Promise((r) => setTimeout(r, 3000));
        if (!(await relayerMemo(role, tag, owner).catch(() => false))) throw e;
        returned = "returned by settleWithdrawals";
      }
      done.add(tag);
    }
    return { txHash: hash, account: acc, kind: what.kind, returned, gasUsed: String(gas) };
  });
}


