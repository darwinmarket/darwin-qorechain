import { D, ORACLE, RESERVE, ROUTER, addressUrl } from "@/lib/qore/chain";
import styles from "@/components/app/app.module.css";
import { WindowPanel } from "@/components/app/WindowPanel";

export const metadata = { title: "Post-quantum security" };

const rows: [string, string, string][] = [
  ["Oracle price round", "Reporter's ML-DSA-87 key", "DarwinOracle.submit checks the signature with pqcVerify (0x…0A01) against pqcKeyStatus (0x…0A02); round numbers, timestamps and a 15% circuit breaker stop replays and bad data."],
  ["Rebalance", "Curator's ML-DSA-87 key", "DarwinBasket.rebalance verifies the curator's signature over the exact trades, nonce and deadline; the NAV may not drop by more than 1%."],
  ["Target weights", "Curator's ML-DSA-87 key", "DarwinBasket.setTargetWeights, same domain-separated message with a nonce."],
  ["Every admin action", "Admin's ML-DSA-87 key", "PqcAdmin: feeds, reporter, curator, guardian, reserve listings, spreads, withdrawals, unpausing. No function checks msg.sender for admin powers."],
  ["Your buy and sell", "Your QoreX keys: secp256k1 + ML-DSA-87", "QoreX signs a native transaction hybrid; MsgCrossVMCall carries the router call to the EVM. No EVM window is opened for you."],
  ["Keeper relaying", "Scoped EVM window", "The relayer's window admits only Darwin's own contracts and tokens (allowed_targets): a leaked keeper key can touch nothing else."],
  ["Pause new mints", "Guardian (classical key)", "The only power a classical key holds, and the only one that can never cost a holder anything."],
  ["Redeem in kind", "Nobody", "Always open, needs no oracle, curator or admin."],
];

export default function Security() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <header>
        <h1 style={{ fontSize: 32, letterSpacing: "-0.02em", marginBottom: 8 }}>No ECDSA key alone can move a Darwin basket.</h1>
        <p style={{ color: "#71716b", maxWidth: 760, lineHeight: 1.55 }}>
          On Q-Day a quantum computer can derive a secp256k1 private key from its public key. Darwin is built so that this alone changes
          nothing: prices, rebalances and admin powers need an ML-DSA-87 (FIPS 204) signature, checked by the QoreChain precompiles
          against keys registered on chain, and user trades are hybrid-signed by QoreX.
        </p>
      </header>
      <section className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Authorised by</th>
              <th>How the chain checks it</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a}>
                <td><strong>{a}</strong></td>
                <td>{b}</td>
                <td style={{ color: "#4a4a4f" }}>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <WindowPanel />
      <section className={styles.card}>
        <div className={styles.cardTitle}>
          <h2>Contracts on qorechain-diana (EVM chain 9800)</h2>
        </div>
        <table className={styles.table}>
          <tbody>
            {[
              ["DarwinOracle", ORACLE],
              ["DarwinReserve", RESERVE],
              ["DarwinRouter", ROUTER],
              ...Object.values(D.baskets).map((b) => [`${b.name} (${b.display})`, b.address]),
              ["Reporter (signs prices)", D.roles.reporter],
              ["Curator (signs rebalances)", D.roles.curator],
              ["Admin (signs admin actions)", D.roles.admin],
            ].map(([n, a]) => (
              <tr key={a}>
                <td>{n}</td>
                <td className={styles.mono}>
                  <a className={styles.a} href={addressUrl(a)} target="_blank" rel="noreferrer">
                    {a}
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
