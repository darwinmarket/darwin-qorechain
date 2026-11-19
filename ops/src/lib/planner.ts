/**
 * Pure rebalance planning: which component sells how many USD to which. No chain access, so it is
 * unit-tested on its own (test/planner.test.ts).
 */
export interface Leg {
  value: bigint; // USD, 18 decimals
  targetBps: number;
}

export interface Move {
  from: number; // index of the overweight component (sells)
  to: number; // index of the underweight component (buys)
  usd: bigint; // USD, 18 decimals
}

export const BPS = 10_000n;

/** Current weights in basis points, rounded down (as the contract reports them). */
export function weightsBps(legs: Leg[]): number[] {
  const total = legs.reduce((s, l) => s + l.value, 0n);
  return legs.map((l) => (total === 0n ? 0 : Number((l.value * BPS) / total)));
}

/** Largest absolute drift from target, in basis points. */
export function maxDriftBps(legs: Leg[]): number {
  const w = weightsBps(legs);
  return Math.max(0, ...legs.map((l, i) => Math.abs(w[i] - l.targetBps)));
}

/**
 * Greedy matching of overweight against underweight components, largest first. The moves bring
 * every component to its target value; their USD sum equals the total overweight.
 */
export function planMoves(legs: Leg[], minUsd = 0n): Move[] {
  const total = legs.reduce((s, l) => s + l.value, 0n);
  if (total === 0n) return [];
  const excess = legs.map((l) => l.value - (total * BigInt(l.targetBps)) / BPS);
  const byDesc = (a: { e: bigint }, b: { e: bigint }) => (b.e > a.e ? 1 : b.e < a.e ? -1 : 0);
  const sellers = excess.map((e, i) => ({ i, e })).filter((x) => x.e > 0n).sort(byDesc);
  const buyers = excess.map((e, i) => ({ i, e: -e })).filter((x) => x.e > 0n).sort(byDesc);
  const moves: Move[] = [];
  for (const s of sellers) {
    for (const b of buyers) {
      if (s.e === 0n) break;
      const usd = s.e < b.e ? s.e : b.e;
      if (usd === 0n) continue;
      if (usd > minUsd) moves.push({ from: s.i, to: b.i, usd });
      s.e -= usd;
      b.e -= usd;
    }
  }
  return moves;
}
