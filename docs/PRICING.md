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

## Capacity, and why the QOR baskets hold fQOR and fQWAKK

The reserve sells components at oracle prices, so a basket takes buys up to what the reserve holds
of each component.

**First, the real assets.** Qore Ecosystem and Degen first held WQOR (wrapped native QOR) and real
QWAKK, bought on QoreChain's native AMM:

- `ops/src/source-qor.ts` bought 19,753 QOR on pool 2 (fUSD/QOR) and pool 4 (fBTC/QOR) with 450
  fUSD and 0.02 fBTC, in 75 swaps, each within the AMM's 5% price-impact cap
  (`max_swap_impact_bps`);
- `ops/src/refill.ts qwakk` bought 5.03M QWAKK on pool 6 with 8,000 of it, in four swaps under the
  same cap;
- wrapping 11,700 QOR needed an EVM window with a raised value cap (`WINDOW_MAX_QOR`), replaced by
  the keeper's scoped window right after.

Even so, Qore Ecosystem could take about **$66** a buy and Degen about **$36**. At QOR's market price
a faucet claim (100 QOR) is worth about $0.33, and QWAKK's whole market about $330: holding more
would have meant pumping a community token's only pool, which is also the pool Darwin's oracle reads.

**So the QOR baskets moved to stand-ins, as the fest does for BTC and ETH.** fQOR and fQWAKK
(`contracts/src/DarwinTestToken.sol`) track QOR and QWAKK through the very same oracle feeds (QOR at
its market price, QWAKK from its native pool's 30-minute median); only the admin's ML-DSA-87
signature can mint them. The reserve holds about $270,000 of each (`ops/src/mint-ftokens.ts`): Qore Ecosystem fills about
$45,000 a buy (bounded by its 25% fETH, a faucet token) and Degen about $385,000. The WQOR/QWAKK versions are paused for new buys, and their holders can always redeem in
kind (`basketHistory` in `deployments/diana.json`).

**The native wiring stays.** The oracle still prices QWAKK from pool 6 and the charts replay its
swaps; `source-qor.ts`, `refill.ts` and `amm.ts` still buy on the native AMM (hybrid-signed
`MsgSwapExactIn`, `MsgConvertCoin`/`MsgConvertERC20`), and the reserve still lists WQOR and QWAKK.
The real QOR and QWAKK went back to the public pools (`ops/src/return-to-amm.ts`), so other teams
find them as they were.
