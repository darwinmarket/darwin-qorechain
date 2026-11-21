"use client";

/**
 * A transaction, inside the Darwin frame: status, block, the post-quantum evidence the chain recorded
 * and the Darwin action it carried. Linked from Activity, the Security tab and the trade toasts.
 */
import type { CSSProperties, ReactNode } from "react";
import { EXPLORER } from "@/lib/qore/chain";
import { useTx, type DarwinAction, type TxView } from "@/lib/qore/tx";
import { useBrowserCheck } from "@/lib/qore/verify";
import { AgamaFrame } from "./AgamaFrame";
import { AgamaNavbar } from "./AgamaNavbar";
import { SectionHeading } from "./SectionHeading";
import { withBase } from "@/lib/base";

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

const ok = (good: boolean | undefined) => ({ color: good ? "var(--green)" : "var(--orange)", fontWeight: 600 });

/** The same signatures, checked again in this browser (QoreSign, @qorechain/pqc). */
function BrowserCheckRow({ tx }: { tx: TxView }) {
  const { data, error, isLoading } = useBrowserCheck(tx);
  if (data?.kind === "none") return null;
  return (
    <Row label="Checked in this browser">
      {isLoading && <span style={sub}>Verifying ML-DSA-87 locally…</span>}
      {error && <span style={{ color: "var(--orange)" }}>{(error as Error).message}</span>}
      {data?.kind === "native" && (
        <>
          <span data-browser-check={String(data.pqVerified && data.classicalVerified !== false)} style={ok(data.pqVerified && data.classicalVerified !== false)}>
            {data.pqVerified ? "ML-DSA-87 layer verified" : `ML-DSA-87 layer not verified${data.reason ? ` (${data.reason})` : ""}`}
            {data.classicalVerified != null && ` · secp256k1 ${data.classicalVerified ? "verified" : "not verified"}`}
          </span>
          <div style={sub}>
            QoreSign (@qorechain/qoresign) re-read the committed transaction and checked both signatures against the keys{" "}
            {data.signer} registered on chain (sign-bytes {data.signBytes}, security tier {data.tier}).
          </div>
        </>
      )}
      {data?.kind === "account" && (
        <>
          <span data-browser-check={String(data.verified && data.tamperedRejected)} style={ok(data.verified && data.tamperedRejected)}>
            {data.verified ? "The owner's ML-DSA-87 signature verified" : "Signature does not verify"}
            {data.tamperedRejected ? ` · rejected for nonce ${data.nonce + 1n}` : " · replay check failed"}
          </span>
          <div style={sub}>
            The text {data.owner} signed in QoreX was rebuilt here from the calldata and the account&apos;s nonce, and its {data.sigBytes}-byte
            ML-DSA-87 signature verified with @qorechain/pqc against the {data.keyBytes}-byte key it registered on chain
            {data.proven ? " with proof of possession" : ""}. The same signature fails for the next nonce.
          </div>
        </>
      )}
      {data?.kind === "round" && (
        <>
          <span data-browser-check={String(data.verified && data.tamperedRejected)} style={ok(data.verified && data.tamperedRejected)}>
            {data.verified ? `Round #${data.round} signature verified` : "Signature does not verify"}
            {data.tamperedRejected ? " · rejected for round #" + (data.round + 1n) : " · tamper check failed"}
          </span>
          <div style={sub}>
            The message DarwinOracle checks was rebuilt here from the calldata, and the reporter&apos;s {data.sigBytes}-byte ML-DSA-87
            signature verified over it with @qorechain/pqc, against the {data.keyBytes}-byte key {data.reporter} registered on chain
            {data.proven ? " with proof of possession" : ""}. The same signature fails for the next round number.
          </div>
        </>
      )}
    </Row>
  );
}

/** The chain's own REST API (testnet), for the raw transaction: no network toggle involved. */
const REST_PUBLIC = "https://api-testnet.qore.host";

/** A transaction hash as a link to the QoreChain explorer, highlighted. */
function HashLink({ hash, small = false }: { hash: string; small?: boolean }) {
  return (
    <a
      href={`${EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      title="Open on the QoreChain explorer (set it to Testnet once, top right)"
      style={{
        fontFamily: MONO,
        fontSize: small ? 12 : 13,
        wordBreak: "break-all",
        color: "var(--ink)",
        background: "color-mix(in srgb, var(--orange) 14%, transparent)",
        borderRadius: 6,
        padding: "2px 6px",
        textDecoration: "underline",
        textDecorationColor: "color-mix(in srgb, var(--orange) 60%, transparent)",
        textUnderlineOffset: 3,
      }}
    >
      {hash} ↗
    </a>
  );
}

export function TxScreen({ hash }: { hash: string }) {
  const { data: tx, error, isLoading } = useTx(hash);
  const home = () => (window.location.href = withBase("/"));
  return (
    <AgamaFrame
      nav={
        <AgamaNavbar
          tabs={["Baskets", "Portfolio", "Activity", "Security"]}
          onHome={home}
          onTab={(t) => (window.location.href = withBase(t === "Baskets" ? "/" : `/?tab=${t}`))}
          right={null}
        />
      }
    >
      <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "clamp(28px, 5vh, 56px) clamp(20px, 4vw, 40px)" }}>
        <button type="button" onClick={() => history.length > 1 ? history.back() : home()} style={{ border: 0, background: "none", font: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 18 }}>
          ← Back
        </button>
        <SectionHeading as="h1">Transaction</SectionHeading>
        <p style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px" }}>
          <HashLink hash={tx?.cosmosHash ?? hash} />
          <a href={`${REST_PUBLIC}/cosmos/tx/v1beta1/txs/${tx?.cosmosHash ?? hash}`} target="_blank" rel="noreferrer" style={{ ...sub, color: "var(--ink-3)" }}>
            raw chain data ↗
          </a>
        </p>
        <p style={{ ...sub, marginTop: 6 }}>
          Opens on the QoreChain explorer. The first time, set it to <b>Testnet</b> (top right): it remembers.
        </p>

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
                  <Row label={tx.viaAccount ? "Transaction signature" : "Signature"} first>
                    <strong>secp256k1 + ML-DSA-87, verified</strong>
                    <div style={sub}>
                      pqc_hybrid_verify recorded by the chain for {tx.signer}
                      {tx.viaAccount ? ", Darwin's relayer, which sent the owner's signed message as a hybrid-signed MsgCrossVMCall" : ""}
                    </div>
                  </Row>
                )}
                {tx.relayedFor && (
                  <Row label="Relayed for">
                    <strong>{tx.relayedFor}</strong>
                    <div style={sub}>
                      Darwin&apos;s relayer executed this trade through the user&apos;s authz grant, after verifying the user&apos;s ML-DSA-87
                      signed intent; the chain admitted it through the user&apos;s own EVM window.
                    </div>
                  </Row>
                )}
                {tx.viaAccount && (
                  <Row label="Signed by" first={!tx.hybridVerified}>
                    <strong>{tx.viaAccount.owner}</strong>
                    <div style={sub}>
                      &ldquo;{tx.viaAccount.summary}&rdquo;, signed in QoreX (secp256k1 + ML-DSA-87). Its Darwin account {tx.viaAccount.account} checked the
                      ML-DSA-87 signature on chain with pqcVerify{tx.viaAccount.nonce != null ? ` (nonce ${tx.viaAccount.nonce})` : ""} before trading. Darwin&apos;s relayer only paid
                      the gas: no EVM window or grant of the user was involved{tx.viaAccount.native ? ", and no ECDSA-only transaction: both signatures are post-quantum" : ""}.
                    </div>
                  </Row>
                )}
                {tx.evmWindow && (
                  <Row label="EVM admission" first={!tx.hybridVerified && !tx.viaAccount}>
                    <strong>Admitted by a post-quantum EVM window</strong>
                    <div style={sub}>
                      {tx.evmWindow.address}, transaction {tx.evmWindow.usedTxs} of its window (pqc_evm_window_used)
                    </div>
                  </Row>
                )}
                {!tx.hybridVerified && !tx.evmWindow && <Row label="Signature" first>{tx.messages.join(", ")}</Row>}
                <BrowserCheckRow tx={tx} />
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
                  <HashLink hash={tx.cosmosHash} small />
                </Row>
                {tx.evmHash && (
                  <Row label="EVM hash">
                    <HashLink hash={tx.evmHash} small />
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
    </AgamaFrame>
  );
}
