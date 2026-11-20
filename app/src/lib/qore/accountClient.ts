"use client";

/**
 * The windowless path in the browser: the user's DarwinAccount (lib/qore/account.ts).
 *
 *   deposit   one MsgSend of fUSD (bank form) to Darwin's relayer, signed in QoreX, which QoreX
 *             displays; the relayer puts the same amount, in ERC-20 form, on the user's account;
 *   trade     one message signed in QoreX (signArbitrary: secp256k1 + ML-DSA-87); the account
 *             checks the ML-DSA-87 half on chain with pqcVerify before calling the router;
 *   withdraw  one signed message: the account hands fUSD to the relayer, which returns it to the
 *             user's QoreX wallet in bank form.
 * No EVM window, no authz grant, and no gas for a trade.
 */
import type { Address } from "viem";
import { withBase } from "@/lib/base";
import { buyCalls, sellCalls, textFor, withdrawCalls, type Call } from "./account";
import { COSMOS_CHAIN_ID, D, TOKEN_INFO } from "./chain";
import { bankSend } from "./proto";
import { qorex, signAndBroadcast, withUnlock } from "./qorex";

export type AccountInfo = {
  account: Address;
  exists: boolean;
  nonce: bigint;
  fusd: bigint;
  shares: Record<string, bigint>;
  allowance: Record<string, bigint>;
  relayer: { cosmos: string; evm: Address };
};

/** The server did not answer (timeout, network): what happened is read from the chain instead. */
class NoAnswer extends Error {}

const api = async (path: string, body?: unknown) => {
  let r: Response;
  try {
    r = await fetch(withBase(`/api/relay/${path}`), body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  } catch (e) {
    throw new NoAnswer(String((e as Error)?.message ?? e));
  }
  const j = await r.json().catch(() => null);
  if (!j) throw new NoAnswer(`relayer ${r.status}`);
  if (!r.ok) throw new Error(j.error ?? `relayer ${r.status}`);
  return j;
};
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function readAccount(owner: string): Promise<AccountInfo> {
  const j = await api(`account?account=${owner}`);
  const big = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, BigInt(v)]));
  return { account: j.account, exists: j.exists, nonce: BigInt(j.nonce), fusd: BigInt(j.fusd), shares: big(j.shares), allowance: big(j.allowance), relayer: j.relayer };
}

/** Move `amount` fUSD from the QoreX wallet onto the DarwinAccount. One QoreX approval. */
export async function depositFusd(owner: string, relayer: string, amount: bigint): Promise<{ txHash: string; convert: string }> {
  const sent = await signAndBroadcast(
    [bankSend(owner, relayer, TOKEN_INFO.fUSD.denom!, amount)],
    `Darwin: deposit ${(Number(amount) / 1e6).toFixed(2)} fUSD to your Darwin account`,
    300_000,
  );
  // the claim is idempotent (one credit per transaction): ask again if the answer was lost
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await api("deposit", { owner, txHash: sent.txHash });
      return { txHash: sent.txHash, convert: r.txHash };
    } catch (e) {
      if (!(e instanceof NoAnswer) || attempt >= 3) throw e;
      await sleep(3000);
    }
  }
}

/** Sign `calls` in QoreX as plain text, then have Darwin's relayer submit them. */
export async function signAndExecute(owner: string, info: AccountInfo, calls: Call[], summary: string, onSigned?: () => void) {
  const n = qorex() as unknown as { signArbitrary?: (chainId: string, signer: string, data: string) => Promise<unknown> } | null;
  if (!n?.signArbitrary) throw new Error("This QoreX cannot sign messages (signArbitrary); update QoreX");
  const fresh = await readAccount(owner); // the nonce the account expects now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const text = textFor(info.account, calls, summary, fresh.nonce, deadline);
  const signature = await withUnlock(() => n.signArbitrary!(COSMOS_CHAIN_ID, owner, text));
  onSigned?.();
  try {
    return (await api("execute", { owner, calls, summary, deadline: String(deadline), signature })) as { txHash: string; account: string; kind: string; returned?: string };
  } catch (e) {
    if (!(e instanceof NoAnswer)) throw e;
    // the call may have been cut after the transaction went out: the account's nonce tells
    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      const now = await readAccount(owner).catch(() => null);
      if (now && now.nonce > fresh.nonce) {
        const t = await fetch(withBase(`/api/trades?account=${owner}`)).then((x) => x.json()).catch(() => []);
        const tx = (Array.isArray(t) ? t : []).find((x: { tx: string }) => /^0x/.test(x.tx))?.tx ?? "";
        return { txHash: tx, account: info.account, kind: "unknown" };
      }
      if (BigInt(Math.floor(Date.now() / 1000)) > deadline) break;
    }
    throw new Error("Darwin's relayer did not answer, and the message expired without being executed: nothing moved");
  }
}

const basketKey = (address: string) => Object.entries(D.baskets).find(([, b]: [string, any]) => b.address.toLowerCase() === address.toLowerCase())?.[0] ?? "";

export function tradeCalls(info: AccountInfo, side: "buy" | "sell", basket: Address, amount: bigint, min: bigint): Call[] {
  return side === "buy"
    ? buyCalls(info.account, basket, amount, min, info.allowance.fUSD ?? 0n)
    : sellCalls(info.account, basket, amount, min, info.allowance[basketKey(basket)] ?? 0n);
}

export const withdrawFusdCalls = (info: AccountInfo, amount: bigint) => withdrawCalls(info.relayer.evm, amount);
