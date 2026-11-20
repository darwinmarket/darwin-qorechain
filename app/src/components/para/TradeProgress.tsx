"use client";

/**
 * What a trade is doing, shown where the button was.
 *
 * A trade is not one action. It is a chain: you authorise the spend, the network prices the basket
 * and mints the shares, then you take delivery. Each link the wallet has to ask you about is a
 * segment here — two on an ordinary Bread account, three on a Guardian one, which needs the private
 * payback imported under its own approval before it can be consumed.
 *
 * The thing this exists to say is the thing a toast in the corner never said: AFTER THE FIRST
 * SIGNATURE THERE IS A WAIT, and the wallet will come back on its own. So the segment being worked
 * on sweeps, the ones after it stay empty, and the line underneath counts the wait down. Nobody has
 * to wonder whether they missed a popup.
 *
 * It occupies the CTA's exact box and both of its rows are clipped to one line, so the card's height
 * is the same whether a trade is running or not.
 */

import { useEffect, useState } from "react";
import s from "./TradeProgress.module.css";

export type TradeTone = "working" | "done" | "error";

export function TradeProgress({
  steps,
  step,
  tone,
  label,
  countdownTo,
}: {
  /** One name per wallet approval, in order. The names are the hover titles; the count is the rail. */
  steps: string[];
  /** 0-based index of the step being worked on (the one that sweeps). */
  step: number;
  tone: TradeTone;
  /** One short line. Keep it short: it is clipped, never wrapped. */
  label: string;
  /** Epoch ms the next approval is expected at — appends a live countdown to the label. */
  countdownTo?: number;
}) {
  const left = useSecondsLeft(tone === "working" ? countdownTo : undefined);
  const text = left == null ? label : left > 0 ? `${label} in ${left}s` : `${label} any moment`;
  const at = Math.max(0, Math.min(step, steps.length - 1));

  return (
    <div className={s.rail} data-tone={tone} role="status" aria-live="polite">
      <div className={s.track}>
        {steps.map((name, i) => (
          <span
            key={`${i}-${name}`}
            className={s.seg}
            data-state={tone === "done" || i < at ? "done" : i === at ? "active" : "todo"}
            title={name}
          />
        ))}
        <span className={s.count}>{tone === "done" ? "Done" : `${at + 1} of ${steps.length}`}</span>
      </div>
      <div className={s.status}>
        {tone === "working" ? (
          <span className={`${s.spinner} toast-spin`} aria-hidden />
        ) : (
          <span className={s.glyph} aria-hidden>
            {tone === "done" ? "✓" : "!"}
          </span>
        )}
        <span className={s.label}>{text}</span>
      </div>
    </div>
  );
}

/** Seconds until `to`, re-rendered once a second, floored at 0. `null` when there is nothing to count. */
function useSecondsLeft(to?: number): number | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (to == null) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [to]);
  if (to == null) return null;
  return Math.max(0, Math.ceil((to - Date.now()) / 1000));
}
