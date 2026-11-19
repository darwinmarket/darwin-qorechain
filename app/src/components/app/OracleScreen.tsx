"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { StockLogo } from "@/components/darwin/StockLogo";
import { short, usd } from "@/lib/darwin/format";
import { useOracle } from "@/lib/darwin/store";
import { addressUrl, D, ORACLE, txUrl } from "@/lib/qore/chain";
import { roundGas, useOracleRounds } from "@/lib/qore/oracleHistory";
import { Sparkline } from "./Sparkline";
import styles from "./app.module.css";

const FEEDS: [number, string][] = [
  [3, "BTC"],
  [2, "ETH"],
  [4, "QOR"],
  [1, "USD"],
];

const price = (p: number) => (p < 1 ? `$${p.toFixed(5)}` : usd(p));


export function OracleScreen() {
  const oracle = useOracle();
  const { data: rounds, isLoading } = useOracleRounds();
  const latestTx = rounds?.[0]?.tx as `0x${string}` | undefined;
  const { data: gas } = useQuery({ queryKey: ["round-gas", latestTx], queryFn: () => roundGas(latestTx!), enabled: Boolean(latestTx) });
  const series = useMemo(() => {
    const asc = [...(rounds ?? [])].reverse();
    return Object.fromEntries(
      FEEDS.map(([id]) => [id, asc.filter((r) => r.prices[id] !== undefined).map((r) => [r.timestamp * 1000, r.prices[id]] as [number, number])]),
    ) as Record<number, [number, number][]>;
  }, [rounds]);

  return (
    <div className={styles.stack}>
      <header className={styles.bHead}>
        <div className={styles.bTitle}>
          <h1>Post-quantum oracle</h1>
          <small>
            <a className={styles.a} href={addressUrl(ORACLE)} target="_blank" rel="noreferrer">
              DarwinOracle {short(ORACLE)}
            </a>{" "}
            · reporter{" "}
            <a className={styles.a} href={addressUrl(D.roles.reporter)} target="_blank" rel="noreferrer">
              {short(D.roles.reporter)}
            </a>{" "}
            · every round ML-DSA-87 signed and verified by pqcVerify
          </small>
        </div>
        <div className={styles.bNav}>
          <strong>Round {oracle?.round ?? "…"}</strong>
          <small>max age {oracle ? oracle.maxAge / 60 : "…"} min · circuit breaker 15% per round</small>
        </div>
      </header>

      <div className={styles.stats}>
        {FEEDS.map(([id, sym]) => {
          const f = oracle?.feeds.find((x) => x.feed === id);
          return (
            <div key={id} className={styles.stat}>
              <small style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <StockLogo sym={sym} size={16} /> {sym}/USD · feed {id}
              </small>
              <strong>{f ? price(f.price) : "…"}</strong>
              <Sparkline values={(series[id] ?? []).map((p) => p[1])} />
            </div>
          );
        })}
      </div>

      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <h2>What one round costs</h2>
          <small>latest round, from its receipt</small>
        </div>
        <p className={styles.drift}>
          {gas
            ? `${gas.calldataBytes.toLocaleString("en-US")} bytes of calldata, most of it the 4,627-byte ML-DSA-87 signature; ${gas.gasUsed.toLocaleString("en-US")} gas, pqcVerify and the key-registry read included.`
            : "Reading the latest round's receipt…"}
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <h2>Rounds</h2>
          <small>last ~3 hours</small>
        </div>
        {isLoading && <div className={styles.empty}>Reading rounds…</div>}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Round</th>
              <th>Time</th>
              <th className={styles.r}>BTC</th>
              <th className={styles.r}>ETH</th>
              <th className={styles.r}>QOR</th>
              <th className={styles.r}>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rounds?.map((r) => (
              <tr key={r.round}>
                <td>#{r.round}</td>
                <td>{new Date(r.timestamp * 1000).toLocaleTimeString("en-GB")}</td>
                <td className={styles.r}>{r.prices[3] ? price(r.prices[3]) : "—"}</td>
                <td className={styles.r}>{r.prices[2] ? price(r.prices[2]) : "—"}</td>
                <td className={styles.r}>{r.prices[4] ? price(r.prices[4]) : "—"}</td>
                <td className={styles.r}>
                  <a className={styles.a} href={txUrl(r.tx)} target="_blank" rel="noreferrer">
                    {r.tx.slice(0, 10)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
