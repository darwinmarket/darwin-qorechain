/**
 * Darwin's keeper calls on the native lane: price rounds and rebalances are MsgCrossVMCall the
 * deployer hybrid-signs (secp256k1 + ML-DSA-87). A cross-VM call leaves no EVM logs, so readers
 * decode the calldata from the committed transaction, and the round number from its memo
 * (`darwin round <n>`). The memo is a hint, never trusted alone: the reporter's ML-DSA-87 signature
 * verifies for that round number only (lib/qore/verify.ts).
 */
import { bytesToHex, decodeFunctionData, parseAbi, type Hex } from "viem";

export const submitAbi = parseAbi(["function submit(uint64 timestamp, uint16[] ids, uint128[] prices, bytes signature)"]);
export const rebalanceAbi = parseAbi([
  "function rebalance((address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut)[] trades, uint256 deadline, bytes signature)",
]);

const b64ToHex = (s: string) => bytesToHex(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

/** The calldata of a committed transaction's MsgCrossVMCall to `target`, if it executed. */
export function crossVmCalldata(t: any, target: string): Hex | null {
  if (!t || t.code !== 0) return null;
  const executed = (t.events ?? []).some((e: any) => e.type === "crossvm_response" && e.attributes.some((a: any) => a.key === "status" && a.value === "executed"));
  if (!executed) return null;
  for (const m of t.tx?.body?.messages ?? []) {
    if (m["@type"] === "/qorechain.crossvm.v1.MsgCrossVMCall" && String(m.target_contract).toLowerCase() === target.toLowerCase() && m.payload) return b64ToHex(m.payload);
  }
  return null;
}

export type NativeRound = { round: number; timestamp: number; ids: number[]; prices: bigint[]; signature: Hex; data: Hex; tx: string; height: number; gasUsed: number };

/** A price round sent on the native lane, from a tx_response (with its tx). */
export function nativeRound(t: any, oracle: string): NativeRound | null {
  const data = crossVmCalldata(t, oracle);
  const memo = /^darwin round (\d+)$/.exec(String(t?.tx?.body?.memo ?? ""));
  if (!data || !memo) return null;
  try {
    const call = decodeFunctionData({ abi: submitAbi, data });
    const [timestamp, ids, prices, signature] = call.args;
    return {
      round: Number(memo[1]),
      timestamp: Number(timestamp),
      ids: ids.map(Number),
      prices: [...prices],
      signature,
      data,
      tx: t.txhash,
      height: Number(t.height),
      gasUsed: Number(t.gas_used),
    };
  } catch {
    return null;
  }
}

/** Every page of a tx search (the chain's search caps a page at 100). */
export async function searchAll(rest: string, query: string, maxPages = 20): Promise<any[]> {
  const page = async (n: number) => {
    const qs = new URLSearchParams({ query, order_by: "ORDER_BY_DESC", "pagination.limit": "100", page: String(n) });
    const r = await fetch(`${rest}/cosmos/tx/v1beta1/txs?${qs}`, { headers: { accept: "application/json" }, cache: "no-store" }).catch(() => null);
    if (!r?.ok) return { txs: [] as any[], total: 0 };
    const j = (await r.json()) as { tx_responses?: any[]; total?: string; pagination?: { total?: string } };
    return { txs: j.tx_responses ?? [], total: Number(j.total ?? j.pagination?.total ?? 0) };
  };
  const first = await page(1);
  const pages = Math.min(maxPages, Math.ceil(first.total / 100));
  const rest_ = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => page(i + 2)));
  return [first, ...rest_].flatMap((p) => p.txs);
}
