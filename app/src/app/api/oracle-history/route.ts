import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import deployments from "@/config/deployments.json";
import { nativeRound, searchAll } from "@/lib/qore/nativeCalls";

const REST = process.env.QORE_REST_UPSTREAM ?? "https://api-testnet.qore.host";

/**
 * GET /api/oracle-history
 * Every price the Darwin oracle has stored since it went live, bucketed hourly (last value of the
 * hour), read from the chain's PriceUpdated events. This is the price history of QOR and QWAKK, which
 * no public market data has; every point came from an ML-DSA-87 signed round.
 * Same shape as /api/history: { timestamps, closes: { SYMBOL: number[] } }.
 */
const RPC = process.env.QORE_EVM_UPSTREAM ?? "https://evm-testnet.qore.host";
const ORACLE = deployments.oracle as `0x${string}`;
/**
 * Round 60, the first at QOR's market price (CoinGecko and MEXC). Earlier rounds priced QOR, and so
 * QWAKK, from the testnet AMM pools at about 10x the market: replaying them would draw a crash that
 * never happened, so the history starts here.
 */
const FROM_BLOCK = 10428835n;
const SPAN = 9_000n; // the public RPC answers at most 10,000 blocks per query
const FEEDS: Record<number, string> = { 1: "USD", 2: "ETH", 3: "BTC", 4: "QOR", 5: "QWAKK" };
const PRICE = parseAbiItem("event PriceUpdated(uint16 indexed feedId, uint256 price, uint64 indexed round)");
const ROUND = parseAbiItem("event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)");

const client = createPublicClient({ transport: http(RPC, { retryCount: 3, retryDelay: 1500 }) });

let cache: { at: number; body: unknown } | null = null;

async function build() {
  const head = await client.getBlockNumber();
  const ranges: [bigint, bigint][] = [];
  for (let from = FROM_BLOCK; from <= head; from += SPAN) ranges.push([from, from + SPAN - 1n > head ? head : from + SPAN - 1n]);
  const roundTime = new Map<bigint, number>();
  const prices: { round: bigint; feed: number; price: number }[] = [];
  for (const [fromBlock, toBlock] of ranges) {
    const [r, p] = await Promise.all([
      client.getLogs({ address: ORACLE, event: ROUND, fromBlock, toBlock }),
      client.getLogs({ address: ORACLE, event: PRICE, fromBlock, toBlock }),
    ]);
    for (const l of r) roundTime.set(l.args.round!, Number(l.args.timestamp));
    for (const l of p) prices.push({ round: l.args.round!, feed: Number(l.args.feedId), price: Number(l.args.price) / 1e18 });
  }
  // rounds on the native lane (hybrid-signed MsgCrossVMCall) leave no logs: read their calldata
  for (const t of await searchAll(REST, `crossvm_request.target_contract='${ORACLE.toLowerCase()}'`)) {
    const n = nativeRound(t, ORACLE);
    if (!n || roundTime.has(BigInt(n.round))) continue;
    roundTime.set(BigInt(n.round), n.timestamp);
    n.ids.forEach((id, i) => prices.push({ round: BigInt(n.round), feed: id, price: Number(n.prices[i]) / 1e18 }));
  }
  // hourly buckets, last value wins; carry every feed forward so all series align
  const byHour = new Map<number, Record<string, number>>();
  for (const x of prices.sort((a, b) => Number(a.round - b.round))) {
    const ts = roundTime.get(x.round);
    const sym = FEEDS[x.feed];
    if (!ts || !sym) continue;
    const hour = Math.floor(ts / 3600) * 3600;
    byHour.set(hour, { ...(byHour.get(hour) ?? {}), [sym]: x.price });
  }
  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const last: Record<string, number> = {};
  const rows = hours.map((h) => Object.assign(last, byHour.get(h)) && { ...last });
  // A feed added later (QWAKK, from round 17) is held at its first price before it existed: no
  // basket held it then, so this only keeps the other feeds' history whole.
  const symbols = Object.values(FEEDS);
  const missing = symbols.filter((s) => !rows.some((r) => r[s] != null));
  for (const s of symbols) {
    const first = rows.find((r) => r[s] != null)?.[s];
    if (first == null) continue;
    for (const r of rows) {
      if (r[s] != null) break;
      r[s] = first;
    }
  }
  return {
    source: "darwin-oracle",
    timestamps: hours,
    closes: Object.fromEntries(symbols.filter((s) => !missing.includes(s)).map((s) => [s, rows.map((r) => r[s])])),
    missing,
  };
}

export async function GET() {
  if (!cache || Date.now() - cache.at > 10 * 60_000) {
    cache = { at: Date.now(), body: await build() };
  }
  return NextResponse.json(cache.body, { headers: { "Cache-Control": "public, max-age=120, s-maxage=600" } });
}
