"use client";

/**
 * A transaction, inside the Darwin frame: status, block, the post-quantum evidence the chain recorded
 * and the Darwin action it carried. Linked from Activity, the Security tab and the trade toasts.
 */
import type { CSSProperties, ReactNode } from "react";
import { EXPLORER } from "@/lib/qore/chain";
import { useTx, type DarwinAction } from "@/lib/qore/tx";
import { AppFrame } from "./AppFrame";
import { AppNavbar } from "./AppNavbar";
import { SectionHeading } from "./SectionHeading";

const MONO = "var(--font-mono-stack)";
const box: CSSProperties = { border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" };
const row = (first: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  padding: "14px 16px",
  borderTop: first ? "none" : "1px solid var(--rule)",
});
const sub: CSSProperties = { fontSize: 12, color: "var(--ink-3)" };
const usd = (n: number) => (n < 0.001 ? `$${n.toPrecision(4)}` : n < 1 ? `$${n.toFixed(5)}` : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

function Row({ label, children, first = false }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <div style={row(first)}>
      <span style={{ ...sub, fontSize: 13, paddingTop: 1 }}>{label}</span>
      <span style={{ textAlign: "right", minWidth: 0, wordBreak: "break-all" }}>{children}</span>
    </div>
  );
}

function Action({ a }: { a: DarwinAction }) {
  if (a.kind === "round")
    return (
      <>
        <div style={{ fontWeight: 600 }}>Oracle round #{a.round}</div>
        <div style={{ ...sub, marginTop: 4 }}>
          {Object.entries(a.prices)
            .map(([k, v]) => `${k} ${usd(v)}`)
            .join(" · ")}
        </div>
        <div style={{ ...sub, marginTop: 4 }}>Accepted only after the reporter&apos;s ML-DSA-87 signature passed pqcVerify on chain.</div>
      </>
    );
  if (a.kind === "buy")
    return (
      <div style={{ fontWeight: 600 }}>
        Buy {a.basket} with {a.usdIn.toFixed(2)} fUSD{a.shares != null ? ` → ${a.shares.toFixed(4)} ${a.basket}` : ""}
      </div>
    );
  if (a.kind === "sell")
    return (
      <div style={{ fontWeight: 600 }}>
        Sell {a.shares.toFixed(4)} {a.basket}
        {a.usdOut != null ? ` → ${a.usdOut.toFixed(2)} fUSD` : ""}
      </div>
    );
  if (a.kind === "rebalance")
    return (
      <>
        <div style={{ fontWeight: 600 }}>
          Rebalance {a.basket}: {a.trades} trade(s)
        </div>
        <div style={{ ...sub, marginTop: 4 }}>
          NAV {usd(a.navBefore)} → {usd(a.navAfter)}, signed by the curator with ML-DSA-87
        </div>
      </>
    );
  return <div style={{ fontWeight: 600 }}>{a.label}</div>;
}

export function TxScreen({ hash }: { hash: string }) {
  const { data: tx, error, isLoading } = useTx(hash);
  const home = () => (window.location.href = "/");
  return (
    <AppFrame
      nav={
        <AppNavbar
          tabs={["Baskets", "Portfolio", "Activity", "Security"]}
          onHome={home}
          onTab={(t) => (window.location.href = t === "Baskets" ? "/" : `/?tab=${t}`)}
          right={null}
        />
      }
    >
      <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "clamp(28px, 5vh, 56px) clamp(20px, 4vw, 40px)" }}>
        <button type="button" onClick={() => history.length > 1 ? history.back() : home()} style={{ border: 0, background: "none", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 18 }}>
          ← Back
        </button>
        <SectionHeading as="h1">Transaction</SectionHeading>
        <p style={{ ...sub, fontFamily: MONO, marginTop: 8, wordBreak: "break-all" }}>{hash}</p>

        {isLoading && <p style={{ marginTop: 24, color: "var(--ink-3)" }}>Reading qorechain-diana…</p>}
        {error && <p style={{ marginTop: 24, color: "var(--orange)" }}>{(error as Error).message}</p>}

        {tx && (
          <>
            <section style={{ marginTop: 28 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionHeading>What it did</SectionHeading>
              </div>
              <div style={box}>
                {tx.actions.map((a, i) => (
                  <div key={i} style={row(i === 0)}>
                    <span style={{ minWidth: 0 }}>
                      <Action a={a} />
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 6,
                        color: tx.ok ? "var(--green)" : "var(--orange)",
                        background: tx.ok ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--orange) 12%, transparent)",
                      }}
                    >
                      {tx.ok ? "Success" : "Failed"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginTop: 28 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionHeading>Post-quantum evidence</SectionHeading>
              </div>
              <div style={box}>
                {tx.hybridVerified && (
                  <Row label="Signature" first>
                    <strong>secp256k1 + ML-DSA-87, verified</strong>
                    <div style={sub}>pqc_hybrid_verify recorded by the chain for {tx.signer}</div>
                  </Row>
                )}
                {tx.evmWindow && (
                  <Row label="EVM admission" first={!tx.hybridVerified}>
                    <strong>Admitted by a post-quantum EVM window</strong>
                    <div style={sub}>
                      {tx.evmWindow.address}, transaction {tx.evmWindow.usedTxs} of its window (pqc_evm_window_used)
                    </div>
                  </Row>
                )}
                {!tx.hybridVerified && !tx.evmWindow && <Row label="Signature" first>{tx.messages.join(", ")}</Row>}
              </div>
            </section>

            <section style={{ marginTop: 28 }}>
              <div style={{ marginBottom: 14 }}>
                <SectionHeading>Details</SectionHeading>
              </div>
              <div style={box}>
                <Row label="Network" first>
                  qorechain-diana (testnet)
                </Row>
                <Row label="Block">{tx.height.toLocaleString()}</Row>
                <Row label="Time">{new Date(tx.time).toLocaleString()}</Row>
                <Row label="Gas used">{tx.gasUsed.toLocaleString()}</Row>
                <Row label="Messages">{tx.messages.join(", ")}</Row>
                <Row label="Cosmos hash">
                  <span style={{ fontFamily: MONO, fontSize: 12 }}>{tx.cosmosHash}</span>
                </Row>
                {tx.evmHash && (
                  <Row label="EVM hash">
                    <span style={{ fontFamily: MONO, fontSize: 12 }}>{tx.evmHash}</span>
                  </Row>
                )}
                {tx.log && <Row label="Error">{tx.log}</Row>}
              </div>
              <p style={{ ...sub, marginTop: 12 }}>
                Also on the{" "}
                <a href={`${EXPLORER}/tx/${tx.cosmosHash}`} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                  QoreChain explorer
                </a>{" "}
                (switch it to Testnet, top right: it opens on mainnet).
              </p>
            </section>
          </>
        )}
      </main>
    </AppFrame>
  );
}
