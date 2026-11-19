"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoFull } from "@/components/Logo";
import { useOracle } from "@/lib/darwin/store";
import { short } from "@/lib/darwin/format";
import { QOREX_INSTALL_URL } from "@/lib/qore/qorex";
import { useWallet } from "@/lib/qore/wallet";
import styles from "./app.module.css";

const fmt = (v: bigint, dec: number, digits = 2) => (Number(v) / 10 ** dec).toLocaleString("en-US", { maximumFractionDigits: digits });

function OraclePill() {
  const oracle = useOracle();
  if (!oracle) return null;
  const age = Math.max(0, Math.floor(Date.now() / 1000) - oracle.lastTimestamp);
  const stale = age > oracle.maxAge;
  return (
    <span className={styles.netPill} title="Darwin's oracle: every round is signed with ML-DSA-87 and checked on chain by pqcVerify">
      <span className={`${styles.dot} ${stale ? styles.dotStale : ""}`} />
      QoreChain Diana · PQ oracle round {oracle.round} · {age < 90 ? `${age}s` : `${Math.round(age / 60)}m`} ago
    </span>
  );
}

function WalletButton() {
  const { account, connect, connecting, disconnect, balances, installed, error } = useWallet();
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState(false);
  if (!account) {
    return (
      <div className={styles.walletMenu}>
        <button
          type="button"
          className={styles.walletBtn}
          onClick={() => {
            setAsked(true);
            void connect();
          }}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : "Connect QoreX"}
        </button>
        {asked && (error || installed === false) && (
          <div className={styles.walletDrop}>
            <div className={styles.errorBox}>{error ?? "QoreX is not installed in this browser."}</div>
            <a className={styles.a} href={QOREX_INSTALL_URL} target="_blank" rel="noreferrer">
              Get QoreX, the QoreChain wallet
            </a>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={styles.walletMenu}>
      <button type="button" className={`${styles.walletBtn} ${styles.walletBtnOn}`} onClick={() => setOpen((o) => !o)}>
        {short(account.address)}
      </button>
      {open && (
        <div className={styles.walletDrop}>
          <div className={styles.walletRow}>
            <span>Account</span>
            <span className={styles.mono}>{short(account.address)}</span>
          </div>
          <div className={styles.walletRow}>
            <span>EVM twin</span>
            <span className={styles.mono}>{short(account.evm)}</span>
          </div>
          <div className={styles.walletRow}>
            <span>QOR</span>
            <span>{balances ? fmt(balances.qor, 6) : "…"}</span>
          </div>
          <div className={styles.walletRow}>
            <span>fUSD</span>
            <span>{balances ? fmt(balances.fusdBank + balances.fusdErc20, 6) : "…"}</span>
          </div>
          <a className={styles.a} href="https://dashboard.qorechain.io/faucet" target="_blank" rel="noreferrer">
            Get test QOR and fUSD from the faucet
          </a>
          <button type="button" className={styles.linkBtn} onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.navLogo} aria-label="Darwin home">
        <LogoFull />
      </Link>
      <div className={styles.navLinks}>
        <Link className={styles.navLink} href="/">
          Baskets
        </Link>
        <Link className={styles.navLink} href="/security">
          Post-quantum security
        </Link>
      </div>
      <span className={styles.navSpacer} />
      <OraclePill />
      <WalletButton />
    </nav>
  );
}
