"use client";

import { memo, useState, type CSSProperties } from "react";

/** Official coin logos, served locally so nothing depends on a third-party CDN. */
const COIN_ICONS = new Set(["BTC", "ETH", "USDC", "QOR"]);
/** Logos served by their owner. QWAKK's mark is all rights reserved (see its repo's NOTICE.md),
 *  so it is shown from Qwakk's own site rather than copied into this repository. */
const REMOTE_ICONS: Record<string, string> = { QWAKK: "/api/logo/qwakk" };
/** Basket legs are named by what they track; fUSD (the Fest test dollar) shows the dollar mark. */
const ALIAS: Record<string, string> = { USD: "USDC", FUSD: "USDC", FBTC: "BTC", FETH: "ETH", WQOR: "QOR" };
/** PNG unless named here. Vector where we have it: these are drawn as small as 18px and scale up
 *  into the basket headers, and the bitmap XAUT was visibly soft at both ends. SOL is the official
 *  wordless gradient logomark, shipped as a vector so it stays crisp at every bubble size. */
const SVG_ICONS = new Set(["USDC", "QOR"]);

const logoUrl = (raw: string) => {
  const symbol = ALIAS[raw] ?? raw;
  if (REMOTE_ICONS[symbol]) return REMOTE_ICONS[symbol];
  return COIN_ICONS.has(symbol) ? `/logos/crypto/${symbol}.${SVG_ICONS.has(symbol) ? "svg" : "png"}` : "";
};

export const StockLogo = memo(function StockLogo({ sym, size = 22 }: { sym: string; size?: number }) {
  const symbol = sym.trim().toUpperCase();
  const src = logoUrl(symbol);
  const [failed, setFailed] = useState<string | null>(null);
  const style = { width: size, height: size, borderRadius: 999 };

  if (src && failed !== src) {
    return (
      // Loaded eagerly: these sit above the fold (hero chips, tile headers) and weigh a few kB
      // each, so deferring them only made them pop in after everything else had settled.
      // eslint-disable-next-line @next/next/no-img-element -- external logo CDN, fixed tiny sizes
      <img className="slogo" src={src} alt="" width={size} height={size} onError={() => setFailed(src)} style={style} />
    );
  }
  return (
    <span aria-hidden className="slogo slogo-fb" style={{ ...style, fontSize: Math.round(0.4 * size), letterSpacing: "-0.02em" }}>
      {symbol.slice(0, 2)}
    </span>
  );
});

export const LogoStack = memo(function LogoStack({
  legs,
  size = 28,
  max = 4,
}: {
  legs: { symbol: string }[];
  size?: number;
  max?: number;
}) {
  const overlap = Math.round(0.29 * size);
  return (
    <span className="stack" style={{ "--overlap": `${overlap}px` } as CSSProperties} aria-hidden>
      {legs.slice(0, max).map((leg, i) => (
        <StockLogo key={`${leg.symbol}-${i}`} sym={leg.symbol} size={size} />
      ))}
    </span>
  );
});
