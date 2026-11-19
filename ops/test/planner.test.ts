import { test } from "node:test";
import assert from "node:assert/strict";
import { maxDriftBps, planMoves, weightsBps, type Leg } from "../src/lib/planner.js";

const usd = (n: number) => BigInt(Math.round(n * 1e6)) * 10n ** 12n;

test("balanced basket needs no move", () => {
  const legs: Leg[] = [{ value: usd(50), targetBps: 5000 }, { value: usd(50), targetBps: 5000 }];
  assert.deepEqual(planMoves(legs), []);
  assert.equal(maxDriftBps(legs), 0);
});

test("BTC rally: sell BTC into the underweight legs, largest first", () => {
  // 35/35/30 target, BTC rallied: 45 / 30 / 25
  const legs: Leg[] = [
    { value: usd(45), targetBps: 3500 },
    { value: usd(30), targetBps: 3500 },
    { value: usd(25), targetBps: 3000 },
  ];
  assert.deepEqual(weightsBps(legs), [4500, 3000, 2500]);
  assert.equal(maxDriftBps(legs), 1000);
  const moves = planMoves(legs);
  assert.deepEqual(moves, [
    { from: 0, to: 1, usd: usd(5) },
    { from: 0, to: 2, usd: usd(5) },
  ]);
});

test("moves bring every leg exactly to target", () => {
  const legs: Leg[] = [
    { value: usd(10), targetBps: 4000 },
    { value: usd(70), targetBps: 3000 },
    { value: usd(20), targetBps: 3000 },
  ];
  const after = legs.map((l) => l.value);
  for (const m of planMoves(legs)) {
    after[m.from] -= m.usd;
    after[m.to] += m.usd;
  }
  const total = after.reduce((a, b) => a + b, 0n);
  legs.forEach((l, i) => assert.equal(after[i], (total * BigInt(l.targetBps)) / 10_000n));
});

test("several sellers and buyers", () => {
  const legs: Leg[] = [
    { value: usd(40), targetBps: 2500 },
    { value: usd(35), targetBps: 2500 },
    { value: usd(15), targetBps: 2500 },
    { value: usd(10), targetBps: 2500 },
  ];
  const moves = planMoves(legs);
  const sold = moves.reduce((s, m) => s + m.usd, 0n);
  assert.equal(sold, usd(25)); // 15 + 10 overweight
  assert.ok(moves.every((m) => m.from < 2 && m.to >= 2));
});

test("dust moves below minUsd are skipped", () => {
  const legs: Leg[] = [{ value: usd(50.001), targetBps: 5000 }, { value: usd(49.999), targetBps: 5000 }];
  assert.equal(planMoves(legs, usd(0.01)).length, 0);
  assert.equal(planMoves(legs).length, 1);
});

test("empty basket plans nothing", () => {
  assert.deepEqual(planMoves([{ value: 0n, targetBps: 10000 }]), []);
  assert.deepEqual(weightsBps([{ value: 0n, targetBps: 10000 }]), [0]);
});
