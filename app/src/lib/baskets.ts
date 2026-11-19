import { D } from "./qore/chain";

/** Screens show a basket by its display ticker (BLUEdw); the on-chain symbol is BLUEDW. */
export function basketTicker(symbol: string): string {
  const key = symbol.toUpperCase();
  return D.baskets[key]?.display ?? symbol;
}

/** Resolve a URL segment (/BLUEdw, /bluedw, /BLUEDW) to the on-chain symbol. */
export function canonicalBasketSymbol(s: string): string | null {
  const key = s.toUpperCase();
  return D.baskets[key] ? key : null;
}
