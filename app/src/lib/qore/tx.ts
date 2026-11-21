"use client";

/**
 * One transaction as Darwin sees it: the native (Cosmos) record, the EVM receipt when there is one,
 * the post-quantum evidence the chain recorded, and the Darwin action decoded from the calldata or
 * the logs. The public explorer opens on mainnet by default, so the app shows testnet txs itself.
 */
import { useQuery } from "@tanstack/react-query";
import { bytesToHex, decodeEventLog, decodeFunctionData, parseAbiItem, type Hex } from "viem";
import { basketAbi, oracleAbi, routerAbi } from "./abis";
import { client, D, REST } from "./chain";
import { accountRouterAbi, executionOf, FACTORY, factoryAbi } from "./account";
import { crossVmCalldata, nativeRound, rebalanceAbi } from "./nativeCalls";

export type DarwinAction =
  | { kind: "round"; round: number; prices: Record<string, number> }
  | { kind: "buy"; basket: string; usdIn: number; shares?: number }
  | { kind: "sell"; basket: string; shares: number; usdOut?: number }
  | { kind: "rebalance"; basket: string; trades: number; navBefore?: number; navAfter?: number }
  | { kind: "other"; label: string };

export type TxView = {
  cosmosHash: string;
  evmHash?: string;
  height: number;
  time: string;
  ok: boolean;
  gasUsed: number;
  signer?: string;
  messages: string[];
  /** secp256k1 + ML-DSA-87 on the native lane, as checked by the chain's ante handler. */
  hybridVerified: boolean;
  /** An EVM tx admitted by its sender's post-quantum EVM window. */
  evmWindow?: { address: string; usedTxs: string };
  /** Set when Darwin's relayer executed this trade for a QoreX user (authz MsgExec). */
  relayedFor?: string;
  /** Set when this is a DarwinAccount execution: the owner's ML-DSA-87 signed message, checked on chain. */
  viaAccount?: { owner: string; account: string; nonce?: number; summary: string; data: Hex; native: boolean };
  /** A price round sent on the native lane: its calldata and round number, for the browser check. */
  roundCall?: { data: Hex; round: number };
  actions: DarwinAction[];
  log?: string;
};

const FEED = ["", "USD", "ETH", "BTC", "QOR", "QWAKK"];
const ALL_BASKETS: [string, { address: string; display: string }][] = [
  ...Object.entries(D.baskets),
  ...(((D as any).basketHistory ?? []) as any[]).map((b) => [b.key, b] as [string, any]),
];
const ROUTERS = [D.router, ...((D as any).routerHistory ?? []).map((r: any) => r.address)].map((a: string) => a.toLowerCase());
const basketName = (a: string) => ALL_BASKETS.find(([, b]) => b.address.toLowerCase() === a.toLowerCase())?.[1].display ?? a.slice(0, 10);
const b64 = (s: string) => bytesToHex(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
const attr = (e: any, k: string) => e.attributes.find((a: any) => a.key === k)?.value;

const EVENTS = [
  parseAbiItem("event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)"),
  parseAbiItem("event PriceUpdated(uint16 indexed feedId, uint256 price, uint64 indexed round)"),
  parseAbiItem("event Bought(address indexed trader, address indexed basket, uint256 usdIn, uint256 fee, uint256 shares, address to)"),
  parseAbiItem("event Sold(address indexed trader, address indexed basket, uint256 shares, uint256 usdOut, uint256 fee, address to)"),
  parseAbiItem("event Rebalanced(uint256 indexed nonce, uint256 trades, uint256 navBefore, uint256 navAfter, address relayer)"),
  parseAbiItem("event Executed(uint256 indexed nonce, bytes32 indexed callsHash, address indexed submitter, uint256 calls)"),
];

async function cosmosTx(hash: string) {
  const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs/${hash}`);
  if (!r.ok) throw new Error("Transaction not found on qorechain-diana");
  return r.json();
}

async function readTx(input: string): Promise<TxView> {
  let cosmosHash = input.toUpperCase();
  if (/^0x[0-9a-fA-F]{64}$/.test(input)) {
    const q = encodeURIComponent(`ethereum_tx.ethereumTxHash='${input.toLowerCase()}'`);
    const r = (await (await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${q}`)).json()) as any;
    const found = r.tx_responses?.[0]?.txhash;
    if (!found) throw new Error("Transaction not found on qorechain-diana");
    cosmosHash = found;
  }
  const { tx, tx_response: t } = await cosmosTx(cosmosHash);
  const events: any[] = t.events ?? [];
  const evmHash = events.map((e) => (e.type === "ethereum_tx" ? attr(e, "ethereumTxHash") : undefined)).find(Boolean) as string | undefined;
  const win = events.find((e) => e.type === "pqc_evm_window_used");
  const actions: DarwinAction[] = [];
  let viaAccount: TxView["viaAccount"];

  // Native cross-VM calls: decode the router calldata, including the calls Darwin's relayer
  // executed for a QoreX user inside an authz MsgExec.
  const relayedFor = (tx.body.messages as any[]).find((m) => m["@type"].endsWith("MsgExec"))?.msgs?.[0]?.sender as string | undefined;
  for (const m of (tx.body.messages as any[]).flatMap((x) => (x["@type"].endsWith("MsgExec") ? (x.msgs ?? []) : [x]))) {
    if (m["@type"].endsWith("MsgCrossVMCall") && m.payload && ROUTERS.includes(m.target_contract?.toLowerCase())) {
      try {
        const call = decodeFunctionData({ abi: routerAbi, data: b64(m.payload) });
        if (call.functionName === "buy") actions.push({ kind: "buy", basket: basketName(call.args[0] as string), usdIn: Number(call.args[1]) / 1e6 });
        if (call.functionName === "sell") actions.push({ kind: "sell", basket: basketName(call.args[0] as string), shares: Number(call.args[1]) / 1e18 });
      } catch {
        /* not a router call */
      }
    }
  }

  // EVM transactions: decode Darwin's own events from the receipt.
  if (evmHash) {
    const receipt = await client.getTransactionReceipt({ hash: evmHash as Hex }).catch(() => null);
    const prices: Record<string, number> = {};
    let round: number | null = null;
    let executed: { account: string; nonce: number } | null = null;
    for (const log of receipt?.logs ?? []) {
      try {
        const ev = decodeEventLog({ abi: EVENTS, data: log.data, topics: log.topics as any });
        const a = ev.args as any;
        if (ev.eventName === "RoundSubmitted") round = Number(a.round);
        if (ev.eventName === "Executed") executed = { account: log.address, nonce: Number(a.nonce) };
        if (ev.eventName === "PriceUpdated") prices[FEED[Number(a.feedId)]] = Number(a.price) / 1e18;
        if (ev.eventName === "Bought") actions.push({ kind: "buy", basket: basketName(a.basket), usdIn: Number(a.usdIn) / 1e6, shares: Number(a.shares) / 1e18 });
        if (ev.eventName === "Sold") actions.push({ kind: "sell", basket: basketName(a.basket), shares: Number(a.shares) / 1e18, usdOut: Number(a.usdOut) / 1e6 });
        if (ev.eventName === "Rebalanced")
          actions.push({ kind: "rebalance", basket: basketName(log.address), trades: Number(a.trades), navBefore: Number(a.navBefore) / 1e18, navAfter: Number(a.navAfter) / 1e18 });
      } catch {
        /* a token Transfer or Approval */
      }
    }
    if (round != null) actions.unshift({ kind: "round", round, prices });
    const exec = executionOf(tx);
    if (executed && exec) {
      const { addressFromBytes } = await import("@qorechain/qoresign");
      const { hexToBytes } = await import("viem");
      viaAccount = { owner: addressFromBytes(hexToBytes(exec.owner)).bech32, account: (executed as any).account, nonce: (executed as any).nonce, summary: exec.summary, data: exec.data, native: false };
    }
  }

  // A DarwinAccount execution on the native lane: the relayer's hybrid-signed MsgCrossVMCall. No EVM
  // logs here: the account is the factory's, the trades are read from the calls the owner signed.
  const native = !viaAccount ? executionOf(tx) : null;
  if (native?.native) {
    const { addressFromBytes } = await import("@qorechain/qoresign");
    const { hexToBytes } = await import("viem");
    const account = (await client.readContract({ address: FACTORY, abi: factoryAbi, functionName: "accountOf", args: [native.owner] })) as string;
    viaAccount = { owner: addressFromBytes(hexToBytes(native.owner)).bech32, account, summary: native.summary, data: native.data, native: true };
    for (const c of native.calls) {
      if (!ROUTERS.includes(c.target.toLowerCase())) continue;
      try {
        const call = decodeFunctionData({ abi: accountRouterAbi, data: c.data });
        if (call.functionName === "buy") actions.push({ kind: "buy", basket: basketName(call.args[0] as string), usdIn: Number(call.args[1]) / 1e6 });
        if (call.functionName === "sell") actions.push({ kind: "sell", basket: basketName(call.args[0] as string), shares: Number(call.args[1]) / 1e18 });
      } catch {
        /* an approval */
      }
    }
    if (!actions.length && native.calls.length === 1) actions.push({ kind: "other", label: "Withdrawal of fUSD to the owner's QoreX wallet" });
  }
  // the keeper's calls on the native lane: a price round, or a curator-signed rebalance
  let roundCall: TxView["roundCall"];
  const committed = { ...t, tx };
  const round = nativeRound(committed, D.oracle);
  if (round) {
    const prices: Record<string, number> = {};
    round.ids.forEach((id, i) => (prices[FEED[id]] = Number(round.prices[i]) / 1e18));
    actions.unshift({ kind: "round", round: round.round, prices });
    roundCall = { data: round.data, round: round.round };
  }
  for (const [, b] of ALL_BASKETS) {
    const data = crossVmCalldata(committed, b.address);
    if (!data) continue;
    try {
      const call = decodeFunctionData({ abi: rebalanceAbi, data });
      actions.push({ kind: "rebalance", basket: basketName(b.address), trades: call.args[0].length });
    } catch {
      /* another call */
    }
  }
  if (!actions.length) actions.push({ kind: "other", label: tx.body.messages.map((m: any) => m["@type"].split(".").at(-1)).join(", ") });

  return {
    cosmosHash,
    evmHash,
    height: Number(t.height),
    time: t.timestamp,
    ok: t.code === 0,
    gasUsed: Number(t.gas_used),
    signer: events.find((e) => e.type === "message")?.attributes.find((a: any) => a.key === "sender")?.value,
    messages: tx.body.messages.map((m: any) => m["@type"].split(".").at(-1)),
    hybridVerified: events.some((e) => e.type === "pqc_hybrid_verify" && attr(e, "status") === "verified"),
    evmWindow: win ? { address: attr(win, "address"), usedTxs: attr(win, "used_txs") } : undefined,
    relayedFor,
    viaAccount,
    roundCall,
    actions,
    log: t.code === 0 ? undefined : t.raw_log,
  };
}

export function useTx(hash: string) {
  return useQuery({ queryKey: ["tx", hash], queryFn: () => readTx(hash), retry: 1, staleTime: Infinity });
}

export const _abis = { basketAbi, oracleAbi };
