/**
 * What each basket component tracks, for logos and price history. fBTC and fETH are the Fest's
 * test stand-ins for BTC and ETH, so their history is the real coins'. QOR and QWAKK have no public
 * market history: a basket holding them is drawn from Darwin's own oracle rounds (every point an
 * ML-DSA-87 signed price), which cover every leg since launch.
 */
export const COINS: Record<string, { name: string; yahoo?: string; oracle?: boolean }> = {
  BTC: { name: "Bitcoin", yahoo: "BTC-USD" },
  ETH: { name: "Ether", yahoo: "ETH-USD" },
  USD: { name: "US dollar", oracle: true },
  QOR: { name: "QoreChain", oracle: true },
  QWAKK: { name: "Qwakk", oracle: true },
};
