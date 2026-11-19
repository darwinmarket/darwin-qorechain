/** Median of the finite, positive values; throws when none is usable. */
export function median(xs: number[]): number {
  const s = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!s.length) throw new Error("no price source answered");
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** USD float -> uint128 with 18 decimals, exact to 1e-9 USD. */
export function toWad(usd: number): bigint {
  return BigInt(Math.round(usd * 1e9)) * 10n ** 9n;
}
