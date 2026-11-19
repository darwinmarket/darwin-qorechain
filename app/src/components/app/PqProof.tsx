"use client";

import { useOracle } from "@/lib/darwin/store";
import { short } from "@/lib/darwin/format";
import { addressUrl, D, ORACLE } from "@/lib/qore/chain";
import styles from "./app.module.css";

/** What protects this basket, read live from the chain. */
export function PqProof({ basket }: { basket?: string }) {
  const oracle = useOracle();
  const age = oracle ? Math.max(0, Math.floor(Date.now() / 1000) - oracle.lastTimestamp) : null;
  const b = basket ? D.baskets[basket] : undefined;
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <h2>Post-quantum guarantees</h2>
        <small>checked on chain</small>
      </div>
      <div className={styles.proof}>
        <div className={styles.proofRow}>
          <span className={styles.check}>✓</span>
          <div>
            <strong>Prices signed with ML-DSA-87.</strong>
            <p>
              Oracle round {oracle?.round ?? "…"}, {age === null ? "…" : age < 90 ? `${age}s` : `${Math.round(age / 60)} min`} ago. Each
              round carries a 4,627-byte ML-DSA-87 signature of the{" "}
              <a className={styles.a} href={addressUrl(D.roles.reporter)} target="_blank" rel="noreferrer">
                reporter {short(D.roles.reporter)}
              </a>
              , verified by the <code>pqcVerify</code> precompile (0x…0A01) against the key the reporter registered on chain (0x…0A02)
              before{" "}
              <a className={styles.a} href={addressUrl(ORACLE)} target="_blank" rel="noreferrer">
                the oracle
              </a>{" "}
              stores a price.
            </p>
          </div>
        </div>
        <div className={styles.proofRow}>
          <span className={styles.check}>✓</span>
          <div>
            <strong>Rebalances signed by the curator.</strong>
            <p>
              The {b ? b.display : "basket"} trades only with an ML-DSA-87 signature of the curator {short(D.roles.curator)} over the
              exact trades, and reverts if a rebalance costs more than 1% of NAV.
            </p>
          </div>
        </div>
        <div className={styles.proofRow}>
          <span className={styles.check}>✓</span>
          <div>
            <strong>Your trades are hybrid-signed.</strong>
            <p>
              QoreX signs every buy and sell with secp256k1 and ML-DSA-87. The trade reaches the EVM through a native cross-VM call, so
              no ECDSA-only transaction ever touches your basket.
            </p>
          </div>
        </div>
        <div className={styles.proofRow}>
          <span className={styles.check}>✓</span>
          <div>
            <strong>No ECDSA-only admin.</strong>
            <p>
              Every admin action (feeds, reporter, curator, spreads, reserve withdrawals, unpausing) needs the admin&apos;s ML-DSA-87
              signature. A leaked classical key can at most pause new mints.
            </p>
          </div>
        </div>
        <div className={styles.proofRow}>
          <span className={styles.check}>✓</span>
          <div>
            <strong>Redemption never stops.</strong>
            <p>In-kind redemption needs no oracle, no curator and no admin, and cannot be paused.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
