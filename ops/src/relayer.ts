/**
 * Darwin's trade relayer, for QoreX users.
 *
 * QoreX shows and signs only the messages it can decode for its user: bank sends, authz grants,
 * CosmWasm calls. It refuses MsgCrossVMCall and the ERC-20 conversions Darwin trades with. So a
 * QoreX user trades in two steps, every one of them post-quantum:
 *
 *   setup (once, until it expires)
 *     - the user opens an EVM access window in QoreX (hybrid-signed MsgOpenEVMWindow): without it
 *       the chain refuses any EVM call made on the account's behalf;
 *     - the user signs, in QoreX, authz grants to this relayer for MsgCrossVMCall and
 *       MsgConvertCoin, with an expiry (shown decoded by QoreX);
 *   each trade
 *     - the user signs a trade intent with QoreX's signArbitrary: ADR-36 secp256k1 plus ML-DSA-87;
 *     - this relayer verifies it with QoreSign against the key the user registered on chain, checks
 *       its fields, expiry and nonce, then executes the trade as the user through MsgExec (the
 *       user's 0x twin is msg.sender: shares land in the user's account). The relayer pays the gas.
 *
 * The relayer can act only within the user's grants (types and expiry) and EVM window (count,
 * value, expiry), and only on an intent the user signed.
 *
 *   tsx src/relayer.ts        (listens on RELAYER_PORT, default 3034; the app proxies /api/relay)
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeFunctionData, maxUint256, type Address } from "viem";
import { qorechainRegistry } from "@qorechain/sdk";
import { fetchEvmWindow, verifyMessageWithChain } from "@qorechain/qoresign/network";
import type { MessageSignature } from "@qorechain/qoresign";
import { evmAccount } from "./accounts.js";
import { artifact, loadDeployments } from "./evm.js";
import { publicClient, REST } from "./net.js";
import { sendFromRole } from "./nativeClient.js";
import { crossVmCallMsg, evmTwin } from "./crossvm.js";
import { CONVERT_COIN_TYPE_URL, ERC20_REGISTRY_TYPES } from "./erc20Msgs.js";

const PORT = Number(process.env.RELAYER_PORT ?? 3034);
const CHAIN_ID = "qorechain-diana";
const CROSSVM = "/qorechain.crossvm.v1.MsgCrossVMCall";
const NONCES = join(dirname(fileURLToPath(import.meta.url)), "../.relayer-nonces.json");

const d = loadDeployments();
const rel = await evmAccount("relayer");
const registry = qorechainRegistry(ERC20_REGISTRY_TYPES);
const erc20 = artifact("WQOR").abi;
const routerAbi = artifact("DarwinRouter").abi;
const BASKETS = new Set(Object.values(d.baskets).map((b: any) => (b.address as string).toLowerCase()));
const FUSD_DENOM = `erc20:${d.tokens.fUSD}`;

export type Intent = {
  darwin: "trade-v1";
  chainId: string;
  account: string;
  action: "buy" | "sell";
  basket: Address;
  /** buy: fUSD in (6 decimals); sell: shares (18 decimals) */
  amount: string;
  /** buy: minimum shares; sell: minimum fUSD out */
  min: string;
  nonce: string;
  /** unix seconds */
  expires: number;
};

const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const read = <T>(address: Address, abi: any, functionName: string, args: unknown[] = []) =>
  publicClient.readContract({ address, abi, functionName, args }) as Promise<T>;

// ---- nonces: an intent executes once ----------------------------------------------------------
const nonces: Record<string, number> = existsSync(NONCES) ? JSON.parse(readFileSync(NONCES, "utf8")) : {};
function useNonce(key: string, expires: number) {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, e] of Object.entries(nonces)) if (e < now) delete nonces[k];
  if (nonces[key]) throw new Error("this intent was already executed");
  nonces[key] = expires;
  writeFileSync(NONCES, JSON.stringify(nonces));
}

// ---- what the user has set up -----------------------------------------------------------------
async function grants(account: string): Promise<Record<string, string | null>> {
  const r: any = await (await fetch(`${REST}/cosmos/authz/v1beta1/grants?granter=${account}&grantee=${rel.cosmos}`)).json();
  const out: Record<string, string | null> = { [CROSSVM]: null, [CONVERT_COIN_TYPE_URL]: null };
  for (const g of r.grants ?? []) {
    const msg = g.authorization?.msg;
    if (msg in out && (!g.expiration || Date.parse(g.expiration) > Date.now())) out[msg] = g.expiration ?? "never";
  }
  return out;
}

export async function status(account: string) {
  const [g, w] = await Promise.all([grants(account), fetchEvmWindow({ rest: REST, address: account }).catch(() => null)]);
  return {
    relayer: rel.cosmos,
    grants: { crossvm: g[CROSSVM], convert: g[CONVERT_COIN_TYPE_URL] },
    window: w ? { live: w.live, remainingTxs: String(w.remainingTxs), remainingBlocks: String(w.remainingBlocks) } : { live: false },
  };
}

// ---- one trade --------------------------------------------------------------------------------
function parseIntent(text: string): Intent {
  const i = JSON.parse(text) as Intent;
  const now = Math.floor(Date.now() / 1000);
  if (i.darwin !== "trade-v1" || i.chainId !== CHAIN_ID) throw new Error("not a Darwin trade intent for qorechain-diana");
  if (!/^qor1[02-9ac-hj-np-z]{38}$/.test(i.account)) throw new Error("bad account");
  if (i.action !== "buy" && i.action !== "sell") throw new Error("bad action");
  if (!BASKETS.has(String(i.basket).toLowerCase())) throw new Error("unknown basket");
  if (!(BigInt(i.amount) > 0n) || BigInt(i.min) < 0n) throw new Error("bad amounts");
  if (typeof i.nonce !== "string" || i.nonce.length < 8 || i.nonce.length > 64) throw new Error("bad nonce");
  if (!(i.expires > now) || i.expires > now + 600) throw new Error("the intent expired, or expires more than 10 minutes ahead");
  return i;
}

export async function trade(intentText: string, signature: MessageSignature) {
  const i = parseIntent(intentText);
  // the user's own hybrid signature over these exact bytes, against the ML-DSA-87 key on chain
  await verifyMessageWithChain({ rest: REST, chainId: CHAIN_ID, signer: i.account, data: intentText, signature, requirePq: true });
  const st = await status(i.account);
  if (!st.window.live) throw new Error("open an EVM access window in QoreX first");
  if (!st.grants.crossvm) throw new Error("authorize Darwin's relayer in the app first");

  const twin = evmTwin(i.account) as Address;
  const basket = i.basket as Address;
  const amount = BigInt(i.amount);
  const min = BigInt(i.min);
  const inner: { typeUrl: string; value: any }[] = [];

  if (i.action === "buy") {
    const erc = await read<bigint>(d.tokens.fUSD, erc20, "balanceOf", [twin]);
    if (erc < amount) {
      if (!st.grants.convert) throw new Error("authorize Darwin's relayer to move your faucet fUSD to its ERC-20 form");
      inner.push({ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: FUSD_DENOM, amount: (amount - erc).toString() }, receiver: twin, sender: i.account } });
    }
    if ((await read<bigint>(d.tokens.fUSD, erc20, "allowance", [twin, d.router])) < amount) {
      inner.push(crossVmCallMsg(i.account, d.tokens.fUSD, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
    }
    inner.push(crossVmCallMsg(i.account, d.router, encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, amount, min, twin] })));
  } else {
    if ((await read<bigint>(basket, erc20, "allowance", [twin, d.router])) < amount) {
      inner.push(crossVmCallMsg(i.account, basket, encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, maxUint256] })));
    }
    inner.push(crossVmCallMsg(i.account, d.router, encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, amount, min, twin] })));
  }

  useNonce(`${i.account}:${i.nonce}`, i.expires);
  const digest = createHash("sha256").update(intentText).digest("hex").slice(0, 16);
  const gas = 2_400_000 + 500_000 * (inner.length - 1);
  const txHash = await sendFromRole(
    "relayer",
    [{ typeUrl: "/cosmos.authz.v1beta1.MsgExec", value: { grantee: rel.cosmos, msgs: inner.map((m) => ({ typeUrl: m.typeUrl, value: registry.encode(m) })) } }],
    "hybrid",
    String(gas),
  );
  log(`${i.action} ${i.amount} ${basket} for ${i.account}: ${txHash} (intent ${digest})`);
  return { txHash, intent: digest, messages: inner.map((m) => m.typeUrl.split(".").pop()) };
}

// ---- HTTP ---------------------------------------------------------------------------------------
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>) => (queue = queue.then(fn, fn)) as Promise<T>;

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let s = "";
    req.on("data", (c) => {
      s += c;
      if (s.length > 64_000) reject(new Error("too large"));
    });
    req.on("end", () => resolve(s));
  });
}
const send = (res: ServerResponse, code: number, obj: unknown) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://relayer");
      if (req.method === "GET" && url.pathname === "/relay/status") {
        const account = url.searchParams.get("account") ?? "";
        if (!/^qor1[02-9ac-hj-np-z]{38}$/.test(account)) return send(res, 400, { error: "account" });
        return send(res, 200, await status(account));
      }
      if (req.method === "POST" && url.pathname === "/relay/trade") {
        const { intent, signature } = JSON.parse(await body(req));
        return send(res, 200, await serial(() => trade(String(intent), signature)));
      }
      send(res, 404, { error: "not found" });
    } catch (e: any) {
      log("refused:", String(e?.message ?? e).slice(0, 300));
      send(res, 400, { error: String(e?.message ?? e).slice(0, 400) });
    }
  }).listen(PORT, () => log(`relayer ${rel.cosmos} listening on :${PORT}`));
}
