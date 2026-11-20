# NAV & Pricing

## NAV

A basket's NAV is the value of what it holds, at the oracle's prices:

```
NAV = Σ balanceᵢ × priceᵢ          navPerShare = NAV / totalSupply
```

Each basket was seeded at **10 USD per share**. The app shows an **index with base 100 at launch**: `index = navPerShare × 10`.

## Where prices come from

`DarwinOracle` holds five feeds, published in rounds signed by the reporter's ML-DSA-87 key:

| Feed | Source | Tokens priced by it |
|---|---|---|
| USD | 1 | fUSD |
| ETH | median of four spot APIs | fETH |
| BTC | median of four spot APIs | fBTC |
| QOR | median of CoinGecko and MEXC (two of three quotes required) | fQOR, WQOR |
| QWAKK | 30-minute median of its QWAKK/QOR pool on the native AMM, times QOR | fQWAKK, QWAKK |

See [Oracle](/chain/oracle) for the round rules.

## The reserve

The EVM cannot call QoreChain's native AMM, so a basket's components come from `DarwinReserve`, an inventory market maker. It swaps any listed token for any other at the oracle's USD prices, minus a spread (0.30% today). Darwin's own baskets are spread-exempt, for rebalancing. A buy above the reserve's inventory of a component is refused.

## Chart history

The index chart is a backtest at constant weights, not realised performance:

| Leg | History |
|---|---|
| BTC, ETH | market closes |
| QOR | its market history (CoinGecko) |
| QWAKK | replayed swap by swap from its pool, which opened on 2026-11-18; nothing is drawn before |
