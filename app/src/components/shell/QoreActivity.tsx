"use client";

/**
 * Activity, as on the mainnet front: the account's buys and sells, newest first, with a segmented
 * All / Buys / Sells filter. Read from the chain (the native txs the account signed in QoreX).
 */
import { useState } from "react";
import { basketTicker } from "@/lib/baskets";
import { txUrl } from "@/lib/qore/chain";
import { useTradeHistory, type TradeEntry } from "@/lib/qore/history";
import { SectionHeading } from "./SectionHeading";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One buy/sell row, shared by the Baskets-tab preview and the Activity tab. */
export function ActivityRow({ h, first }: { h: TradeEntry; first: boolean }) {
  const isBuy = h.kind === "buy";
  return (
    <a
      href={txUrl(h.tx)}
      target="_blank"
      rel="noreferrer"
      title={h.hybrid ? "Signed with secp256k1 and ML-DSA-87, verified by QoreChain" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderTop: first ? "none" : "1px solid var(--rule)",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 6,
            color: isBuy ? "var(--green)" : "var(--orange)",
            background: isBuy ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--orange) 12%, transparent)",
          }}
        >
          {isBuy ? "Buy" : "Sell"}
        </span>
        <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</span>
        <span style={{ fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}>{basketTicker(h.symbol)}</span>
        {h.status !== "done" && <span style={{ fontSize: 12, color: "var(--ink-3)", flexShrink: 0 }}>· Failed</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 14 }}>
          {h.amount} {h.unit}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-3)", minWidth: 62, textAlign: "right" }}>{timeAgo(h.ts)}</span>
      </div>
    </a>
  );
}

/** Recent-activity preview for the Baskets tab: the latest `limit`, with a "See all" row. */
export function TradeHistory({ address, limit, onViewAll }: { address: string | null; limit?: number; onViewAll?: () => void }) {
  const { data: history = [] } = useTradeHistory(address);
  if (!address || history.length === 0) return null;
  const shown = limit != null ? history.slice(0, limit) : history;
  const more = history.length - shown.length;
  return (
    <section style={{ borderTop: "1px solid #e1e0da", marginTop: 64, paddingTop: 28 }}>
      <h2 style={{ fontSize: "clamp(22px, 2.2vw, 26px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 18px" }}>
        Recent activity
      </h2>
      <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
        {shown.map((h, i) => (
          <ActivityRow key={h.tx + i} h={h} first={i === 0} />
        ))}
        {more > 0 && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="activity-more"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 0",
              border: "none",
              borderTop: "1px solid var(--rule)",
              background: "var(--paper-2)",
              cursor: "pointer",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            See all {history.length} trades <span aria-hidden style={{ color: "var(--ink-3)" }}>→</span>
          </button>
        )}
      </div>
    </section>
  );
}

/** Full activity feed for the Activity tab. */
export function ActivityTab({ address }: { address: string | null }) {
  const { data: history = [], isLoading } = useTradeHistory(address);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const shown = filter === "all" ? history : history.filter((h) => h.kind === filter);
  const counts = { all: history.length, buy: history.filter((h) => h.kind === "buy").length, sell: history.filter((h) => h.kind === "sell").length };

  const chip = (key: "all" | "buy" | "sell", text: string) => {
    const active = filter === key;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setFilter(key)}
        style={{
          fontSize: 13,
          fontWeight: 600,
          padding: "6px 16px",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          font: "inherit",
          transition: "background 140ms ease, color 140ms ease",
          background: active ? "var(--paper)" : "transparent",
          color: active ? "var(--ink)" : "var(--ink-3)",
          boxShadow: active ? "0 1px 2px rgba(11, 11, 12, 0.10)" : "none",
        }}
      >
        {text}
        <span style={{ fontFamily: "var(--font-mono-stack)", fontWeight: 500, marginLeft: 6, fontVariantNumeric: "tabular-nums", color: "var(--ink-3)", opacity: active ? 1 : 0.75 }}>
          {counts[key]}
        </span>
      </button>
    );
  };

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "clamp(28px, 5vh, 56px) clamp(20px, 4vw, 40px)" }}>
      <SectionHeading as="h1">Activity</SectionHeading>
      <div style={{ marginTop: 16, display: "inline-flex", background: "var(--paper-2)", borderRadius: 999, padding: 3, gap: 2 }}>
        {chip("all", "All")}
        {chip("buy", "Buys")}
        {chip("sell", "Sells")}
      </div>
      <div style={{ marginTop: 16 }}>
        {isLoading ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-3)" }}>Reading your trades from QoreChain…</p>
        ) : history.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-3)" }}>Your buys and sells will show up here.</p>
        ) : shown.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-3)" }}>No {filter === "buy" ? "buys" : "sells"} yet.</p>
        ) : (
          <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
            {shown.map((h, i) => (
              <ActivityRow key={h.tx + i} h={h} first={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
