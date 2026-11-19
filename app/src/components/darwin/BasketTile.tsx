"use client";

import { memo, useMemo } from "react";
import { Change, Chart } from "./Chart";
import { CompositionTreemap } from "./CompositionTreemap";
import { LogoStack } from "./StockLogo";
import { money, usd } from "@/lib/darwin/format";
import { basketTicker } from "@/lib/baskets";
import { useNavHistory } from "@/lib/darwin/navHistory";
import type { Basket } from "@/lib/darwin/types";
import { BasketLink } from "./BasketLink";
import { sinceLaunch } from "./sinceLaunch";
import styles from "./BasketTile.module.css";

/** Half-width basket card: two of them sit side by side on the home page. */
export const BasketTile = memo(function BasketTile({ b, onOpen }: { b: Basket; onOpen?: (symbol: string) => void }) {
  const history = useNavHistory(b.legs, "30D");
  const byWeight = useMemo(() => [...b.legs].sort((x, y) => y.weight - x.weight), [b.legs]);
  const tiles = useMemo(() => b.legs.map((l) => ({ id: l.address, symbol: l.symbol, weight: l.weight })), [b.legs]);
  const launch = sinceLaunch(b);
  // Priced live but not buyable yet (its on-chain faucets / DEX rail aren't deployed): the card
  // still shows, carries a "Soon" badge, and dims on hover since it opens nothing.
  const soon = b.live === false;

  return (
    <BasketLink
      basket={b}
      onOpen={onOpen}
      className={`${styles.tile}${soon ? ` ${styles.soon}` : ""}`}
      ariaLabel={`Open ${b.name}, ${basketTicker(b.symbol)}. NAV ${usd(b.navUsd)} per share.`}
    >
      {soon && <span className={styles.soonBadge}>Soon</span>}
      <header className={styles.head}>
        <LogoStack legs={byWeight} size={30} />
        <span className={styles.name}>
          <strong>{b.name}</strong>
          <small>{basketTicker(b.symbol)}</small>
        </span>
        <span className={styles.value}>
          <strong className="num">{usd(b.navUsd)}</strong>
          <small>NAV per share</small>
        </span>
      </header>

      <div className={styles.body}>
        <CompositionTreemap items={tiles} compact className={styles.treemap} />
        <div className={styles.trend}>
          <Chart history={history} height={132} fill />
          <div className={styles.trendMeta}>
            <span>30D</span>
            <Change value={history.change} />
          </div>
        </div>
      </div>

      <footer className={styles.foot}>
        <span>
          Since launch <Change value={launch} />
        </span>
        <span>
          {money(b.tvlUsd)} TVL · {b.legs.length} assets
        </span>
      </footer>
    </BasketLink>
  );
});
