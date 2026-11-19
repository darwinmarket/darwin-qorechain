"use client";

import Link from "next/link";
import { LogoStack, StockLogo } from "@/components/darwin/StockLogo";
import { basketTicker } from "@/lib/baskets";
import { money, usd } from "@/lib/darwin/format";
import { useBaskets, useOracle } from "@/lib/darwin/store";
import { useWallet } from "@/lib/qore/wallet";
import styles from "./app.module.css";


export function Portfolio() {
  const { account, balances, connect, connecting } = useWallet();
  const { data: baskets } = useBaskets();
  const oracle = useOracle();
  const price = (t: string) => oracle?.feeds.find((f) => f.tracks === t)?.price ?? 0;

  if (!account) {
    return (
      <section className={styles.card} style={{ maxWidth: 520 }}>
        <div className={styles.cardTitle}>
          <h2>Your portfolio</h2>
        </div>
        <p className={styles.drift} style={{ marginBottom: 14 }}>Connect QoreX to see your baskets and coins.</p>
        <button type="button" className={styles.cta} onClick={() => void connect()} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect QoreX"}
        </button>
      </section>
    );
  }

  const positions = (baskets ?? [])
    .map((b) => {
      const shares = Number(balances?.shares[b.symbol] ?? 0n) / 1e18;
      return { b, shares, value: shares * b.navUsd };
    })
    .filter((p) => p.shares > 0);
  const fusd = Number((balances?.fusdBank ?? 0n) + (balances?.fusdErc20 ?? 0n)) / 1e6;
  const total = positions.reduce((s, p) => s + p.value, 0) + fusd;

  return (
    <div className={styles.stack}>
      <header className={styles.bHead}>
        <div className={styles.bTitle}>
          <h1>Your portfolio</h1>
          <small className={styles.mono}>
            {account.address} · EVM {account.evm}
          </small>
        </div>
        <div className={styles.bNav}>
          <strong>{money(total)}</strong>
          <small>at the post-quantum oracle&apos;s prices</small>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <h2>Baskets</h2>
          <small>{positions.length} position(s)</small>
        </div>
        {positions.length === 0 ? (
          <div className={styles.empty}>
            No basket yet. <Link className={styles.a} href="/">Pick one</Link>.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Basket</th>
                <th className={styles.r}>Shares</th>
                <th className={styles.r}>NAV per share</th>
                <th className={styles.r}>Value</th>
                <th className={styles.r}></th>
              </tr>
            </thead>
            <tbody>
              {positions.map(({ b, shares, value }) => (
                <tr key={b.symbol}>
                  <td>
                    <span className={styles.legName}>
                      <LogoStack legs={b.legs} size={20} />
                      {b.name} <span className={styles.drift}>{basketTicker(b.symbol)}</span>
                    </span>
                  </td>
                  <td className={styles.r}>{shares.toFixed(4)}</td>
                  <td className={styles.r}>{usd(b.navUsd)}</td>
                  <td className={styles.r}>{money(value)}</td>
                  <td className={styles.r}>
                    <Link className={styles.a} href={`/basket/${basketTicker(b.symbol)}`}>
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <h2>Wallet</h2>
          <small>fUSD to buy with, QOR for fees</small>
        </div>
        <table className={styles.table}>
          <tbody>
            <tr>
              <td>
                <span className={styles.legName}>
                  <StockLogo sym="USD" size={20} /> fUSD
                </span>
              </td>
              <td className={styles.r}>
                {fusd.toFixed(2)}{" "}
                <span className={styles.drift}>
                  ({(Number(balances?.fusdBank ?? 0n) / 1e6).toFixed(2)} bank · {(Number(balances?.fusdErc20 ?? 0n) / 1e6).toFixed(2)} ERC-20)
                </span>
              </td>
              <td className={styles.r}>{money(fusd)}</td>
            </tr>
            <tr>
              <td>
                <span className={styles.legName}>
                  <StockLogo sym="QOR" size={20} /> QOR (gas)
                </span>
              </td>
              <td className={styles.r}>{(Number(balances?.qor ?? 0n) / 1e6).toFixed(3)}</td>
              <td className={styles.r}>{money((Number(balances?.qor ?? 0n) / 1e6) * price("QOR"))}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
