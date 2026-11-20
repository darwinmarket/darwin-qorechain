# Oracle

`DarwinOracle` stores prices only from rounds signed by the **reporter's ML-DSA-87 key**.

## A round

`submit(timestamp, ids, prices, signature)`:

| Check | Refusal |
|---|---|
| the reporter's signature over `roundMessage(round + 1, timestamp, ids, prices)` verifies with `pqcVerify` against its registered key | `BadPqcSignature` |
| the round is the next one, and newer than the last | `StaleRound` |
| at least 60 seconds after the last round | `TooSoon` |
| not more than 120 seconds in the future | `FutureRound` |
| feed ids strictly increasing: a feed appears at most once | `FeedsNotSorted` |
| no price moves more than 15% from the stored one | `DeviationTooLarge` |

The 60-second spacing and the one-feed-per-round rule mean the 15% breaker bounds how fast a price can move over time, not only within one round. Readers refuse a price older than 30 minutes (`PriceStale`).

The signed message binds the chain id, the oracle's address, the round number, the timestamp, the ids and the prices. Anyone may relay a signed round.

## Inputs

| Feed | Source |
|---|---|
| BTC, ETH | median of four spot APIs |
| QOR | median of CoinGecko, MEXC's last price and MEXC's 5-minute average; two quotes required, else QOR and QWAKK sit out the round |
| QWAKK | median of pool 6's swaps over the last 30 minutes and its current price, in QOR, times QOR (read from the chain each time) |
| USD | 1 |

## When rounds are published

On demand, so nothing is spent while nobody trades:

- **Before a trade.** The relayer publishes a signed round if the last one is more than 20 minutes old (readers refuse prices older than 30).
- **Daily.** A cron at 06:00 UTC publishes one round and renews the relayer account's scoped EVM window.
- **Weekly.** The Monday 12:05 UTC rebalance publishes a fresh round first.

Rounds are at least 60 seconds apart; two callers racing for the same round cannot both land one.

## Changes

The breaker and the staleness limit change only with the admin's ML-DSA-87 signature (`setParams`). On 2026-11-20, round 60 moved QOR from the testnet AMM pools (about 10x above its market) to its market price: the breaker was widened and restored around it by two ML-DSA-87 admin signatures.

## Verify a round yourself

Each round's page in the app rebuilds `roundMessage` from the transaction's calldata and verifies the reporter's 4,627-byte ML-DSA-87 signature in your browser with `@qorechain/pqc`, then checks that the same signature fails for the next round number. See [Verify It Yourself](/security/verify).
