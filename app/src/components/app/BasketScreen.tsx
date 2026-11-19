"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Change, Chart } from "@/components/darwin/Chart";
import { CompositionTreemap } from "@/components/darwin/CompositionTreemap";
import { LogoStack, StockLogo } from "@/components/darwin/StockLogo";
import "@/components/darwin/darwin-ui.css";
import { instrumentSans } from "@/components/darwin/shell";
import { basketTicker } from "@/lib/baskets";
import { money, usd } from "@/lib/darwin/format";
import { RANGES, useNavHistory } from "@/lib/darwin/navHistory";
import { useBaskets } from "@/lib/darwin/store";
import type { Range } from "@/lib/darwin/types";
import { addressUrl, D } from "@/lib/qore/chain";
import { Activity } from "./Activity";
import { PqProof } from "./PqProof";
import { TradeCard } from "./TradeCard";
import styles from "./app.module.css";

const TOKEN_LABEL: Record<string, string> = { BTC: "fBTC", ETH: "fETH", USD: "fUSD", QOR: "WQOR" };

export function BasketScreen({ symbol }: { symbol: string }) {
  const { data: baskets, error } = useBaskets();
  const basket = baskets?.find((b) => b.symbol === symbol);
  const [range, setRange] = useState<Range>("30D");
  const history = useNavHistory(basket?.legs, range);
  const tiles = useMemo(() => (basket?.legs ?? []).map((l) => ({ id: l.address, symbol: l.symbol, weight: l.weight })), [basket]);
  const meta = D.baskets[symbol];

  if (error) return <div className={styles.errorBox}>{error}</div>;
  if (!basket) return <div className={styles.empty}>Reading {meta?.display ?? symbol} from the chain…</div>;
  const ticker = basketTicker(basket.symbol);
  const byWeight = [...basket.legs].sort((a, b) => b.weight - a.weight);

  return (
    <div className={`darwin-ui ${instrumentSans.variable}`}>
      <Link href="/" className={styles.back}>
        ← All baskets
      </Link>
      <header className={styles.bHead}>
        <LogoStack legs={byWeight} size={40} />
        <div className={styles.bTitle}>
          <h1>{basket.name}</h1>
          <small>
            {ticker} ·{" "}
            <a className={styles.a} href={addressUrl(basket.address)} target="_blank" rel="noreferrer">
              {basket.address.slice(0, 10)}…
            </a>{" "}
            · {basket.description}
          </small>
        </div>
        <div className={styles.bNav}>
          <strong>{usd(basket.navUsd)}</strong>
          <small>
            NAV per share · since launch <Change value={basket.shareAtInception ? basket.navUsd / basket.shareAtInception - 1 : null} />
          </small>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <small>Total value locked</small>
          <strong>{money(basket.tvlUsd)}</strong>
        </div>
        <div className={styles.stat}>
          <small>Shares outstanding</small>
          <strong>{basket.supplyFloat.toLocaleString("en-US", { maximumFractionDigits: 3 })}</strong>
        </div>
        <div className={styles.stat}>
          <small>Buy capacity now</small>
          <strong>{basket.capacityUsd > 0 ? money(basket.capacityUsd) : "—"}</strong>
        </div>
        <div className={styles.stat}>
          <small>Trade fee</small>
          <strong>0.30%</strong>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.stack}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <h2>
                NAV per share <Change value={history.change} />
              </h2>
              <div className={styles.ranges}>
                {RANGES.map((r) => (
                  <button key={r} type="button" className={`${styles.range} ${r === range ? styles.rangeOn : ""}`} onClick={() => setRange(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <Chart history={history} height={260} grid axis />
            <p className={styles.drift} style={{ marginTop: 8 }}>
              History replays today&apos;s units per share on BTC and ETH closes (fBTC and fETH track them); fUSD and QOR legs are held at
              today&apos;s price.
            </p>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>
              <h2>Composition</h2>
              <small>live from the vault</small>
            </div>
            <CompositionTreemap items={tiles} className={styles.treemap} />
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th className={styles.r}>Per share</th>
                  <th className={styles.r}>Price</th>
                  <th className={styles.r}>Value</th>
                  <th className={styles.r}>Weight / target</th>
                </tr>
              </thead>
              <tbody>
                {byWeight.map((l) => (
                  <tr key={l.address}>
                    <td>
                      <span className={styles.legName}>
                        <StockLogo sym={l.symbol} size={20} />
                        {TOKEN_LABEL[l.symbol] ?? l.symbol}
                      </span>
                    </td>
                    <td className={styles.r}>{l.perShare.toPrecision(4)}</td>
                    <td className={styles.r}>{usd(l.priceUsd)}</td>
                    <td className={styles.r}>{money(l.valueUsd)}</td>
                    <td className={styles.r}>
                      {(100 * l.weight).toFixed(2)}% <span className={styles.drift}>/ {(100 * (l.targetWeight ?? 0)).toFixed(0)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <Activity basket={basket.symbol} title={`${ticker} activity`} />
        </div>

        <div className={styles.stack}>
          <TradeCard basket={basket} />
          <PqProof basket={basket.symbol} />
        </div>
      </div>
    </div>
  );
}
