"use client";

/**
 * Portfolio, as on the mainnet front: total value, one allocation bar, then Holdings (each basket,
 * and Cash, which is the fUSD the account can spend). Values are at the oracle's prices.
 */
import type { CSSProperties } from "react";
import { LogoStack } from "../darwin/StockLogo";
import { basketTicker } from "@/lib/baskets";
import { useBaskets } from "@/lib/darwin/store";
import type { Basket } from "@/lib/darwin/types";
import { assetColor } from "@/lib/darwin/assetColor";
import { useWallet } from "@/lib/qore/wallet";
import AnimatedButton from "./AnimatedButton";
import { SectionHeading } from "./SectionHeading";

const MONO = "var(--font-mono-stack)";
const LOGO = 36;
const LOGO_LEAD = LOGO + 2 * (LOGO - Math.round(0.29 * LOGO));

const labelStyle: CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)" };

const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const stackLegs = (b: Basket) => [...b.legs].sort((x, y) => (y.targetWeight ?? 0) - (x.targetWeight ?? 0)).map((l) => ({ symbol: l.symbol }));
const basketAccent = (b: Basket) => {
  const dom = [...b.legs].sort((x, y) => (y.targetWeight ?? 0) - (x.targetWeight ?? 0))[0];
  return dom ? assetColor(dom.symbol) : "var(--ink-3)";
};

function Skel({ w, h = 14, radius = 6 }: { w: number | string; h?: number; radius?: number }) {
  return <span className="pf-skel" aria-hidden style={{ width: w, height: h, borderRadius: radius }} />;
}

export function QorePortfolio({ onOpen, onGoBaskets }: { onOpen: (symbol: string) => void; onGoBaskets: () => void }) {
  const { balances } = useWallet();
  const { data: baskets } = useBaskets();
  const loading = !balances || !baskets;
  const cash = balances ? Number(balances.fusdBank + balances.fusdErc20) / 1e6 : 0;
  const held = (baskets ?? []).filter((b) => (balances?.shares[b.symbol] ?? 0n) > 0n);
  const values: Record<string, number> = Object.fromEntries(
    held.map((b) => [b.symbol, (Number(balances!.shares[b.symbol]) / 1e18) * (b.sharePriceUsd ?? 0)]),
  );
  const total = held.reduce((s, b) => s + values[b.symbol], 0) + cash;
  const slices = [
    ...held.map((b) => ({ key: b.symbol, label: b.name, value: values[b.symbol], color: basketAccent(b) })),
    ...(cash > 0 ? [{ key: "cash", label: "Cash", value: cash, color: "var(--green)" }] : []),
  ]
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "clamp(28px, 5vh, 56px) clamp(20px, 4vw, 40px)" }}>
      <div style={{ ...labelStyle, marginBottom: 10 }}>Portfolio value</div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "clamp(36px, 7vw, 52px)",
          fontWeight: 650,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {loading ? <Skel w={190} h={44} radius={10} /> : fmtUsd(total)}
      </div>

      {loading ? (
        <div style={{ marginTop: 24 }}>
          <Skel w="100%" h={14} radius={999} />
        </div>
      ) : (
        total > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", background: "var(--rule-2)", gap: 2 }}>
              {slices.map((sl) => (
                <div key={sl.key} title={`${sl.label}, ${fmtUsd(sl.value)}`} style={{ width: `${(sl.value / total) * 100}%`, background: sl.color }} />
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
              {slices.map((sl) => (
                <LegendDot key={sl.key} color={sl.color} label={sl.label} pct={(sl.value / total) * 100} />
              ))}
            </div>
          </div>
        )
      )}

      <section style={{ marginTop: "clamp(28px, 5vh, 44px)" }}>
        <div style={{ marginBottom: 14 }}>
          <SectionHeading>Holdings</SectionHeading>
        </div>
        {loading ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-3)" }}>Loading your holdings…</p>
        ) : held.length === 0 ? (
          <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
            <CashRow cash={cash} pct={total > 0 ? 100 : null} first />
            <div style={{ borderTop: "1px solid var(--rule)", padding: "22px 20px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)" }}>Pick a basket to get started.</p>
              <span style={{ display: "inline-flex", marginTop: 16 }}>
                <AnimatedButton variant="primary" onClick={onGoBaskets} className="h-11 px-6 text-[15px] font-medium">
                  Explore baskets
                </AnimatedButton>
              </span>
            </div>
          </div>
        ) : (
          <div className="pf-logos" style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
            {[
              ...held.map((b) => ({ kind: "basket" as const, basket: b, value: values[b.symbol] })),
              { kind: "cash" as const, basket: null, value: cash },
            ]
              .sort((a, b) => b.value - a.value)
              .map((row, i) =>
                row.kind === "cash" ? (
                  <CashRow key="cash" cash={cash} pct={total > 0 ? (cash / total) * 100 : null} first={i === 0} />
                ) : (
                  <HoldingRow
                    key={row.basket.symbol}
                    basket={row.basket}
                    shares={Number(balances!.shares[row.basket.symbol]) / 1e18}
                    value={row.value}
                    pct={total > 0 ? (row.value / total) * 100 : null}
                    first={i === 0}
                    onOpen={onOpen}
                  />
                ),
              )}
          </div>
        )}
      </section>
    </main>
  );
}

function CashRow({ cash, pct, first }: { cash: number; pct: number | null; first?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderTop: first ? undefined : "1px solid var(--rule)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <span className="pf-lead" style={{ width: LOGO_LEAD, flex: "none", display: "flex", alignItems: "center" }}>
          <LogoStack legs={[{ symbol: "USDC" }]} size={LOGO} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Cash</div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.04em" }}>fUSD</div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmtUsd(cash)}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{pct != null ? `${pct.toFixed(1)}%` : ""}</div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: MONO, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</span>
    </span>
  );
}

function HoldingRow({
  basket,
  shares,
  value,
  pct,
  first,
  onOpen,
}: {
  basket: Basket;
  shares: number;
  value: number;
  pct: number | null;
  first: boolean;
  onOpen: (symbol: string) => void;
}) {
  return (
    <div
      className="holding-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(basket.symbol)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(basket.symbol);
        }
      }}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderTop: first ? "none" : "1px solid var(--rule)", cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <span className="pf-lead" style={{ width: LOGO_LEAD, flex: "none", display: "flex", alignItems: "center" }}>
          <LogoStack legs={stackLegs(basket)} size={LOGO} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{basket.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{basketTicker(basket.symbol)}</div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmtUsd(value)}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
          {shares.toLocaleString(undefined, { maximumFractionDigits: 6 })} {basketTicker(basket.symbol)}
          {pct != null ? `, ${pct.toFixed(1)}%` : ""}
        </div>
      </div>
    </div>
  );
}
