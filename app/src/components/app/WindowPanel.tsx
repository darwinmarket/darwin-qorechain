"use client";

import { useQuery } from "@tanstack/react-query";
import { D, REST, tokenKeyOf } from "@/lib/qore/chain";
import styles from "./app.module.css";

type EvmWindow = {
  found: boolean;
  live?: boolean;
  remaining_blocks?: string;
  remaining_txs?: string;
  max_txs?: string;
  used_txs?: string;
  allowed_targets?: string[];
  native_only?: boolean;
};

/** The keeper's qor1 address: the bech32 form of the deployer, recorded by the ops scripts. */
const KEEPER = "qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p";

function labelOf(addr: string): string {
  const a = addr.toLowerCase();
  if (a === D.oracle.toLowerCase()) return "DarwinOracle";
  if (a === D.reserve.toLowerCase()) return "DarwinReserve";
  if (a === D.router.toLowerCase()) return "DarwinRouter";
  const basket = Object.values(D.baskets).find((b) => b.address.toLowerCase() === a);
  if (basket) return basket.display;
  const token = tokenKeyOf(addr);
  return token !== addr ? token : addr;
}

/** Live view of the keeper's EVM authorisation window, read from the chain. */
export function WindowPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["keeper-window"],
    queryFn: async () => (await (await fetch(`${REST}/qorechain/pqc/v1/evm_window/${KEEPER}`)).json()) as EvmWindow,
    refetchInterval: 20_000,
  });
  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>
        <h2>The keeper&apos;s EVM window, live</h2>
        <small>GET /qorechain/pqc/v1/evm_window</small>
      </div>
      {isLoading && <div className={styles.empty}>Reading the window…</div>}
      {data && !data.found && <div className={styles.empty}>No window open right now: the keeper relays nothing.</div>}
      {data?.found && (
        <>
          <p className={styles.drift} style={{ marginBottom: 12 }}>
            {data.live ? "Live" : "Closed"} · {data.remaining_blocks} blocks and {data.remaining_txs} of {data.max_txs} transactions left ·{" "}
            {data.native_only ? "native QOR only" : data.allowed_targets?.length ? `scoped to ${data.allowed_targets.length} contracts` : "unscoped"}.
            Opening it took a hybrid ML-DSA-87 signature; a leaked secp256k1 key of the keeper can reach only these addresses.
          </p>
          <table className={styles.table}>
            <tbody>
              {data.allowed_targets?.map((t) => (
                <tr key={t}>
                  <td>{labelOf(t)}</td>
                  <td className={styles.mono}>{t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
