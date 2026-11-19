"use client";

import { useMemo } from "react";
import { LogoStack } from "./StockLogo";
import { usd } from "@/lib/darwin/format";
import { basketTicker } from "@/lib/baskets";
import { useNavHistory } from "@/lib/darwin/navHistory";
import type { Basket } from "@/lib/darwin/types";
import { BasketLink } from "./BasketLink";
import { HeroShader } from "./HeroShader";
import { sinceLaunch } from "./sinceLaunch";
import styles from "./Hero.module.css";

/** A basket shortcut: logos, NAV, 30-day move and whether it can be bought yet. */
function BasketChip({ basket, onOpen }: { basket: Basket; onOpen?: (symbol: string) => void }) {
  const history = useNavHistory(basket.legs, "30D");
  const legs = useMemo(() => [...basket.legs].sort((a, b) => b.weight - a.weight), [basket.legs]);
  const soon = basket.live === false;

  return (
    <BasketLink
      basket={basket}
      onOpen={onOpen}
      className={`${styles.chip}${soon ? ` ${styles.soon}` : ""}`}
      ariaLabel={`Open ${basket.name}, ${basketTicker(basket.symbol)}. NAV ${usd(basket.navUsd)}.`}
    >
      {soon && <span className={styles.soonTag}>Soon</span>}
      <span className={styles.identity}>
        <LogoStack legs={legs} size={26} />
        <span className={styles.name}>
          <strong>{basket.name}</strong>
          <small>{basketTicker(basket.symbol)}</small>
        </span>
      </span>
      <span className={styles.values}>
        <span className={`${styles.nav} num`}>{usd(basket.navUsd)}</span>
        {history.change === null ? (
          <span className={styles.pending} aria-hidden />
        ) : (
          <span className={styles.change}>
            {history.change >= 0 ? "+" : ""}
            {(100 * history.change).toFixed(2)}% 30d
          </span>
        )}
      </span>
      <span className={styles.meta}>{legs.length} assets</span>
    </BasketLink>
  );
}

/** The hero's light-on-gradient button, for calls to action passed in from the app shell. */
export const heroSecondary = styles.secondary;

/** Home hero: the pitch, the two calls to action, and a shortcut into every basket. */
export function Hero({
  baskets,
  onOpen,
  actions,
  shader = true,
}: {
  baskets: Basket[] | undefined;
  onOpen?: (symbol: string) => void;
  /** Replaces the default pair of calls to action (used inside the app shell). */
  actions?: React.ReactNode;
  /** Off in the loading fallback, which is replaced as soon as the app mounts. */
  shader?: boolean;
}) {
  const shortcuts = useMemo(
    () =>
      baskets
        ? [...baskets]
            .sort((a, b) => Number(Boolean(b.live)) - Number(Boolean(a.live)) || (sinceLaunch(b) ?? 0) - (sinceLaunch(a) ?? 0))
            .slice(0, 4)
        : [],
    [baskets],
  );

  return (
    <section className={styles.hero}>
      {shader && <HeroShader className={styles.shader} palette="sunset" />}
      <div className={styles.copy}>
        <h1 className="t-hero">Crypto baskets that survive Q-Day.</h1>
        <p className="t-lead">One token, a whole portfolio. Priced by an oracle whose every round is ML-DSA-87 signed, rebalanced only with a post-quantum signature, traded from QoreX with a hybrid signature.</p>
        <div className={styles.actions}>
          {/* Every mount passes `actions` (HeroActions), so there is no default pair any more.
              The one that used to be here linked to /baskets, now deleted, and to /create, which
              never existed — it had been rendering a 404 to nobody. */}
          {actions}
        </div>
      </div>
      <div className={styles.slot}>
        <div className={styles.row}>
          {shortcuts.length > 0
            ? shortcuts.map((b) => <BasketChip key={b.address} basket={b} onOpen={onOpen} />)
            : [0, 1, 2, 3].map((i) => <span key={i} className={styles.chipSkeleton} aria-hidden />)}
        </div>
      </div>
    </section>
  );
}
