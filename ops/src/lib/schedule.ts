/** Rebalance slots: every Monday 12:00 UTC (weekly) or every day 12:00 UTC (daily). */
export type Schedule = "weekly" | "daily";

/** The most recent slot at or before `now`. */
export function lastSlot(now: Date, schedule: Schedule): Date {
  const slot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  if (slot > now) slot.setUTCDate(slot.getUTCDate() - 1);
  if (schedule === "weekly") while (slot.getUTCDay() !== 1) slot.setUTCDate(slot.getUTCDate() - 1);
  return slot;
}

/** The first slot strictly after `now`. */
export function nextSlot(now: Date, schedule: Schedule): Date {
  const next = lastSlot(now, schedule);
  next.setUTCDate(next.getUTCDate() + (schedule === "weekly" ? 7 : 1));
  return next;
}
