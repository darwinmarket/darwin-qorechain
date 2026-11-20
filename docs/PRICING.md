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

The reserve sells components at oracle prices. At QOR's market price, a faucet claim of 100 QOR is
worth about $0.33, so the QOR baskets can fill only cents until the reserve holds much more QOR
and QWAKK (`ops/src/refill.ts qor|qwakk`). The trade card states the vault's capacity before
signing, and the browser suite sizes its QOR-basket buys to it.
