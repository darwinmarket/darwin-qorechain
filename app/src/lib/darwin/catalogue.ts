/**
 * What each basket component tracks, for logos and price history. fBTC and fETH are the Fest's
 * test stand-ins for BTC and ETH, so their history is the real coins' (Yahoo). QOR's is its market
 * history (CoinGecko, MEXC); QWAKK's is replayed swap by swap from its only
 * market, the QWAKK/QOR pool opened on 2026-11-18, times QOR's (served by /api/history).
 */
export const COINS: Record<string, { name: string; yahoo?: string; oracle?: boolean }> = {
  BTC: { name: "Bitcoin", yahoo: "BTC-USD" },
  ETH: { name: "Ether", yahoo: "ETH-USD" },
  USD: { name: "US dollar" },
  QOR: { name: "QoreChain", yahoo: "QOR-USD" },
  QWAKK: { name: "Qwakk", yahoo: "QWAKK-USD" },
};
