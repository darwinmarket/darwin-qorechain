"use client";

import { useActivity } from "@/lib/qore/activity";
import { txUrl } from "@/lib/qore/chain";
import styles from "./app.module.css";

const ICON = { buy: ["B", styles.iBuy], sell: ["S", styles.iSell], round: ["O", styles.iRound], rebalance: ["R", styles.iRebal] } as const;

export function Activity({ basket, title = "On-chain activity" }: { basket?: string; title?: string }) {
  const { data, isLoading } = useActivity(basket);
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <h2>{title}</h2>
        <small>last ~3 hours, live</small>
      </div>
      {isLoading && <div className={styles.empty}>Reading the chain…</div>}
      {data && data.length === 0 && <div className={styles.empty}>Nothing in the last few hours.</div>}
      <div className={styles.feed}>
        {data?.map((i) => (
          <div key={`${i.tx}-${i.kind}-${i.text}`} className={styles.feedRow}>
            <span className={`${styles.feedIcon} ${ICON[i.kind][1]}`}>{ICON[i.kind][0]}</span>
            <span>{i.text}</span>
            <a className={`${styles.a} ${styles.feedMeta}`} href={txUrl(i.tx)} target="_blank" rel="noreferrer">
              #{i.block.toString()}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
