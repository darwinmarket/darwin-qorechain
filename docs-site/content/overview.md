# Overview

**One token for a whole portfolio, where every price, every rebalance, every admin action and every trade is authorised by a post-quantum signature.**

Darwin is a basket protocol already live on Miden mainnet. **Darwin on QoreChain** is its post-quantum port, running on the `qorechain-diana` testnet. You pay fUSD and receive one basket token; the basket contract holds the components behind it. You exit by selling the basket token for fUSD.

## The problem

Owning a theme means owning several assets at once. By hand, that is one swap per leg and a rebalance every time the weights drift. A basket protocol solves that, and concentrates the risk in three keys: the one that sets prices, the one that trades the vault, and the one that administers it.

On Q-Day, a quantum computer derives a secp256k1 private key from its public key. Every key of that kind that ever signed on chain becomes a key anyone can use. A basket protocol whose oracle, curator and admin are classical keys can then be repriced, rebalanced into nothing, or drained.

Darwin on QoreChain puts all three behind **ML-DSA-87** (FIPS 204), verified on chain by QoreChain's precompiles against keys registered with proof of possession. No secp256k1 key alone can change a price, a weight, a trade or a parameter, or move the reserve's funds.

## The baskets live today

| Basket | Token | Holds | Target weights |
|---|---|---|---|
| Darwin Blue Chip | **BLUEdw** | fBTC, fETH | 70 / 30 |
| Darwin Balanced | **BALdw** | fBTC, fETH, fUSD | 35 / 35 / 30 |
| Darwin Qore Ecosystem | **QOREdw** | fQOR, fETH, fQWAKK | 60 / 25 / 15 |
| Darwin Degen | **DEGENdw** | fQOR, fQWAKK | 30 / 70 |

fBTC, fETH and fUSD are the fest's test tokens for BTC, ETH and dollars. fQOR and fQWAKK are Darwin's stand-ins for QOR and QWAKK, priced by the same feeds. See [Baskets](/protocol/baskets) and [why stand-ins](/risks#qor-and-qwakk-are-stand-ins).

## Architecture in one picture

<Diagram src="/images/architecture.svg" alt="QoreX signs a trade intent with secp256k1 and ML-DSA-87. Darwin's relayer verifies it against the user's on-chain key and sends an authz MsgExec, admitted by the user's EVM window. Inside, the router takes the fee, buys each component from the reserve at oracle prices and the basket mints shares to the user. The oracle stores only rounds signed by the reporter's ML-DSA-87 key; the curator signs rebalances; the admin signs every admin action." width="900" caption="Every arrow that changes state carries an ML-DSA-87 signature checked on chain or against an on-chain key." />

## The six parts

1. **The basket.** One ERC-20 contract per basket (`DarwinBasket`). It holds its components, mints shares against components in kind, redeems shares into components in kind, and rebalances only with trades the curator signed. See [Baskets](/protocol/baskets).

2. **The reserve.** `DarwinReserve` sells and buys components at the oracle's prices, minus a spread. The EVM cannot call QoreChain's native AMM, so a basket buys from the reserve's inventory instead. See [NAV & Pricing](/protocol/nav).

3. **The router.** `DarwinRouter` turns fUSD into a whole basket in one call (buy), or a whole basket back into fUSD (sell). It holds nothing between transactions and has no admin.

4. **The oracle.** `DarwinOracle` stores prices only from rounds signed by the reporter's ML-DSA-87 key, with a 15% circuit breaker and rounds at least 60 seconds apart. See [Oracle](/chain/oracle).

5. **The relayer.** QoreX, QoreChain's wallet, does not sign cross-VM calls. A QoreX user signs a **trade intent**; Darwin's relayer verifies it and executes it as the user through an expiring authz grant. See [QoreX & the Relayer](/chain/relayer).

6. **Your wallet.** QoreX, with your secp256k1 and ML-DSA-87 keys. Your basket tokens sit on your own account; Darwin has no key that moves them.

## What the chain enforces, and what Darwin's services do

| Property | Enforced by |
|---|---|
| A price is stored only if the reporter's ML-DSA-87 signature over it verifies | `DarwinOracle.submit` through `pqcVerify` (`0x...0A01`) against the key `pqcKeyStatus` (`0x...0A02`) returns |
| A rebalance executes exactly the trades the curator signed, and loses at most 1% of NAV at oracle prices | `DarwinBasket.rebalance` |
| Every admin power (16 functions, including moving the reserve's funds) needs the admin's ML-DSA-87 signature | `PqcAdmin`: no function checks `msg.sender` for admin powers |
| A basket's shares are always backed in kind, and redeeming in kind needs no price, no curator and no admin | `DarwinBasket.redeem` |
| Your trade is the one you signed | The relayer verifies your intent with QoreSign before acting; the router enforces your minimum |
| Keeping prices fresh, executing trades for QoreX users | **Darwin's services.** Operator actions, bounded by the rules above. See [Risks](/risks) |

## What Darwin on QoreChain is not

It is not a mainnet product: the tokens are testnet tokens and have no value. It is also not trustless end to end: a QoreX user's trades go through Darwin's relayer, within limits the user sets and can revoke. [Risks](/risks) says this in full.

## Status

Live on the QoreChain testnet, four baskets, buy and sell from QoreX. Full picture on [Status](/reference/status).
