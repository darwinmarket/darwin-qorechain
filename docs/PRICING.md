# Prices and price history

What Darwin's oracle publishes, what the charts replay, and why. Checked against the chain and the
public markets on 2026-11-20.

## Live prices (the oracle, ML-DSA-87 signed rounds)

| Feed | Source | Notes |
|---|---|---|
| BTC, ETH | median of 4 spot APIs | fBTC and fETH are the Fest's stand-ins for the real coins |
| USD | 1 | fUSD |
| QOR | median of CoinGecko (`qorechain`) and MEXC (`QORUSDT`) | QOR's only real market is MEXC; ≈ $0.0033 |
| QWAKK | pool 6 (QWAKK/QOR) price in QOR × QOR | pool 6 is QWAKK's only market |

Until round 60 (block 10,428,835), QOR was priced from the testnet AMM pools 2 (fUSD/QOR) and
4 (fBTC/QOR). They disagree with each other ($0.043 vs $0.026) and sat about 10x above the market,
so QOR and QWAKK were overstated about 10x. Round 60 moved both to market: the circuit breaker
(15%) was widened and restored around it by two ML-DSA-87 admin signatures, and the QOR baskets
were redeployed at market prices (QOREDW v4, DEGENDW v2) so their index starts at 100.

## Chart history (a backtest at constant weights)

| Leg | History |
|---|---|
| BTC, ETH | Yahoo closes |
| QOR | CoinGecko market chart (hourly up to 90 days, daily since its listing on 2026-08-29) |
| QWAKK | replayed swap by swap from pool 6, times QOR at the same hour |

QWAKK did not exist before pool 6 opened (2026-11-18 18:36 UTC), so nothing is drawn before then:
a basket holding QWAKK charts hourly from that day, whatever range is selected.

The pool's history is not flat. One wallet bought QWAKK with about 70,500 QOR on 2026-11-19, and
the price went from 0.000100 to 0.001462 QOR per QWAKK (x14.6). The charts show that move. An
earlier version drew QWAKK as today's ratio times QOR's history back to August, which made Degen
and Qore Ecosystem look like the same curve (0.989 correlation of daily returns) and invented
three months of a token that did not trade. Both baskets still move together, because the QWAKK pump
dominates them. The size of the move differs: since the pool opened, Qore Ecosystem (15% QWAKK) is
about +200% and Degen (70% QWAKK) about +950%.

## Capacity

The reserve sells components at oracle prices, so a basket can take buys up to what the reserve
holds of each component. At QOR's market price a faucet claim (100 QOR) is worth about $0.33, so
the QOR baskets are bounded by how much real QOR and QWAKK exists to buy on the testnet:

- **QOR** was bought on the native AMM with the reserve's spare Fest tokens (`ops/src/source-qor.ts`):
  450 fUSD on pool 2 and 0.02 fBTC on pool 4 gave 19,753 QOR, in 75 swaps, each within the AMM's 5%
  price-impact cap (`max_swap_impact_bps`).
- **QWAKK** was bought with 8,000 of that QOR on pool 6 (5.03M QWAKK), in four swaps under the same cap.
  QWAKK's whole market holds about 69M QWAKK, roughly $330: a QWAKK basket cannot hold thousands
  of dollars of real QWAKK.
- Wrapping 11,700 QOR into WQOR needed an EVM window with a raised value cap (`WINDOW_MAX_QOR`), opened
  by an ML-DSA-87 signed transaction and replaced by the keeper's scoped window right after.

Result (2026-11-20): Qore Ecosystem fills about **$66**, Degen about **$36-40**; Blue Chip and
Balanced fill tens of thousands. The trade card states the capacity before signing, its quick
amounts stay within it, and the battery's users sell their QOR-basket shares at the end so tests
do not keep the scarce inventory.
