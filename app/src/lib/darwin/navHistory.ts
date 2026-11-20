import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { calendarDay } from "./format";
import { COINS } from "./catalogue";
import type { Leg, NavHistory, Range } from "./types";
import { withBase } from "@/lib/base";

export const RANGES: readonly Range[] = ["7D", "30D", "90D", "1Y"];

const RANGE_DAYS: Record<Range, number> = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
/** Yahoo chart query per range: hourly bars for a week, daily closes beyond. */
const RANGE_QUERY: Record<Range, { range: string; interval: string }> = {
  "7D": { range: "1mo", interval: "1h" },
  "30D": { range: "3mo", interval: "1d" },
  "90D": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
};
const DAY = 864e5;

const EMPTY: NavHistory = { points: [], change: null, supported: false, loading: false };

type History = { timestamps: number[]; closes: Record<string, number[]>; missing: string[] };

/** Catalogue symbols map to their Yahoo ticker (BTC -> BTC-USD). */
const tickerFor = (symbol: string) => COINS[symbol]?.yahoo ?? symbol;
/** A leg only Darwin's oracle prices (QOR, QWAKK): no public market history exists for it. */
const oracleOnly = (symbol: string) => !COINS[symbol]?.yahoo && symbol !== "USD";

/**
 * Two sources. Baskets of market coins (BTC, ETH, USD) replay Yahoo closes, which go back years.
 * Baskets holding QOR or QWAKK replay Darwin's own oracle rounds for every leg (/api/oracle-history,
 * read from the chain), so the whole path comes from one consistent, ML-DSA-87 signed source; it
 * starts at launch.
 */
async function fetchHistory(symbols: string[], range: Range, fromOracle: boolean): Promise<History> {
  if (fromOracle) {
    const res = await fetch(withBase("/api/oracle-history"));
    if (!res.ok) throw new Error(`oracle history ${res.status}`);
    return res.json();
  }
  // QWAKK only trades since 2026-11-18: daily bars would leave a basket holding it two or three
  // points, so it is charted hourly over whatever part of the range it existed.
  const q = symbols.includes("QWAKK") ? { range: range === "7D" ? "1mo" : "3mo", interval: "1h" } : RANGE_QUERY[range];
  const res = await fetch(withBase(`/api/history?symbols=${symbols.map(tickerFor).join(",")}&range=${q.range}&interval=${q.interval}`));
  if (!res.ok) throw new Error(`history ${res.status}`);
  return res.json();
}

/**
 * NAV path for a set of legs. Units per share are fixed, so the historical NAV is exactly
 * the sum of units x each constituent's closing price; the live on-chain NAV is the last point.
 */
export function useNavHistory(legs: Leg[] | undefined, range: Range = "30D"): NavHistory {
  const fromOracle = useMemo(() => (legs ?? []).some((l) => oracleOnly(l.symbol.toUpperCase())), [legs]);
  const symbols = useMemo(
    () => [...new Set((legs ?? []).map((l) => l.symbol.toUpperCase()).filter((s) => fromOracle || s !== "USD"))].sort(),
    [legs, fromOracle],
  );
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["history", fromOracle ? "oracle" : symbols.join(","), fromOracle ? "all" : range],
    queryFn: () => fetchHistory(symbols, range, fromOracle),
    enabled: symbols.length > 0,
    staleTime: 10 * 60_000,
  });

  return useMemo(() => {
    if (!legs?.length) return EMPTY;
    if (isLoading) return { ...EMPTY, loading: true };
    const nav = legs.reduce((sum, leg) => sum + leg.perShare * Math.max(0, leg.priceUsd ?? 0), 0);
    const key = (l: Leg) => (fromOracle ? l.symbol.toUpperCase() : tickerFor(l.symbol.toUpperCase()));
    // Off the oracle every leg has a series; off Yahoo the dollar leg is held at 1.
    const tracked = legs.filter((l) => fromOracle || l.symbol.toUpperCase() !== "USD");
    if (!data || !(nav > 0) || tracked.some((l) => !data.closes[key(l)])) return EMPTY;
    const flat = legs.filter((l) => !tracked.includes(l)).reduce((s, l) => s + l.perShare * l.priceUsd, 0);

    // Anchor on the fetch time (render must stay pure); the live NAV is stamped at that moment.
    const now = dataUpdatedAt;
    const from = now - DAY * RANGE_DAYS[range];
    const points: [number, number][] = [];
    data.timestamps.forEach((t, i) => {
      if (t * 1000 < from) return;
      points.push([t * 1000, flat + tracked.reduce((sum, l) => sum + l.perShare * data.closes[key(l)][i], 0)]);
    });
    points.push([Math.max(now, (points.at(-1)?.[0] ?? 0) + 1), nav]);
    if (points.length < 2) return EMPTY;
    return { points, change: nav / points[0][1] - 1, supported: true, loading: false };
  }, [data, dataUpdatedAt, fromOracle, isLoading, legs, range]);
}

/**
 * The label for a move over `range` ("30d"), or "since Nov 18" when the history starts later than
 * the range does (a basket holding QWAKK, which only trades since its pool opened).
 */
export function moveLabel(history: NavHistory, range: Range): string {
  const first = history.points[0]?.[0];
  const last = history.points.at(-1)?.[0];
  if (first != null && last != null && last - first < DAY * (RANGE_DAYS[range] - 1)) return `since ${calendarDay(first)}`;
  return range.toLowerCase();
}

export function pathFor(values: number[], width: number, height: number, pad = 4) {
  if (values.length < 2) return { line: "", area: "" };
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const step = width / (values.length - 1);
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${(pad + (1 - (v - min) / span) * (height - 2 * pad)).toFixed(1)}`)
    .join(" ");
  return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
}

export function axisTicks(points: [number, number][], count = 5) {
  if (points.length < 2) return [];
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => calendarDay(points[Math.round(i * step)][0]));
}
