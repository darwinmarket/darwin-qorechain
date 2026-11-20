/**
 * Reference prices for the oracle rounds, USD with 18 decimals.
 *
 *  - BTC, ETH: median of public spot APIs (Coinbase, Kraken, CoinGecko, Binance). fBTC and fETH are
 *    the Fest's test stand-ins for BTC and ETH, so they are priced like the real coins.
 *  - USD: 1 (fUSD is the Fest's test dollar).
 *  - QOR: the real market price of QoreChain's token, median of CoinGecko and MEXC (QOR/USDT).
 *    (Until 2026-11-20 it came from the testnet AMM pools, which disagree with each other and sat
 *    about 10x above the market.)
 *  - QWAKK: its only market is the QWAKK/QOR pool of QoreChain's native AMM; its price in QOR
 *    there, times the QOR price above.
 */
import { REST } from "./net.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { median, toWad, windowMedian, type Sample } from "./lib/median.js";

export { toWad };

export const FEED = { USD: 1, ETH: 2, BTC: 3, QOR: 4, QWAKK: 5 } as const;
export type FeedName = keyof typeof FEED;

const QWAKK = "erc20:0xa5b3c3Fb92E2E89555F9909b9004C65F3542eE23";

async function json(url: string, ms = 6000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "darwin-keeper/1.0" } });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}


const SOURCES: Record<"BTC" | "ETH" | "QOR", (() => Promise<number>)[]> = {
  QOR: [
    async () => Number((await json("https://api.coingecko.com/api/v3/simple/price?ids=qorechain&vs_currencies=usd")).qorechain.usd),
    async () => Number((await json("https://api.mexc.com/api/v3/ticker/price?symbol=QORUSDT")).price),
  ],
  BTC: [
    async () => Number((await json("https://api.coinbase.com/v2/prices/BTC-USD/spot")).data.amount),
    async () => Number((await json("https://api.kraken.com/0/public/Ticker?pair=XBTUSD")).result.XXBTZUSD.c[0]),
    async () => Number((await json("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")).bitcoin.usd),
    async () => Number((await json("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")).price),
  ],
  ETH: [
    async () => Number((await json("https://api.coinbase.com/v2/prices/ETH-USD/spot")).data.amount),
    async () => Number((await json("https://api.kraken.com/0/public/Ticker?pair=ETHUSD")).result.XETHZUSD.c[0]),
    async () => Number((await json("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")).ethereum.usd),
    async () => Number((await json("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT")).price),
  ],
};

async function spot(asset: "BTC" | "ETH" | "QOR", minSources = 2): Promise<{ price: number; sources: number }> {
  const got = await Promise.allSettled(SOURCES[asset].map((f) => f()));
  const ok = got.flatMap((g) => (g.status === "fulfilled" && g.value > 0 ? [g.value] : []));
  if (ok.length < minSources) throw new Error(`${asset}: only ${ok.length} price source(s) answered`);
  return { price: median(ok), sources: ok.length };
}

interface Pool { id: string; token_a: string; token_b: string; reserve_a: string; reserve_b: string; status: string }

/**
 * QWAKK's QOR price is sampled on every call and kept in `.qwakk-samples.json`; the oracle uses
 * the median of the last 30 minutes, not the pool's spot, so a short pump of a thin pool cannot set
 * the price the reserve trades at.
 */
const SAMPLES = join(dirname(fileURLToPath(import.meta.url)), "../.qwakk-samples.json");
const QWAKK_WINDOW = 1_800;

function sampled(qorPerQwakk: number): { value: number; n: number } {
  const now = Math.floor(Date.now() / 1000);
  const old: Sample[] = existsSync(SAMPLES) ? JSON.parse(readFileSync(SAMPLES, "utf8")) : [];
  const r = windowMedian([...old, { t: now, v: qorPerQwakk }], now, QWAKK_WINDOW);
  writeFileSync(SAMPLES, JSON.stringify(r.kept));
  return { value: r.value, n: r.n };
}

/** QWAKK (6 decimals) in USD: its QOR price in the QWAKK/QOR pools (30-minute median) times the QOR price. */
async function qwakk(qorUsd: number): Promise<{ price: number; sources: number; samples: number }> {
  const { pools } = (await json(`${REST}/qorechain/amm/v1/pools`)) as { pools: Pool[] };
  const quotes: number[] = [];
  for (const p of pools) {
    if (p.status !== "active") continue;
    const [q, u] = p.token_a === QWAKK && p.token_b === "uqor" ? [Number(p.reserve_a), Number(p.reserve_b)]
      : p.token_b === QWAKK && p.token_a === "uqor" ? [Number(p.reserve_b), Number(p.reserve_a)] : [0, 0];
    if (q > 1e9 && u > 1e9) quotes.push(u / q); // QOR per QWAKK, both sides 6 decimals
  }
  const s = sampled(median(quotes));
  return { price: s.value * qorUsd, sources: quotes.length, samples: s.n };
}

export interface PriceSet { USD: number; ETH: number; BTC: number; QOR: number; QWAKK: number; detail: Record<string, number> }

export async function fetchPrices(): Promise<PriceSet> {
  const [btc, eth] = await Promise.all([spot("BTC"), spot("ETH")]);
  // both QOR sources must answer: one alone could be stale or wrong, and a missing round is safe
  // (readers refuse stale prices, so buys pause; selling to the router waits, redeeming never does)
  const q = await spot("QOR", 2);
  const w = await qwakk(q.price);
  return {
    USD: 1,
    ETH: eth.price,
    BTC: btc.price,
    QOR: q.price,
    QWAKK: w.price,
    detail: { btcSources: btc.sources, ethSources: eth.sources, qorSources: q.sources, qwakkPools: w.sources, qwakkSamples: w.samples },
  };
}


if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await fetchPrices());
}
