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

## How a round is sent

Darwin's keeper sends each round from the deployer's account as a `MsgCrossVMCall` (`qorechain.crossvm.v1`) calling `submit`, hybrid-signed with secp256k1 + ML-DSA-87. The chain verifies both layers (`pqc_hybrid_verify status=verified`), and the QoreChain explorer shows the transaction "quantum-safe · verified on-chain". So a round carries two ML-DSA-87 signatures: the reporter's over the prices, checked by `pqcVerify`, and the deployer's over the transaction, checked by the chain. The deployer holds no EVM window, so an ECDSA-only transaction from it is refused.

The call is simulated first (an `eth_estimateGas` from the deployer's 0x address), so a refusal such as `TooSoon` is named before anything is sent. A cross-VM call meters the EVM work at about 2.5x its EVM gas.

A native call leaves no EVM log, so there is no `RoundSubmitted` event to read. Each round carries the memo `darwin round <n>`. The app's Security tab, the oracle history behind the charts and the transaction page decode the `submit` calldata from the committed transaction and take the round number from the memo. Rounds sent before 2026-11-21 on the EVM lane are still read from their logs.

## Inputs

| Feed | Source |
|---|---|
| BTC, ETH | median of four spot APIs |
| QOR | median of CoinGecko, MEXC's last price and MEXC's 5-minute average; two quotes required, else QOR and QWAKK sit out the round |
| QWAKK | median of pool 6's swaps over the last 30 minutes and its current price, in QOR, times QOR (read from the chain each time) |
| USD | 1 |

## When rounds are published

On demand, so nothing is spent while nobody trades:

- **When a visitor finds them stale.** With no trade for 30 minutes the contracts refuse to value a basket (`PriceStale`); the app then asks the server for a round, published only if the last one is over 20 minutes old: at most three an hour, and only while someone is looking.
- **Before a trade.** The relayer publishes a signed round if the last one is more than 20 minutes old (readers refuse prices older than 30).
- **Daily.** A cron at 06:00 UTC publishes one round. It opens no window: every round is a hybrid `MsgCrossVMCall`.
- **Weekly.** The Monday 12:05 UTC rebalance publishes a fresh round first.

Rounds are at least 60 seconds apart; two callers racing for the same round cannot both land one.

## Changes

The breaker and the staleness limit change only with the admin's ML-DSA-87 signature (`setParams`). On 2026-11-20, round 60 moved QOR from the testnet AMM pools (about 10x above its market) to its market price: the breaker was widened and restored around it by two ML-DSA-87 admin signatures.

## Verify a round yourself

Each round's page in the app rebuilds `roundMessage` from the transaction's calldata and the round number in its memo, verifies the reporter's 4,627-byte ML-DSA-87 signature in your browser with `@qorechain/pqc`, then checks that the same signature fails for the next round number, for example "Round #72 signature verified · rejected for round #73". The memo is never trusted alone: a wrong round number would make the signature fail. See [Verify It Yourself](/security/verify).
