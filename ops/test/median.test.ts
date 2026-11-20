import { test } from "node:test";
import assert from "node:assert/strict";
import { median, toWad, windowMedian } from "../src/lib/median.js";

test("median of an odd and an even set", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test("unusable answers are ignored", () => {
  assert.equal(median([NaN, 62000, 0, -1, Infinity, 62010, 62020]), 62010);
});

test("no usable answer throws", () => {
  assert.throws(() => median([NaN, 0]), /no price source/);
});

test("toWad is exact to the nano-dollar", () => {
  assert.equal(toWad(1), 10n ** 18n);
  assert.equal(toWad(62374.35), 62374350000000000000000n);
  assert.equal(toWad(0.0348797179706242), 34879717970624200n);
});

test("toWad keeps a memecoin price precise", () => {
  assert.equal(toWad(0.00005063678424081296), 50636784240813n);
  assert.throws(() => toWad(0), /bad price/);
});

test("windowMedian ignores a short pump and old samples", () => {
  const now = 10_000;
  const base = Array.from({ length: 20 }, (_, i) => ({ t: now - 1_700 + i * 85, v: 1 }));
  const pumped = [...base, { t: now - 30, v: 14 }, { t: now, v: 14 }];
  const r = windowMedian([{ t: now - 5_000, v: 99 }, ...pumped], now, 1_800);
  assert.equal(r.value, 1);
  assert.equal(r.n, 22);
  assert.ok(r.kept.every((s) => s.t > now - 1_800));
});

test("windowMedian follows a move that lasts", () => {
  const now = 10_000;
  const samples = Array.from({ length: 30 }, (_, i) => ({ t: now - 1_740 + i * 60, v: i < 10 ? 1 : 2 }));
  assert.equal(windowMedian(samples, now, 1_800).value, 2);
});
