/**
 * What each basket component tracks, for logos and price history. fBTC and fETH are the Fest's
 * test stand-ins for BTC and ETH, so their history is the real coins'; fUSD is the test dollar;
 * QOR has no public market history, so its leg is held flat at the current oracle price.
 */
export const COINS: Record<string, { name: string; yahoo?: string }> = {
  BTC: { name: "Bitcoin", yahoo: "BTC-USD" },
  ETH: { name: "Ether", yahoo: "ETH-USD" },
  USD: { name: "US dollar" },
  QOR: { name: "QoreChain" },
};
