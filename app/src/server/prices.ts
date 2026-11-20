/**
 * Server-only reference prices for Darwin's oracle (same sources as ops/src/prices.ts):
 *   BTC, ETH  median of four spot APIs, two at least;
 *   QOR       median of CoinGecko, MEXC's last price and MEXC's 5-minute average, two at least;
 *   QWAKK     its only market is pool 6 (QWAKK/QOR) of QoreChain's native AMM: the median of the
 *             pool's swaps over the last 30 minutes and its current price, times QOR. Read from
 *             the chain each time, so it needs no state between serverless calls, and a short pump
 *             of the thin pool cannot set it.
 * Without two QOR quotes, QOR and QWAKK are NaN and sit out the round.
 */
import { REST } from "./chain";

export const FEED = { USD: 1, ETH: 2, BTC: 3, QOR: 4, QWAKK: 5 } as const;
const QWAKK_DENOM = "erc20:0xa5b3c3Fb92E2E89555F9909b9004C65F3542eE23";

async function get(url: string, ms = 6000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "user-agent": "darwin-keeper/1.0" }, cache: "no-store" });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

export const median = (xs: number[]) => {
  const s = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** USD float -> 18-decimal integer, keeping ~15 significant digits (as ops/src/lib/median.ts). */
export function toWad(usd: number): bigint {
  if (!(usd > 0) || !Number.isFinite(usd)) throw new Error(`bad price ${usd}`);
  const magnitude = Math.floor(Math.log10(usd)) + 1;
  const k = Math.min(18, Math.max(9, 15 - magnitude));
  return BigInt(Math.round(usd * 10 ** k)) * 10n ** BigInt(18 - k);
}

const SOURCES: Record<"BTC" | "ETH" | "QOR", (() => Promise<number>)[]> = {
  QOR: [
    async () => Number((await get("https://api.coingecko.com/api/v3/simple/price?ids=qorechain&vs_currencies=usd")).qorechain.usd),
    async () => Number((await get("https://api.mexc.com/api/v3/ticker/price?symbol=QORUSDT")).price),
    async () => Number((await get("https://api.mexc.com/api/v3/avgPrice?symbol=QORUSDT")).price),
  ],
  BTC: [
    async () => Number((await get("https://api.coinbase.com/v2/prices/BTC-USD/spot")).data.amount),
    async () => Number((await get("https://api.kraken.com/0/public/Ticker?pair=XBTUSD")).result.XXBTZUSD.c[0]),
    async () => Number((await get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")).bitcoin.usd),
    async () => Number((await get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")).price),
  ],
  ETH: [
    async () => Number((await get("https://api.coinbase.com/v2/prices/ETH-USD/spot")).data.amount),
    async () => Number((await get("https://api.kraken.com/0/public/Ticker?pair=ETHUSD")).result.XETHZUSD.c[0]),
    async () => Number((await get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")).ethereum.usd),
    async () => Number((await get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT")).price),
  ],
};

async function spot(asset: "BTC" | "ETH" | "QOR"): Promise<number> {
  const got = await Promise.allSettled(SOURCES[asset].map((f) => f()));
  const ok = got.flatMap((g) => (g.status === "fulfilled" && g.value > 0 ? [g.value] : []));
  return ok.length >= 2 ? median(ok) : NaN;
}

/** QOR per QWAKK: median of pool 6's swaps in the last 30 minutes and its current price. */
async function qwakkInQor(): Promise<number> {
  const { pool } = await get(`${REST}/qorechain/amm/v1/pools/6`);
  const aIsQwakk = pool.token_a === QWAKK_DENOM;
  const current = Number(aIsQwakk ? pool.reserve_b : pool.reserve_a) / Number(aIsQwakk ? pool.reserve_a : pool.reserve_b);
  const q = encodeURIComponent("amm_swap.pool_id='6'");
  const recent: number[] = [];
  try {
    const r = await get(`${REST}/cosmos/tx/v1beta1/txs?query=${q}&order_by=ORDER_BY_DESC&pagination.limit=20`, 8000);
    const since = Date.now() - 30 * 60_000;
    for (const t of r.tx_responses ?? []) {
      if (Date.parse(t.timestamp) < since) continue;
      for (const e of t.events ?? []) {
        if (e.type !== "amm_swap") continue;
        const a = Object.fromEntries(e.attributes.map((x: any) => [x.key, x.value]));
        if (a.pool_id !== "6") continue;
        const gross = Number(a.amount_in) * (1 - Number(a.fee_bps ?? 30) / 10_000);
        const out = Number(a.amount_out);
        if (gross > 0 && out > 0) recent.push(a.denom_in === QWAKK_DENOM ? out / gross : gross / out);
      }
    }
  } catch {
    /* no history: the current price alone */
  }
  return median([current, ...recent]);
}

export async function fetchPrices() {
  const [btc, eth, qor] = await Promise.all([spot("BTC"), spot("ETH"), spot("QOR")]);
  const qwakk = Number.isFinite(qor) ? (await qwakkInQor()) * qor : NaN;
  return { USD: 1, ETH: eth, BTC: btc, QOR: qor, QWAKK: qwakk } as Record<keyof typeof FEED, number>;
}
