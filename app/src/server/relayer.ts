/**
 * Server-only: Darwin's trade relayer for QoreX users (the deployed form of ops/src/relayer.ts).
 *
 * QoreX signs only the messages it can show its user, and refuses MsgCrossVMCall and the ERC-20
 * conversions. A user therefore opens an EVM access window in QoreX, grants this relayer those two
 * message types for 24 hours (MsgGrant, signed in QoreX), then signs each trade as an intent with
 * signArbitrary (secp256k1 + ML-DSA-87). Here the intent is verified with QoreSign against the
 * user's on-chain key, checked (fields, expiry, single use), and executed as the user through
 * authz MsgExec, which the chain admits only through the user's own EVM window. The relayer pays
 * the gas. Before executing, a fresh signed price round is published if the last one is stale.
 *
 * Single use survives serverless restarts: every execution carries `darwin intent <digest>` in its
 * memo, and the relayer reads its own recent transactions before executing.
 */
import { createHash } from "node:crypto";
import { fetchEvmWindow, verifyMessageWithChain } from "@qorechain/qoresign/network";
import type { MessageSignature } from "@qorechain/qoresign";
import { encodeFunctionData, maxUint256, parseAbi, type Address, type Hex } from "viem";
import { convertCoin, crossVmCall } from "@/lib/qore/proto";
import { account } from "./keys";
import { CHAIN_ID, client, D, json, REST, sendNative } from "./chain";
import { freshRound } from "./keeper";

const CROSSVM = "/qorechain.crossvm.v1.MsgCrossVMCall";
const CONVERT = "/cosmos.evm.erc20.v1.MsgConvertCoin";
const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
]);
const routerAbi = parseAbi([
  "function buy(address basket, uint256 usdIn, uint256 minShares, address to) returns (uint256)",
  "function sell(address basket, uint256 shares, uint256 minUsdOut, address to) returns (uint256)",
]);
const BASKETS = new Set(Object.values(D.baskets).map((b: any) => String(b.address).toLowerCase()));
const ADDR = /^qor1[02-9ac-hj-np-z]{38}$/;

export type Intent = {
  darwin: "trade-v1";
  chainId: string;
  account: string;
  action: "buy" | "sell";
  basket: Address;
  amount: string;
  min: string;
  nonce: string;
  expires: number;
};

/** The 0x twin of a qor1 account (same 20 bytes). */
async function twinOf(qor1: string): Promise<Address> {
  const { parseAddress } = await import("@qorechain/qoresign");
  return parseAddress(qor1).hex as Address;
}

export async function status(accountAddr: string) {
  if (!ADDR.test(accountAddr)) throw new Error("bad account");
  const rel = await account("relayer");
  const [g, w] = await Promise.all([
    json(`${REST}/cosmos/authz/v1beta1/grants?granter=${accountAddr}&grantee=${rel.cosmos}`).catch(() => ({ grants: [] })),
    fetchEvmWindow({ rest: REST, address: accountAddr }).catch(() => null),
  ]);
  const until = (type: string) => {
    const x = (g.grants ?? []).find((y: any) => y.authorization?.msg === type && (!y.expiration || Date.parse(y.expiration) > Date.now()));
    return x ? (x.expiration ?? "never") : null;
  };
  return {
    relayer: rel.cosmos,
    grants: { crossvm: until(CROSSVM), convert: until(CONVERT) },
    window: w ? { live: w.live, remainingTxs: String(w.remainingTxs), remainingBlocks: String(w.remainingBlocks) } : { live: false },
  };
}

function parseIntent(text: string): Intent {
  const i = JSON.parse(text) as Intent;
  const now = Math.floor(Date.now() / 1000);
  if (i.darwin !== "trade-v1" || i.chainId !== CHAIN_ID) throw new Error("not a Darwin trade intent for qorechain-diana");
  if (!ADDR.test(i.account)) throw new Error("bad account");
  if (i.action !== "buy" && i.action !== "sell") throw new Error("bad action");
  if (!BASKETS.has(String(i.basket).toLowerCase())) throw new Error("unknown basket");
  if (!(BigInt(i.amount) > 0n) || BigInt(i.min) < 0n) throw new Error("bad amounts");
  if (typeof i.nonce !== "string" || i.nonce.length < 8 || i.nonce.length > 64) throw new Error("bad nonce");
  if (!(i.expires > now) || i.expires > now + 600) throw new Error("the intent expired, or expires more than 10 minutes ahead");
  return i;
}

const executed = new Set<string>();
async function alreadyExecuted(digest: string): Promise<boolean> {
  if (executed.has(digest)) return true;
  const rel = await account("relayer");
  const q = encodeURIComponent(`message.sender='${rel.cosmos}'`);
  const r = await json(`${REST}/cosmos/tx/v1beta1/txs?query=${q}&order_by=ORDER_BY_DESC&pagination.limit=50`).catch(() => ({ tx_responses: [] }));
  return (r.tx_responses ?? []).some((t: any) => String(t.tx?.body?.memo ?? "").includes(digest));
}

let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>) => (queue = queue.then(fn, fn)) as Promise<T>;

export async function trade(intentText: string, signature: MessageSignature) {
  const i = parseIntent(intentText);
  await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: i.account, data: intentText, signature, requirePq: true });
  const digest = createHash("sha256").update(intentText).digest("hex").slice(0, 32);
  return serial(async () => {
    if (await alreadyExecuted(digest)) throw new Error("this intent was already executed");
    const st = await status(i.account);
    if (!st.window.live) throw new Error("open an EVM access window in QoreX first");
    if (!st.grants.crossvm) throw new Error("authorize Darwin's relayer in the app first");
    await freshRound();

    const twin = await twinOf(i.account);
    const amount = BigInt(i.amount);
    const min = BigInt(i.min);
    const inner = [] as { typeUrl: string; value: Uint8Array }[];
    if (i.action === "buy") {
      const erc = await client.readContract({ address: D.tokens.fUSD, abi: erc20, functionName: "balanceOf", args: [twin] });
      if (erc < amount) {
        if (!st.grants.convert) throw new Error("authorize Darwin's relayer to move your faucet fUSD to its ERC-20 form");
        inner.push(convertCoin(i.account, twin as Hex, `erc20:${D.tokens.fUSD}`, amount - erc));
      }
      if ((await client.readContract({ address: D.tokens.fUSD, abi: erc20, functionName: "allowance", args: [twin, D.router] })) < amount)
        inner.push(crossVmCall(i.account, D.tokens.fUSD, encodeFunctionData({ abi: erc20, functionName: "approve", args: [D.router, maxUint256] })));
      inner.push(crossVmCall(i.account, D.router, encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [i.basket, amount, min, twin] })));
    } else {
      if ((await client.readContract({ address: i.basket, abi: erc20, functionName: "allowance", args: [twin, D.router] })) < amount)
        inner.push(crossVmCall(i.account, i.basket, encodeFunctionData({ abi: erc20, functionName: "approve", args: [D.router, maxUint256] })));
      inner.push(crossVmCall(i.account, D.router, encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [i.basket, amount, min, twin] })));
    }

    const rel = await account("relayer");
    const txHash = await sendNative(
      "relayer",
      [{ typeUrl: "/cosmos.authz.v1beta1.MsgExec", value: { grantee: rel.cosmos, msgs: inner } }],
      2_400_000 + 500_000 * (inner.length - 1),
      `darwin intent ${digest}`,
    );
    executed.add(digest);
    return { txHash, intent: digest.slice(0, 16), messages: inner.map((m) => m.typeUrl.split(".").pop()) };
  });
}
