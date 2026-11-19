import { test } from "node:test";
import assert from "node:assert/strict";
import { lastSlot, nextSlot } from "../src/lib/schedule.js";

const at = (s: string) => new Date(s);

test("weekly slots fall on Monday 12:00 UTC", () => {
  // Thursday 19 Nov 2026
  assert.equal(lastSlot(at("2026-11-19T22:00:00Z"), "weekly").toISOString(), "2026-11-16T12:00:00.000Z");
  assert.equal(nextSlot(at("2026-11-19T22:00:00Z"), "weekly").toISOString(), "2026-11-23T12:00:00.000Z");
});

test("on Monday before noon the slot is the previous Monday", () => {
  assert.equal(lastSlot(at("2026-11-23T11:59:00Z"), "weekly").toISOString(), "2026-11-16T12:00:00.000Z");
  assert.equal(lastSlot(at("2026-11-23T12:00:00Z"), "weekly").toISOString(), "2026-11-23T12:00:00.000Z");
});

test("daily slots are every day at 12:00 UTC", () => {
  assert.equal(lastSlot(at("2026-11-19T08:00:00Z"), "daily").toISOString(), "2026-11-18T12:00:00.000Z");
  assert.equal(nextSlot(at("2026-11-19T13:00:00Z"), "daily").toISOString(), "2026-11-20T12:00:00.000Z");
});

test("month and year boundaries", () => {
  assert.equal(lastSlot(at("2027-01-01T09:00:00Z"), "weekly").toISOString(), "2026-12-28T12:00:00.000Z");
});
