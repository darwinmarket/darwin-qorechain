import { test } from "node:test";
import assert from "node:assert/strict";
import { money } from "../src/lib/darwin/format.ts";

test("money keeps two decimals and flags dust", () => {
  assert.equal(money(0), "$0.00");
  assert.equal(money(0.744684), "$0.74");
  assert.equal(money(1234.5), "$1,234.50");
  assert.equal(money(0.004), "<$0.01");
});
