/** Median of the finite, positive values; throws when none is usable. */
export function median(xs: number[]): number {
  const s = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!s.length) throw new Error("no price source answered");
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * USD float -> uint128 with 18 decimals. Keeps ~15 significant digits (what a double holds), with
 * at least 9 decimals: exact to the nano-dollar for BTC, and still precise for a $0.00005 memecoin.
 */
export function toWad(usd: number): bigint {
  if (!(usd > 0) || !Number.isFinite(usd)) throw new Error(`bad price ${usd}`);
  const magnitude = Math.floor(Math.log10(usd)) + 1; // digits before the point, negative for 0.000x
  const k = Math.min(18, Math.max(9, 15 - magnitude));
  return BigInt(Math.round(usd * 10 ** k)) * 10n ** BigInt(18 - k);
}

export type Sample = { t: number; v: number };

/**
 * Median of the samples taken in the last `windowSec` seconds (the newest included), and the
 * samples worth keeping. A thin pool's spot price can be pumped for a moment; its median over half
 * an hour cannot, without holding the pumped price, against arbitrage, for most of that time.
 */
export function windowMedian(samples: Sample[], now: number, windowSec: number): { value: number; kept: Sample[]; n: number } {
  const kept = samples.filter((s) => s.t > now - windowSec && s.t <= now && Number.isFinite(s.v) && s.v > 0);
  return { value: median(kept.map((s) => s.v)), kept, n: kept.length };
}
