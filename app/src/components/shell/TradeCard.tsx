"use client";

/**
 * The trade card's LOOK, and nothing else.
 *
 * It exists because the card has to be the same object whether or not a wallet is connected.
 * Before this, a visitor without one got a small "Connect wallet" box where the card should be,
 * and the page changed shape under them the moment they connected — the thing they had been
 * reading was replaced by a different thing. Same for an account with no USDCx: the form
 * collapsed into a funding box.
 *
 * So the card never changes shape. Position, sides, amount, what you get for it — always there.
 * What changes is the one button at the bottom: Connect wallet, then Add funds, then Buy. The
 * next step is always the same control in the same place — and while a trade runs, that same box
 * holds its progress instead (`progress`), so the card does not grow by a pixel.
 *
 * NOTHING ELSE APPEARS OR DISAPPEARS. There used to be explanatory lines above and below the
 * button — connect first, no USDCx yet, settled at NAV, a trade is settling, a claim is finishing.
 * Each one pushed everything under it down when it arrived and pulled it back up when it left, so
 * the card twitched through a trade and jumped again on connect. The button and the rail say what
 * those lines said, in a box whose height never changes. Do not add a slot back.
 *
 * Pure presentation: every value and every handler is a prop. BasketTradePanel drives it with
 * live chain state; ConnectGate drives it with nothing, which is exactly the point.
 */

import type { ReactNode } from "react";
import s from "./TradeCard.module.css";

export interface TradeCardChip {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function TradeCard({
  symbol,
  side,
  onSide,
  sellDisabled,
  buyDisabled,
  sellTitle,
  position,
  spendLabel,
  amount,
  onAmount,
  amountUnit,
  amountDisabled,
  onMax,
  maxDisabled,
  over,
  chips,
  available,
  receiveValue,
  receiveUnit,
  fine,
  warn,
  cta,
  progress,
  notice,
}: {
  symbol: string;
  side: "buy" | "sell";
  onSide: (side: "buy" | "sell") => void;
  sellDisabled?: boolean;
  buyDisabled?: boolean;
  sellTitle?: string;
  /**
   * The holding, above the sides. ALWAYS drawn, even with nothing in it, because it used to
   * appear the moment the balance came back and push the whole card (and the column under it)
   * down by its own height. An em dash costs nothing and the card has one height everywhere.
   */
  position?: { value: string; sub?: string } | null;
  spendLabel: string;
  amount: string;
  onAmount: (v: string) => void;
  amountUnit: string;
  amountDisabled?: boolean;
  onMax?: () => void;
  maxDisabled?: boolean;
  over?: boolean;
  chips?: TradeCardChip[];
  /** Right of the "you receive" label — the balance this side can draw on. */
  available?: string | null;
  receiveValue: string;
  receiveUnit: string;
  /** One line under the estimate: the share count and the fee. ALWAYS present, so it cannot move. */
  fine?: string | null;
  warn?: string | null;
  cta: { label: string; onClick: () => void; disabled?: boolean };
  /**
   * Shown INSTEAD of the button while a trade is running. It has the button's exact box, so the
   * card's height never changes — the control becomes the status and nothing below it moves.
   */
  progress?: ReactNode;
  /**
   * Shown BELOW the button, and never in place of it.
   *
   * For something that is true until the person does something about it, rather than for the
   * minute a trade is in flight. `progress` takes the button's box, which is right for a running
   * trade and wrong for a standing one: a refused trade put its card there and the basket lost
   * its Buy button for as long as the card stayed — measured on Blue Chip, where the card from
   * yesterday's lost share had been blocking the basket all along.
   */
  notice?: ReactNode;
}) {
  const buying = side === "buy";
  return (
    <div>
      <div className={s.position}>
        <span className={s.positionLabel}>Your position</span>
        <span className={s.positionValue} data-empty={!position || undefined}>
          {position?.value ?? "—"}
        </span>
        {position?.sub && <span className={s.positionUsd}>{position.sub}</span>}
      </div>

      <div className={s.sides} role="group" aria-label="Trade side">
        <button
          type="button"
          className={s.side}
          data-on={buying || undefined}
          disabled={buyDisabled}
          title={buyDisabled ? "This strategy is winding down — withdrawals only" : undefined}
          onClick={() => onSide("buy")}
        >
          Buy
        </button>
        <button
          type="button"
          className={s.side}
          data-on={!buying || undefined}
          disabled={sellDisabled}
          title={sellTitle}
          onClick={() => onSide("sell")}
        >
          Sell
        </button>
      </div>

      <div className={s.fieldLabel}>
        <span>{spendLabel}</span>
        <button type="button" className={s.maxLink} disabled={maxDisabled || !onMax} onClick={() => onMax?.()}>
          Max
        </button>
      </div>
      <div className={s.field} data-over={over || undefined}>
        <input
          value={amount}
          onChange={(e) => onAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          disabled={amountDisabled}
          className={s.input}
          placeholder="0.0"
          aria-label={spendLabel}
        />
        <span className={s.unit}>{amountUnit}</span>
      </div>

      {chips && chips.length > 0 && (
        <div className={s.chips}>
          {chips.map((c) => (
            <button key={c.label} type="button" className={s.chip} disabled={c.disabled} onClick={c.onClick}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className={s.fieldLabel} style={{ marginTop: 16 }}>
        <span>You receive</span>
        {available && (
          <span style={{ textTransform: "none", letterSpacing: 0 }}>Available {available}</span>
        )}
      </div>
      <div className={s.receive}>
        <span className={s.receiveValue} data-empty={receiveValue === "$0.00" || undefined}>
          ≈ {receiveValue}
        </span>
        <span className={s.unit}>{receiveUnit}</span>
      </div>
      {fine && <p className={s.note}>{fine}</p>}

      {warn && <p className={s.warn}>{warn}</p>}

      {progress ?? (
        <button type="button" onClick={cta.onClick} disabled={cta.disabled} className={s.cta}>
          {cta.label}
        </button>
      )}

      {notice}
    </div>
  );
}
