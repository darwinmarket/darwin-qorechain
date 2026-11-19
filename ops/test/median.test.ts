import { test } from "node:test";
import assert from "node:assert/strict";
import { median, toWad } from "../src/lib/median.js";

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
  assert.equal(toWad(0.0348797179706242), 34879718000000000n);
});
