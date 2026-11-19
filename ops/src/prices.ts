/**
 * Reference prices for the oracle rounds, USD with 18 decimals.
 *
 *  - BTC, ETH: median of public spot APIs (Coinbase, Kraken, CoinGecko, Binance). fBTC and fETH are
 *    the Fest's test stand-ins for BTC and ETH, so they are priced like the real coins.
 *  - USD: 1 (fUSD is the Fest's test dollar).
 *  - QOR: from QoreChain's own native AMM. The fUSD/QOR pool gives a direct price; the fBTC/QOR
 *    pool gives a second one through the BTC price. The median of the usable ones is taken.
 */
import { REST } from "./net.js";
import { median, toWad } from "./lib/median.js";

export { toWad };

export const FEED = { USD: 1, ETH: 2, BTC: 3, QOR: 4, QWAKK: 5 } as const;
export type FeedName = keyof typeof FEED;

const FUSD = "erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA";
const FBTC = "erc20:0x4604e7E45b2ecdbfbDc157103f5B2b62cb16451A";
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


const SOURCES: Record<"BTC" | "ETH", (() => Promise<number>)[]> = {
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

async function spot(asset: "BTC" | "ETH"): Promise<{ price: number; sources: number }> {
  const got = await Promise.allSettled(SOURCES[asset].map((f) => f()));
  const ok = got.flatMap((g) => (g.status === "fulfilled" && g.value > 0 ? [g.value] : []));
  if (ok.length < 2) throw new Error(`${asset}: only ${ok.length} price source(s) answered`);
  return { price: median(ok), sources: ok.length };
}

interface Pool { id: string; token_a: string; token_b: string; reserve_a: string; reserve_b: string; status: string }

/** QOR in USD from the native AMM pools that pair QOR with fUSD or fBTC. */
async function qor(btcUsd: number): Promise<{ price: number; sources: number }> {
  const { pools } = (await json(`${REST}/qorechain/amm/v1/pools`)) as { pools: Pool[] };
  const quotes: number[] = [];
  for (const p of pools) {
    if (p.status !== "active") continue;
    const pair = (other: string) =>
      p.token_a === other && p.token_b === "uqor" ? [Number(p.reserve_a), Number(p.reserve_b)]
      : p.token_b === other && p.token_a === "uqor" ? [Number(p.reserve_b), Number(p.reserve_a)]
      : null;
    const usd = pair(FUSD); // fUSD 6 decimals, uqor 6 decimals
    if (usd && usd[0] > 10e6) quotes.push(usd[0] / usd[1]);
    const btc = pair(FBTC); // fBTC 8 decimals
    if (btc && btc[0] > 1e5) quotes.push(((btc[0] / 1e8) * btcUsd) / (btc[1] / 1e6));
  }
  return { price: median(quotes), sources: quotes.length };
}

/** QWAKK (6 decimals) in USD: its QOR price in the QWAKK/QOR pools times the QOR price. */
async function qwakk(qorUsd: number): Promise<{ price: number; sources: number }> {
  const { pools } = (await json(`${REST}/qorechain/amm/v1/pools`)) as { pools: Pool[] };
  const quotes: number[] = [];
  for (const p of pools) {
    if (p.status !== "active") continue;
    const [q, u] = p.token_a === QWAKK && p.token_b === "uqor" ? [Number(p.reserve_a), Number(p.reserve_b)]
      : p.token_b === QWAKK && p.token_a === "uqor" ? [Number(p.reserve_b), Number(p.reserve_a)] : [0, 0];
    if (q > 1e9 && u > 1e9) quotes.push((u / q) * qorUsd); // both sides 6 decimals
  }
  return { price: median(quotes), sources: quotes.length };
}

export interface PriceSet { USD: number; ETH: number; BTC: number; QOR: number; QWAKK: number; detail: Record<string, number> }

export async function fetchPrices(): Promise<PriceSet> {
  const [btc, eth] = await Promise.all([spot("BTC"), spot("ETH")]);
  const q = await qor(btc.price);
  const w = await qwakk(q.price);
  return {
    USD: 1,
    ETH: eth.price,
    BTC: btc.price,
    QOR: q.price,
    QWAKK: w.price,
    detail: { btcSources: btc.sources, ethSources: eth.sources, qorPools: q.sources, qwakkPools: w.sources },
  };
}


if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await fetchPrices());
}
