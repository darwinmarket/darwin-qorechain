/**
 * Darwin's baskets on QoreChain, with the same API as the mainnet front's lib/baskets: the list,
 * display tickers (BLUEDW on chain, BLUEdw on screen), and the basket-in-the-URL helpers
 * (`/BLUEdw` opens the basket, the root is the grid).
 */
import { D } from "./qore/chain";
import { stripBase, withBase } from "@/lib/base";

export type BasketSymbol = string;

export interface BasketMeta {
  readonly symbol: BasketSymbol; // on-chain symbol, e.g. BLUEDW
  readonly ticker: string; // display ticker, e.g. BLUEdw
  readonly name: string;
  readonly description: string;
  readonly address: string;
  readonly live: boolean;
}

export const BASKETS: readonly BasketMeta[] = Object.entries(D.baskets).map(([symbol, b]) => ({
  symbol,
  ticker: b.display,
  name: b.name.replace(/^Darwin /, ""),
  description: b.description,
  address: b.address,
  live: true,
}));

/**
 * One colour per basket, used wherever baskets sit side by side (the portfolio's allocation bar
 * and legend): orange for Blue Chip (BTC-led), USDC blue for Balanced, QoreChain violet for Qore
 * Ecosystem, QWAKK yellow for Degen. Cash keeps its green.
 */
export const BASKET_COLOR: Record<string, string> = {
  BLUEDW: "#F7931A",
  BALDW: "#2775CA",
  QOREDW: "#9939FF",
  DEGENDW: "#F2B705",
};

/** Darwin's trade fee, taken by the router on every buy and sell. */
export const SKIM_FEE_BPS = 30;

export function isWindingDown(_symbol: string): boolean {
  return false;
}

export function canonicalBasketSymbol(symbol: string): string {
  return basketByUrlKey(symbol)?.symbol ?? symbol;
}

/** The display ticker (BLUEdw) of an on-chain symbol (BLUEDW). */
export function basketTicker(symbol: string): string {
  return basketByUrlKey(symbol)?.ticker ?? symbol;
}

export function basketByUrlKey(key: string | null | undefined): BasketMeta | undefined {
  if (!key) return undefined;
  const k = key.toUpperCase();
  return BASKETS.find((b) => b.symbol === k || b.ticker.toUpperCase() === k);
}

export function basketPath(symbol: string): string {
  return withBase(`/${basketTicker(symbol)}`);
}

export function basketSymbolFromLocation(loc: { pathname: string; search: string }): BasketSymbol | null {
  try {
    const seg = decodeURIComponent(stripBase(loc.pathname).replace(/^\/+|\/+$/g, ""));
    const fromPath = seg && !seg.includes("/") ? basketByUrlKey(seg) : undefined;
    if (fromPath) return fromPath.symbol;
    return basketByUrlKey(new URLSearchParams(loc.search).get("b"))?.symbol ?? null;
  } catch {
    return null;
  }
}

export function syncBasketUrl(symbol: string | null, replace = false): void {
  const url = new URL(window.location.href);
  const current = basketSymbolFromLocation(url);
  const path = symbol ? basketPath(symbol) : withBase("/");
  if (current === symbol && (symbol === null || url.pathname === path)) return;
  url.searchParams.delete("b");
  url.pathname = path;
  if (replace || current === symbol) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
