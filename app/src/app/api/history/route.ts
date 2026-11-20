import { NextResponse, type NextRequest } from "next/server";

const RANGES = new Set(["5d", "1mo", "3mo", "6mo", "1y"]);
const INTERVALS = new Set(["1h", "1d"]);
const SYMBOL_RE = /^[A-Z0-9.-]{1,12}$/;

type Series = { timestamps: number[]; closes: (number | null)[] };

const RANGE_DAYS: Record<string, number> = { "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365 };
const REST = process.env.QORE_REST_UPSTREAM ?? "https://api-testnet.qore.host";
const QWAKK_DENOM = "erc20:0xa5b3c3Fb92E2E89555F9909b9004C65F3542eE23";

/** QOR/USD from CoinGecko (its market is MEXC): hourly up to 90 days, daily beyond, since listing. */
async function qorSeries(range: string): Promise<Series | null> {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/qorechain/market_chart?vs_currency=usd&days=${RANGE_DAYS[range] ?? 90}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const { prices } = (await res.json()) as { prices: [number, number][] };
    return { timestamps: prices.map(([t]) => Math.floor(t / 1000)), closes: prices.map(([, v]) => v) };
  } catch {
    return null;
  }
}

/** A QWAKK/QOR swap on pool 6: when, and the QOR per QWAKK it executed at (fee excluded). */
type Fill = { t: number; qorPerQwakk: number };

/**
 * Every swap ever made on QWAKK's only market, the QWAKK/QOR pool of QoreChain's native AMM,
 * read from the chain's tx index. Both tokens have 6 decimals.
 */
async function qwakkFills(): Promise<Fill[]> {
  const fills: Fill[] = [];
  const q = encodeURIComponent("amm_swap.pool_id='6'");
  for (let offset = 0; offset < 5000; offset += 100) {
    const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${q}&pagination.limit=100&pagination.offset=${offset}&order_by=ORDER_BY_ASC`, {
      next: { revalidate: 900 },
    });
    if (!r.ok) throw new Error(`pool 6 swaps ${r.status}`);
    const page = (await r.json()) as { tx_responses?: any[]; total?: string };
    for (const tx of page.tx_responses ?? []) {
      if (tx.code !== 0) continue;
      for (const e of tx.events ?? []) {
        if (e.type !== "amm_swap") continue;
        const a = Object.fromEntries(e.attributes.map((x: any) => [x.key, x.value]));
        if (a.pool_id !== "6") continue;
        const gross = Number(a.amount_in) * (1 - Number(a.fee_bps) / 10_000);
        const out = Number(a.amount_out);
        if (!(gross > 0 && out > 0)) continue;
        const qorPerQwakk = a.denom_in === QWAKK_DENOM ? out / gross : gross / out;
        fills.push({ t: Math.floor(Date.parse(tx.timestamp) / 1000), qorPerQwakk });
      }
    }
    if (!page.tx_responses?.length || offset + 100 >= Number(page.total ?? 0)) break;
  }
  return fills;
}

/**
 * QWAKK/USD = its traded QOR price on pool 6 at each moment (the last swap before it) times QOR's
 * market price. QWAKK only exists since that pool opened (2026-11-18): there is no price before its
 * first swap, so nothing is drawn there, and a basket holding it charts from that day on.
 */
async function qwakkSeries(range: string): Promise<Series | null> {
  const [qor, fills] = await Promise.all([qorSeries(range), qwakkFills().catch(() => null)]);
  if (!qor || !fills?.length) return null;
  const timestamps: number[] = [];
  const closes: (number | null)[] = [];
  let k = -1;
  qor.timestamps.forEach((t, i) => {
    while (k + 1 < fills.length && fills[k + 1].t <= t) k++;
    if (k < 0 || qor.closes[i] == null) return;
    timestamps.push(t);
    closes.push(qor.closes[i]! * fills[k].qorPerQwakk);
  });
  return { timestamps, closes };
}

async function fetchSeries(symbol: string, range: string, interval: string): Promise<Series | null> {
  if (symbol === "QOR-USD") return qorSeries(range);
  if (symbol === "QWAKK-USD") return qwakkSeries(range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      next: { revalidate: interval === "1h" ? 900 : 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result?.timestamp) return null;
    return { timestamps: result.timestamp as number[], closes: result.indicators?.quote?.[0]?.close ?? [] };
  } catch {
    return null;
  }
}

/**
 * GET /api/history?symbols=AAPL,NVDA&range=3mo&interval=1d
 * Closes aligned on the bars shared by every requested symbol (occasional gaps forward-filled).
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const range = RANGES.has(params.get("range") ?? "") ? params.get("range")! : "3mo";
  const interval = INTERVALS.has(params.get("interval") ?? "") ? params.get("interval")! : "1d";
  const symbols = [...new Set((params.get("symbols") ?? "").toUpperCase().split(","))].filter((s) => SYMBOL_RE.test(s));
  if (symbols.length === 0 || symbols.length > 32) {
    return NextResponse.json({ error: "symbols required (max 32)" }, { status: 400 });
  }

  const series = await Promise.all(symbols.map((s) => fetchSeries(s, range, interval)));
  const available = symbols.filter((_, i) => series[i] !== null);

  // Bucket bars (daily bars by date, hourly bars by hour) and intersect across symbols.
  const bucket = (t: number) => (interval === "1d" ? Math.floor(t / 86400) * 86400 + 72000 : Math.floor(t / 3600) * 3600);
  const byBar = new Map<number, Record<string, number>>();
  for (const symbol of available) {
    const s = series[symbols.indexOf(symbol)]!;
    let last: number | null = null;
    s.timestamps.forEach((t, i) => {
      const c = s.closes[i] ?? last;
      if (c == null) return;
      last = c;
      const key = bucket(t);
      const row = byBar.get(key) ?? {};
      row[symbol] = c;
      byBar.set(key, row);
    });
  }

  const timestamps = [...byBar.keys()].filter((t) => available.every((s) => byBar.get(t)![s] != null)).sort((a, b) => a - b);
  const closes: Record<string, number[]> = {};
  for (const s of available) closes[s] = timestamps.map((t) => byBar.get(t)![s]);

  return NextResponse.json(
    { range, interval, timestamps, closes, missing: symbols.filter((s) => !available.includes(s)) },
    // max-age too, not just s-maxage: a reload then paints the charts from the browser's own
    // cache instead of waiting on Yahoo again.
    { headers: { "Cache-Control": "public, max-age=120, s-maxage=900, stale-while-revalidate=86400" } },
  );
}
