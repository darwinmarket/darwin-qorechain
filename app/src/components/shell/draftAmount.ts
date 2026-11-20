"use client";

/**
 * The amount someone has typed into a basket's trade card, before anything has been bought with it.
 *
 * Connecting walks through three React trees — the gate, the backdrop while the connected chunk
 * boots, then the real panel — and each draws its own card. Type 6, connect, and the field came
 * back empty on the other side, so the amount had to be typed again. Recorded 2026-10-15.
 *
 * The first attempt at this kept a module-level Map that the panel read-and-cleared once the wallet
 * was ready. It didn't hold, and the reasons it can't are worth writing down: the read was
 * destructive and happened inside a setState updater, which React re-runs in Strict Mode, so the
 * second run found the Map already emptied and committed the empty string; and it was gated on the
 * wallet being ready, which the trade card no longer waits for at all.
 *
 * So the draft is a plain value with one home, read non-destructively by whoever draws the card and
 * written by whoever edits it. sessionStorage rather than a module variable: it cannot be
 * duplicated by chunk splitting, it survives the reload the heap-reclaim path performs, and it is
 * visible in devtools when something looks wrong. Per tab, so two baskets open in two tabs don't
 * tread on each other.
 *
 * Cleared when the amount is consumed — the trade is placed or queued — and never otherwise. An
 * amount typed and not spent is still what the person meant to spend.
 */

const key = (symbol: string) => `darwin.draft.${symbol}.buy`;

export function readDraftAmount(symbol: string): string {
  try {
    return sessionStorage.getItem(key(symbol)) ?? "";
  } catch {
    return "";
  }
}

export function writeDraftAmount(symbol: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(key(symbol), value);
    else sessionStorage.removeItem(key(symbol));
  } catch {
    /* private mode / storage disabled — the draft just doesn't survive the swap */
  }
}
