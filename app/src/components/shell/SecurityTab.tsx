"use client";

/**
 * The fourth tab: what keeps Darwin safe after Q-Day, read live from QoreChain. The post-quantum
 * oracle (every round ML-DSA-87 signed), who can do what, the keeper's scoped EVM window, the
 * contracts. Drawn with the same rows and headings as Portfolio and Activity.
 */
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { StockLogo } from "../darwin/StockLogo";
import { useOracle } from "@/lib/darwin/store";
import { addressUrl, D, ORACLE, RESERVE, REST, ROUTER, tokenKeyOf, txUrl } from "@/lib/qore/chain";
import { roundGas, useOracleRounds } from "@/lib/qore/oracleHistory";
import { nextSlot } from "@/lib/schedule";
import { SectionHeading } from "./SectionHeading";

const MONO = "var(--font-mono-stack)";
const KEEPER = "qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p";
const FEEDS: [number, string][] = [
  [3, "BTC"],
  [2, "ETH"],
  [4, "QOR"],
  [5, "QWAKK"],
  [1, "USD"],
];

const box: CSSProperties = { border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" };
const row = (first: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "14px 16px",
  borderTop: first ? "none" : "1px solid var(--rule)",
});
const sub: CSSProperties = { fontSize: 12, color: "var(--ink-3)" };
const price = (p: number) => (p < 0.001 ? `$${p.toPrecision(4)}` : p < 1 ? `$${p.toFixed(5)}` : `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecorationColor: "var(--rule)" }}>
    {children}
  </a>
);

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ marginTop: "clamp(28px, 5vh, 44px)" }}>
      <div style={{ marginBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <SectionHeading>{title}</SectionHeading>
        {aside && <span style={sub}>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

const RULES: [string, string, string][] = [
  ["Oracle price round", "Reporter's ML-DSA-87 key", "pqcVerify (0x…0A01) against the key registered on chain (0x…0A02); next round only, newer timestamp, 15% circuit breaker"],
  ["Rebalance", "Curator's ML-DSA-87 key", "Signature over the exact trades, nonce and deadline; reverts if it costs more than 1% of NAV"],
  ["Every admin action", "Admin's ML-DSA-87 key", "Feeds, reporter, curator, reserve, spreads, withdrawals, unpausing: no function trusts msg.sender"],
  ["Your buy and sell", "Your QoreX keys, hybrid", "secp256k1 + ML-DSA-87 on the native lane, carried to the EVM by MsgCrossVMCall"],
  ["Keeper relaying", "Scoped EVM window", "allowed_targets = Darwin's contracts and tokens only"],
  ["Pause new buys", "Guardian (classical key)", "The only classical power; selling always stays open"],
];

export function SecurityTab() {
  const oracle = useOracle();
  const { data: rounds } = useOracleRounds();
  const latestTx = rounds?.[0]?.tx as `0x${string}` | undefined;
  const { data: gas } = useQuery({ queryKey: ["round-gas", latestTx], queryFn: () => roundGas(latestTx!), enabled: Boolean(latestTx) });
  const { data: win } = useQuery({
    queryKey: ["keeper-window"],
    queryFn: async () => (await (await fetch(`${REST}/qorechain/pqc/v1/evm_window/${KEEPER}`)).json()) as any,
    refetchInterval: 60_000,
  });
  const age = oracle ? Math.max(0, Math.floor(Date.now() / 1000) - oracle.lastTimestamp) : null;
  const label = (a: string) => {
    const l = a.toLowerCase();
    if (l === ORACLE.toLowerCase()) return "DarwinOracle";
    if (l === RESERVE.toLowerCase()) return "DarwinReserve";
    if (l === ROUTER.toLowerCase()) return "DarwinRouter";
    const b = Object.values(D.baskets).find((x) => x.address.toLowerCase() === l);
    if (b) return `${b.name} (${b.display})`;
    const t = tokenKeyOf(a);
    return t !== a ? t : short(a);
  };

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "clamp(28px, 5vh, 56px) clamp(20px, 4vw, 40px)" }}>
      <SectionHeading as="h1">Security</SectionHeading>
      <p style={{ margin: "10px 0 0", maxWidth: 720, fontSize: 15, lineHeight: 1.55, color: "var(--ink-2)" }}>
        On Q-Day a quantum computer can derive a secp256k1 key from its public key. Darwin is built so that this alone changes
        nothing: prices, rebalances and admin powers need an ML-DSA-87 (FIPS 204) signature checked on chain, and your trades are
        signed twice by QoreX.
      </p>

      <Section
        title="Post-quantum oracle"
        aside={oracle ? `Round ${oracle.round} · ${age! < 90 ? `${age}s` : `${Math.round(age! / 60)} min`} ago · max age ${oracle.maxAge / 60} min` : "…"}
      >
        <div className="pf-logos" style={box}>
          {FEEDS.map(([id, sym], i) => {
            const f = oracle?.feeds.find((x) => x.feed === id);
            return (
              <div key={id} style={row(i === 0)}>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <StockLogo sym={sym} size={28} />
                  <span>
                    <div style={{ fontWeight: 600 }}>{sym}/USD</div>
                    <div style={sub}>Feed {id}</div>
                  </span>
                </span>
                <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{f ? price(f.price) : "—"}</span>
              </div>
            );
          })}
        </div>
        <p style={{ ...sub, marginTop: 10, lineHeight: 1.5 }}>
          Every round carries a 4,627-byte ML-DSA-87 signature of the reporter{" "}
          <A href={addressUrl(D.roles.reporter)}>{short(D.roles.reporter)}</A>, verified by pqcVerify before a single price is
          stored.{gas ? ` The latest round: ${gas.calldataBytes.toLocaleString()} bytes, ${gas.gasUsed.toLocaleString()} gas.` : ""}
        </p>
      </Section>

      <Section title="Recent rounds" aside="last ~3 hours">
        <div style={box}>
          {(rounds ?? []).slice(0, 8).map((r, i) => (
            <A key={r.round} href={txUrl(r.tx)}>
              <div style={row(i === 0)}>
                <span style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span style={{ fontWeight: 600 }}>#{r.round}</span>
                  <span style={sub}>{new Date(r.timestamp * 1000).toLocaleTimeString()}</span>
                </span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                  BTC {r.prices[3] ? price(r.prices[3]) : "—"} · ETH {r.prices[2] ? price(r.prices[2]) : "—"} · QOR {r.prices[4] ? price(r.prices[4]) : "—"}
                </span>
              </div>
            </A>
          ))}
          {!rounds?.length && <div style={{ ...row(true), ...sub }}>Reading rounds…</div>}
        </div>
      </Section>

      <Section title="Who can do what" aside={`Rebalance: every Monday 12:00 UTC, next ${nextSlot(new Date(), "weekly").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}`}>
        <div style={box}>
          {RULES.map(([what, who, how], i) => (
            <div key={what} style={{ ...row(i === 0), alignItems: "flex-start" }}>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{what}</div>
                <div style={{ ...sub, marginTop: 2, lineHeight: 1.45 }}>{how}</div>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", flexShrink: 0, maxWidth: 220 }}>{who}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Keeper's EVM window"
        aside={win?.found ? `${win.remaining_txs}/${win.max_txs} txs, ${win.remaining_blocks} blocks left` : "…"}
      >
        <div style={box}>
          {(win?.allowed_targets ?? []).map((t: string, i: number) => (
            <div key={t} style={row(i === 0)}>
              <span style={{ fontWeight: 600 }}>{label(t)}</span>
              <A href={addressUrl(t)}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-3)" }}>{t}</span>
              </A>
            </div>
          ))}
          {!win?.found && <div style={{ ...row(true), ...sub }}>Reading the window…</div>}
        </div>
        <p style={{ ...sub, marginTop: 10 }}>
          Opening it took a hybrid ML-DSA-87 signature; a leaked secp256k1 key of the keeper can reach only these addresses.
        </p>
      </Section>

      <Section title="Contracts" aside="qorechain-diana, EVM chain 9800">
        <div style={box}>
          {[
            ["DarwinOracle", ORACLE],
            ["DarwinReserve", RESERVE],
            ["DarwinRouter", ROUTER],
            ...Object.values(D.baskets).map((b) => [`${b.name} (${b.display})`, b.address]),
            ["Reporter", D.roles.reporter],
            ["Curator", D.roles.curator],
            ["Admin", D.roles.admin],
          ].map(([n, a], i) => (
            <div key={a} style={row(i === 0)}>
              <span style={{ fontWeight: 600 }}>{n}</span>
              <A href={addressUrl(a)}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-3)" }}>{a}</span>
              </A>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
