"use client";

/**
 * The trade card before there is a wallet — the SAME card, not a placeholder. You can pick an
 * amount and see what it buys; the only thing a wallet is needed for is the last button. The page
 * therefore does not change shape when you connect: the thing you were reading stays put and its
 * button turns into Buy.
 *
 * It lives in its own file because two different trees render it: the connect gate, and the
 * backdrop that stands in while the connected app's chunk and providers boot. Both have to draw
 * the same card or connecting is a visible jolt.
 */

import { useState } from "react";

import { SKIM_FEE_BPS } from "../../lib/baskets";
import { readDraftAmount, writeDraftAmount } from "./draftAmount";
import { TradeCard } from "./TradeCard";

export function PreConnectCard({
  symbol,
  name,
  onConnect,
  connecting,
}: {
  symbol: string;
  name: string;
  onConnect?: () => void;
  /** The wallet is being wired up: same card, same box, the button just says so and is inert. */
  connecting?: boolean;
}) {
  // The same draft the connected panel reads, so the amount survives every tree the connect walks
  // through — and the trip back, if the wallet is refused or disconnected. See draftAmount.
  const [amount, setAmount] = useState(() => readDraftAmount(symbol));
  const spent = Number(amount);
  // USDCx is a dollar, so what the basket is worth needs no share price and no chain read:
  // what you put in, less the skim. The share count waits for a connected client.
  const net = spent > 0 ? spent * (1 - SKIM_FEE_BPS / 10_000) : null;
  return (
    <TradeCard
      symbol={symbol}
      side="buy"
      onSide={() => {}}
      sellDisabled
      sellTitle="Connect a wallet to sell"
      spendLabel="You spend"
      amount={amount}
      onAmount={(v) => {
        setAmount(v);
        writeDraftAmount(symbol, v);
      }}
      amountUnit="fUSD"
      maxDisabled
      chips={[25, 50, 100].map((v) => ({
        label: `$${v}`,
        onClick: () => {
          setAmount(String(v));
          writeDraftAmount(symbol, String(v));
        },
      }))}
      receiveValue={net == null ? "$0.00" : `$${net.toFixed(2)}`}
      receiveUnit={`of ${name}`}
      fine={`Includes the ${(SKIM_FEE_BPS / 100).toFixed(2)}% fee`}
      cta={
        connecting
          ? { label: "Connecting your wallet…", onClick: () => {}, disabled: true }
          : onConnect
            ? { label: "Connect wallet", onClick: onConnect }
            : // Rendered inside the connected tree with no wallet attached: the button must not
              // offer something it cannot do, so it states the condition and stays dead.
              { label: "Connect your wallet to trade", onClick: () => {}, disabled: true }
      }
    />
  );
}
