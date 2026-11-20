"""Writes the QoreChain documentation pages (content/*.md). Run once; the pages are then edited by hand."""
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "content")

PAGES = {}

PAGES["overview.md"] = """# Overview

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
"""

PAGES["how-it-works.md"] = """# How a Trade Works

A Darwin trade from QoreX is **one signature**: you sign a trade intent, and Darwin's relayer executes it as you. Before the first trade there is a one-time setup, two approvals in QoreX. Developer detail is on [Buying](/protocol/buy) and [Selling](/protocol/sell).

## Why a relayer

QoreX shows its user every message it signs, decoded, and **refuses what it cannot display**. Darwin established, message type by message type, what the extension accepts today:

| Message | QoreX |
|---|---|
| Bank send (`MsgSend`) | shown and signed |
| Authz grant (`MsgGrant`) | shown and signed, with its expiry |
| CosmWasm call (`MsgExecuteContract`) | shown and signed |
| Message signature (`signArbitrary`) | shown and signed |
| Cross-VM call (`MsgCrossVMCall`) | **refused** |
| ERC-20 conversions (`MsgConvertCoin`, `MsgConvertERC20`) | **refused** |

Darwin's baskets are EVM contracts, reached from the native lane by a cross-VM call. So a QoreX user cannot send the trade transaction itself. The relayer sends it for the user, under rules the user signs. See [QoreX & the Relayer](/chain/relayer).

## Setup, once

1. **Open an EVM access window in QoreX.** A hybrid-signed `MsgOpenEVMWindow`, bounded by a transaction count, a value and an expiry. The chain admits an EVM call made on your account's behalf only while it is open.
2. **Authorize Darwin's relayer for 24 hours.** The app asks QoreX to sign two authz grants to the relayer: one for `MsgCrossVMCall`, one for `MsgConvertCoin`. QoreX shows both, decoded, with their expiry.

## Buying, step by step

<Diagram src="/images/buy-flow.svg" alt="Four steps. One: you sign a trade intent in QoreX with secp256k1 and ML-DSA-87. Two: the relayer verifies the signature against your registered ML-DSA-87 key, the intent's fields, expiry and nonce. Three: the relayer sends an authz MsgExec; the chain admits it through your EVM window; the router takes the fee, buys each component from the reserve at oracle prices and the basket mints shares to you. Four: the shares are on your account." width="900" caption="Step 1 is your only signature. Step 3 is executed by the chain as you, inside your grant and your window." />

### 1. You sign the intent

The app builds a short JSON intent and QoreX signs it with `signArbitrary`: an ADR-36 secp256k1 signature and an ML-DSA-87 signature over those exact bytes.

```json
{"darwin":"trade-v1","chainId":"qorechain-diana","account":"qor1...","action":"buy",
 "basket":"0x...","amount":"10000000","min":"...","nonce":"...","expires":1795189430}
```

`amount` is the fUSD you spend (6 decimals), `min` the fewest shares you accept, `expires` at most 10 minutes ahead.

### 2. The relayer verifies it

The relayer (`ops/src/relayer.ts`) checks the signature with QoreSign's `verifyMessageWithChain` against the ML-DSA-87 key your account registered on chain, then the fields: chain id, a Darwin basket, amounts, expiry, and a nonce never used before. It refuses a replay and a tampered intent.

### 3. The chain executes it as you

The relayer sends one hybrid-signed transaction: an authz `MsgExec` carrying, as needed,

- `MsgConvertCoin`: your faucet fUSD (bank form) to its ERC-20 form on your account's 0x twin;
- `MsgCrossVMCall` to fUSD: approve the router;
- `MsgCrossVMCall` to the router: `buy(basket, amount, min, you)`.

You are the sender of every inner message. The chain admits the EVM calls only through your own EVM window, and records it (`pqc_evm_window_used`). The router takes the 0.30% fee, buys each component from the reserve at oracle prices, and the basket mints the shares to you. The relayer pays the gas.

### 4. The shares are yours

They are an ERC-20 balance on your account's 0x twin. Darwin has no key that moves them.

## Selling

Same shape: one intent with `"action":"sell"`, `amount` in shares and `min` in fUSD.

<Diagram src="/images/sell-flow.svg" alt="Four steps. One: you sign a sell intent in QoreX. Two: the relayer verifies it. Three: the relayer's MsgExec approves the router if needed and calls sell; the router redeems your shares in kind, sells each component to the reserve at oracle prices and keeps the fee. Four: fUSD lands on your account." width="900" caption="Selling stays open when buying is paused." />

## What each actor can and cannot do

| Actor | Can | Cannot |
|---|---|---|
| You | Sign intents, hold, move or redeem your shares, revoke the grant | Mint shares without paying for the components |
| The relayer | Send `MsgCrossVMCall` and `MsgConvertCoin` as you, while your grant and window last | Act after the grant expires or is revoked; get the chain to admit an EVM call without your window; make the router accept less than your minimum |
| The reporter (oracle key) | Sign price rounds | Move a price more than 15% in one round, or publish rounds less than 60 s apart |
| The curator | Sign target weights and rebalance trades | Trade components that are not in the basket; lose more than 1% of NAV in a rebalance |
| The admin | Sign the 16 admin actions | Act with a secp256k1 key alone |
| The guardian | Pause new mints | Unpause, rebalance, or block selling and redeeming |

## Where the trust sits

Stated plainly.

- **The relayer, within your grant.** For 24 hours the relayer may send cross-VM calls and ERC-20 conversions as you. It acts only on intents you signed, but the grant itself is generic for those two message types. It is bounded by its expiry, by your EVM window, and by your ability to revoke it.
- **The oracle's inputs.** Signatures prove who published a price, not that the price is right. QOR comes from its market (CoinGecko and MEXC), QWAKK from its only pool. See [Oracle](/chain/oracle).

[Risks](/risks) covers the rest.
"""

PAGES["quickstart.md"] = """# Quickstart

Darwin on QoreChain runs on the **`qorechain-diana` testnet** at [darwin.market/qorechain](https://darwin.market/qorechain). The tokens are test tokens and have no value.

## 1. Install QoreX

Install the [QoreX](https://docs.qorechain.io/qorex/browser-extension) browser extension, create or import a wallet, and switch it to **Testnet**. Press *Connect wallet* in the app.

Connecting gives Darwin nothing: the account is yours, and every approval happens in QoreX. QoreX registers your ML-DSA-87 key with your first transaction.

## 2. Get test tokens

Claim the faucet on the [QoreChain dashboard](https://dashboard.qorechain.io/faucet). A claim pays QOR (for fees), fUSD, fETH and fBTC. Darwin needs **fUSD** to buy; the faucet pays it in bank form, and the relayer converts what a trade needs.

## 3. Open an EVM access window

In the QoreX extension, open an **EVM access window**. Darwin's baskets are EVM contracts; the chain lets them be called on your account's behalf only while your window is open. The app shows this step until it sees an open window.

## 4. Authorize Darwin's relayer

Press *Authorize Darwin's relayer (24 h)* in the trade card. QoreX shows two authz grants, for `MsgCrossVMCall` and `MsgConvertCoin`, with their expiry. Approve.

## 5. Buy

Open a basket, enter an amount of fUSD, and press *Buy*. QoreX shows the trade intent as text (action, basket, amount, minimum, expiry): approve it. The relayer verifies it and executes it; the trade card shows the progress and a link to the transaction. The relayer pays the gas.

The trade card shows what the vault can fill right now; quick amounts stay within it.

## 6. Read your position

The portfolio reads your basket balances from your account and prices them at each basket's live NAV, next to your fUSD.

## 7. Sell

Switch the card to *Sell*, enter an amount of the basket token, approve the intent. fUSD lands on your account. Selling stays open when buying is paused.

## If QoreX is locked

The app asks QoreX to connect, which opens it for you to unlock, then sends the same request again.

## Troubleshooting

| Message | Meaning |
|---|---|
| *Open an EVM window in QoreX* | Your window is closed or expired: open a new one in QoreX |
| *Authorize Darwin's relayer (24 h)* | Your grant expired or was revoked: approve it again |
| *Above available liquidity* | The vault holds less of a component than this buy needs |
| *Relayer offline* | Darwin's relayer is not reachable; selling and redeeming in kind do not depend on it on chain |
"""

PAGES["faq.md"] = """# FAQ

### Is this mainnet?

No. Darwin on QoreChain runs on the `qorechain-diana` testnet, with test tokens that have no value. Darwin's mainnet product runs on Miden. See [Status](/reference/status).

### Why one signature per trade, plus a setup?

QoreX refuses to sign cross-VM calls and ERC-20 conversions, the messages Darwin's trades are made of. It does sign authz grants and message signatures. So you grant Darwin's relayer the right to send those two message types as you for 24 hours, inside your own EVM window, and each trade is an intent you sign. See [QoreX & the Relayer](/chain/relayer).

### Who pays the gas?

Darwin's relayer pays for the trades it executes. You pay for your own setup transactions (the EVM window and the grant).

### Can Darwin take my basket tokens?

Darwin has no key that moves them. During your grant, the relayer can send cross-VM calls as you; it acts only on intents you signed, and you can revoke the grant at any time. See [Risks](/risks).

### What happens if Darwin's services stop?

Your basket tokens stay on your account. The basket's `redeem` is permissionless and needs no price, no curator and no admin: any holder can call it and receive their share of each component. Selling through the router needs fresh oracle prices; redeeming in kind does not.

### Are the prices real?

BTC and ETH are medians of four spot APIs. QOR is its market price (median of CoinGecko and MEXC). QWAKK is priced from its only market, the QWAKK/QOR pool of QoreChain's native AMM, as a 30-minute median times QOR's price. Every round is signed with ML-DSA-87. See [Oracle](/chain/oracle).

### Why do the QOR baskets hold fQOR and fQWAKK?

At QOR's market price, a faucet claim is worth about $0.33, and QWAKK's whole market about $330. Holding the real tokens capped Qore Ecosystem at about $66 a buy and Degen at about $36. The stand-ins track the same prices and let the baskets take real-size trades. See [Risks](/risks#qor-and-qwakk-are-stand-ins).

### Can I verify the signatures myself?

Yes. Each transaction page in the app re-verifies the signatures in your browser: a trade's hybrid signature with QoreSign, and an oracle round's ML-DSA-87 signature with `@qorechain/pqc`, rebuilding the exact message the oracle checks. See [Verify It Yourself](/security/verify).

### When do baskets rebalance?

Once a week, Mondays at 12:00 UTC, with trades the curator signs with ML-DSA-87. There is no drift-triggered rebalance in between. See [Rebalancing](/protocol/rebalancing).
"""

PAGES["risks.md"] = """# Risks

Darwin on QoreChain is a testnet deployment. This page lists what can go wrong and what bounds it.

## Testnet

The tokens have no value and the network is a testnet: it can be reset, upgraded or paused by its operators. Nothing here is an offer of a financial product.

## The relayer

A QoreX user trades through Darwin's relayer (see [QoreX & the Relayer](/chain/relayer)).

- **What it can do.** For the 24 hours of the grant, send `MsgCrossVMCall` and `MsgConvertCoin` as the user. The grant is generic for those two types: technically, the relayer could call any EVM contract as the user while it lasts.
- **What bounds it.** It acts only on intents whose secp256k1 and ML-DSA-87 signatures verify against the user's on-chain key, each used once and expiring within 10 minutes. The chain admits its EVM calls only through the user's own EVM window (transaction count, value, expiry). The grant expires on its own and can be revoked. Every action is a public `MsgExec` naming the user as sender.
- **If it stops.** Trades from QoreX stop. Holdings do not: redeeming in kind is permissionless.

## The oracle

A signature proves who published a price, not that it is right.

- **Inputs.** BTC and ETH: median of four spot APIs. QOR: median of CoinGecko and MEXC (its only real market is MEXC); without two of its three quotes, QOR and QWAKK sit out the round. QWAKK: its only market is a thin pool, so the oracle uses that pool's 30-minute median, not its spot.
- **Bounds.** A round can move a price at most 15%; rounds are at least 60 seconds apart; a feed appears at most once per round; readers refuse prices older than 30 minutes.
- **If rounds stop.** Buying and selling through the router stop once prices are stale. Redeeming in kind does not need a price.

## The reserve

The reserve trades at the oracle's price with a 0.30% spread. It holds a finite inventory: a buy above what it holds of a component is refused before signing. Arbitrage around price updates is possible within that spread; on testnet this is accepted.

## QOR and QWAKK are stand-ins

Qore Ecosystem and Degen first held WQOR (wrapped native QOR) and real QWAKK, bought on QoreChain's native AMM in swaps under its 5% price-impact cap. At QOR's market price a faucet claim is worth about $0.33 and QWAKK's whole market about $330, which capped those baskets at about $66 and $36 a buy. Holding more would have meant pumping a community token's only pool, which is also the pool the oracle reads.

So they hold **fQOR and fQWAKK**: Darwin test tokens priced by the same QOR and QWAKK feeds, minted only by the admin's ML-DSA-87 signature. The real QOR and QWAKK went back to the public pools. Their earlier versions are paused for new buys; their holders can always redeem in kind.

## Keys

The deployer's secp256k1 key relays transactions and holds the guardian role, which can only pause new mints. It cannot change a price, a weight, a trade or a parameter, or move the reserve's funds. Each EVM window also caps the value it admits.

## Known limitations

See [Known Limitations](/security/limitations) for what the review of 2026-11-20 found and what changed.
"""

PAGES["protocol/baskets.md"] = """# Baskets

A basket is one `DarwinBasket` contract: an ERC-20 share token that holds its components. Its components are fixed at deployment; its target weights change only with the curator's ML-DSA-87 signature.

## Live baskets

| Basket | Token (on chain) | Components | Target weights | Contract |
|---|---|---|---|---|
| Darwin Blue Chip | BLUEdw (`BLUEDW`) | fBTC, fETH | 70 / 30 | `0xc35a0eb298693a011d26132eb7f4b8aca8112f92` |
| Darwin Balanced | BALdw (`BALDW`) | fBTC, fETH, fUSD | 35 / 35 / 30 | `0xfe862c4947626bc9c86bcee12d82153f8286df9a` |
| Darwin Qore Ecosystem | QOREdw (`QOREDW`) | fQOR, fETH, fQWAKK | 60 / 25 / 15 | `0x86514e17c50265c9ea90d2001bd879b6b724e575` |
| Darwin Degen | DEGENdw (`DEGENDW`) | fQOR, fQWAKK | 30 / 70 | `0x112d76f9bd9e421228f4b326d13e2ea160e92b74` |

All four run on the **v2 stack** (oracle, reserve, router and baskets redeployed on 2026-11-20 with the contracts fixed by Darwin's review). Every seed was minted to `0x...dEaD`, so no classical key holds basket shares. Earlier versions are listed in `deployments/diana.json` (`basketHistory`, `stackHistory`): their minting is paused, and their holders can always redeem in kind.

## What a basket does

| Function | Who | What |
|---|---|---|
| `mint(shares, to)` | anyone | deposits the components for `shares` in kind (`mintAmounts`) and mints them |
| `redeem(shares, to)` | any holder | burns shares and pays the holder's share of every component. No price, no curator, no admin; never paused |
| `rebalance(trades, deadline, sig)` | anyone relaying the curator's signature | swaps components with the reserve, exactly as signed |
| `setTargetWeights(weights, deadline, sig)` | anyone relaying the curator's signature | changes the targets |
| `pauseMint()` | guardian | stops new mints; selling and redeeming stay open |
| `seed(...)` | seeder, once | the first mint; a basket cannot be seeded twice |

Most users never call these directly: the router buys and sells a whole basket for fUSD. See [Buying](/protocol/buy) and [Selling](/protocol/sell).

## Why fQOR and fQWAKK

See [Risks](/risks#qor-and-qwakk-are-stand-ins).
"""

PAGES["protocol/nav.md"] = """# NAV & Pricing

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
"""

PAGES["protocol/buy.md"] = """# Buying

<Diagram src="/images/buy-flow.svg" alt="The four steps of a buy: you sign an intent, the relayer verifies it, the chain executes it as you, the shares are yours." width="900" caption="Step 1 is your only signature." />

## The router call

`DarwinRouter.buy(basket, usdIn, minShares, to)`:

1. takes `usdIn` fUSD from the caller and keeps the fee (0.30%) for Darwin's fee recipient;
2. sizes the shares with `quoteBuy`, which checks the exact cost of the quoted shares with a 0.2% headroom so rounding never makes the buy revert;
3. buys each component from the reserve at oracle prices (`swapExactOut`);
4. mints the shares to `to` and refunds the fUSD not spent;
5. reverts if fewer than `minShares` would be minted.

The router holds nothing between transactions.

## From QoreX

The trade is an intent signed with QoreX's `signArbitrary`, executed by Darwin's relayer as an authz `MsgExec`:

| Inner message | When |
|---|---|
| `MsgConvertCoin` | your ERC-20 fUSD is short of `usdIn`: the faucet's bank-form fUSD is converted |
| `MsgCrossVMCall` → fUSD `approve(router)` | the router's allowance is short |
| `MsgCrossVMCall` → router `buy(...)` | always |

See [How a Trade Works](/how-it-works).

## Limits

| Limit | Value |
|---|---|
| Per buy | what the reserve holds of each component (the trade card shows it) |
| Minimum | none in the contract; the fee is rounded down |
| Paused baskets | buying is refused (`MintIsPaused`); selling is not |
"""

PAGES["protocol/sell.md"] = """# Selling

<Diagram src="/images/sell-flow.svg" alt="The four steps of a sell: you sign an intent, the relayer verifies it, the router redeems in kind and sells the components to the reserve, fUSD is yours." width="900" caption="Selling stays open when buying is paused." />

## The router call

`DarwinRouter.sell(basket, shares, minUsdOut, to)`:

1. takes the shares from the caller (it needs an allowance);
2. redeems them in kind: the basket pays `shares × balanceᵢ / supply` of each component;
3. sells each component to the reserve at oracle prices;
4. keeps the fee (0.30%) and pays the rest in fUSD to `to`;
5. reverts if less than `minUsdOut` would be paid.

## Redeeming in kind, without the router

`DarwinBasket.redeem(shares, to)` pays the holder's share of every component directly. It needs no oracle, no curator, no admin and no relayer, and it cannot be paused. The app does not offer it as a button; the contract allows it for anyone.
"""

PAGES["protocol/fees.md"] = """# Fees & Treasury

| Fee | Rate | Where |
|---|---|---|
| Darwin's trade fee | 0.30% of a buy's fUSD in, or of a sell's fUSD out | `DarwinRouter.feeBps`, paid to the fee recipient |
| Reserve spread | 0.30% on each component the router buys from or sells to the reserve | `DarwinReserve.spreadBps`; changed only by an ML-DSA-87 admin signature |
| Rebalances | no spread: the baskets are spread-exempt | `DarwinReserve.spreadExempt` |
| Gas for trades from QoreX | paid by Darwin's relayer | the relayer's account |

The fee recipient is Darwin's admin account (`0x20807accBc9693B40a17F2EC73a07e6dc77d3f85`).

The reserve's inventory is managed by Darwin: `ops/src/refill.ts` wraps QOR or sends tokens, `ops/src/mint-ftokens.ts` mints fQOR and fQWAKK (each mint an ML-DSA-87 admin signature), and every withdrawal needs the admin's ML-DSA-87 signature.
"""

PAGES["protocol/rebalancing.md"] = """# Rebalancing

Prices move, and a basket's actual weights drift from its targets. Darwin rebalances **once a week, Mondays at 12:00 UTC**. There is no drift-triggered rebalance in between.

## How it works

1. The curator's planner (`ops/src/lib/planner.ts`) reads the basket's composition and the oracle's prices and plans the trades that bring the weights back to target.
2. The curator signs the exact trades, a nonce and a deadline with its ML-DSA-87 key (`rebalanceMessage`).
3. Anyone relays them: `DarwinBasket.rebalance(trades, deadline, signature)` checks the signature against the curator's registered key, swaps with the reserve, and reverts if the basket's NAV at oracle prices drops more than 1% (`maxRebalanceLossBps`).

## What the curator cannot do

| Attempt | Result |
|---|---|
| Trade a token that is not a component | `NotComponent` |
| Lose more than 1% of NAV | `RebalanceTooCostly` |
| Reuse a signature, or sign other trades | the nonce and the exact trades are in the signed message |
| Sign with another key | `BadPqcSignature` |

Target weights change the same way (`setTargetWeights`, curator-signed).
"""

PAGES["chain/why.md"] = """# Why QoreChain

QoreChain is a chain whose transactions are **hybrid-signed**: every native transaction carries a secp256k1 signature and an ML-DSA-87 signature, and the network requires both. It exposes ML-DSA-87 to EVM contracts through two precompiles:

| Precompile | Address | What it does |
|---|---|---|
| `pqcVerify(pubkey, signature, message)` | `0x...0A01` | verifies an ML-DSA-87 signature (2,592-byte key, 4,627-byte signature) |
| `pqcKeyStatus(account)` | `0x...0A02` | the ML-DSA-87 key an account registered, its algorithm and whether it proved possession |

That is what lets Darwin put its three dangerous keys (prices, rebalances, admin) behind ML-DSA-87 **inside its contracts**, not only at the transaction layer.

## What Darwin uses

| Feature | Where in Darwin |
|---|---|
| Hybrid ML-DSA-87 transactions | every transaction: user setup, the relayer's `MsgExec`, the keeper's rounds |
| PQC key registration with proof of possession | every role (deployer, reporter, curator, relayer) |
| ML-DSA-87 message signatures | every trade intent (QoreX `signArbitrary`) |
| EVM windows, scoped and per user | the keeper's window scoped to Darwin's contracts; each user's own window admits relayed trades |
| `pqcVerify`, `pqcKeyStatus` in Solidity | `PqcAuth`, the single call site |
| Authz grants | users to the relayer, 24 hours |
| Cross-VM calls (native to EVM) | every trade |
| Fest tokens fUSD, fETH, fBTC | three of the baskets' components and the quote asset |
| Native AMM pools | QWAKK's price (pool 6); the reserve's first QOR and QWAKK |

## What it looked like on mainnet

Darwin's mainnet product on Miden relies on private notes. QoreChain's angle is different: the threat is a future quantum computer, and the answer is post-quantum signatures checked by the chain itself.
"""

PAGES["chain/hybrid-signing.md"] = """# Hybrid Signing & Keys

## Two signatures on every transaction

A QoreChain native transaction carries a secp256k1 signature and an ML-DSA-87 signature (FIPS 204) in a tx-body extension. The network requires the ML-DSA-87 layer. The chain records the check as `pqc_hybrid_verify status=verified`.

## Registering a key

An account registers its ML-DSA-87 public key with `MsgRegisterPQCKey`, with a **proof of possession**. It is the one transaction allowed without the ML-DSA-87 layer. QoreX does this on its own with the account's first transaction; Darwin's roles were registered by `ops/src/window.ts register`.

The key is derived from the account's mnemonic and address, so it needs no separate backup.

## Darwin's roles

| Role | Address | Key |
|---|---|---|
| Admin, guardian, fee recipient, keeper relayer | `0x20807accBc9693B40a17F2EC73a07e6dc77d3f85` | eth_secp256k1 + ML-DSA-87 |
| Oracle reporter | `0x6A286f3D805c2bE0d653Ec86c1CaD9598373CB2e` | ML-DSA-87 signs rounds |
| Curator | `0xe0BBCcb71b761041B3f3038b3E6cdb392CfbE373` | ML-DSA-87 signs weights and rebalances |
| Trade relayer | `qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf` | secp256k1 + ML-DSA-87, sends users' `MsgExec` |

All registered with proof of possession; `PqcAuth` refuses a key without it, and refuses a key whose algorithm is not ML-DSA-87 (algorithm id 1).

## Inside the contracts

`PqcAuth.requireSigned(account, message, signature)` reads the account's key with `pqcKeyStatus`, refuses an unregistered key, a key without proof of possession or a key of another algorithm, then checks the signature with `pqcVerify`. Every privileged path in Darwin goes through it. See [Every Privileged Action](/security/model).

Signatures are domain-separated (tag, chain id, contract, nonce, deadline), and each contract exposes the exact bytes to sign (`roundMessage`, `rebalanceMessage`, `weightsMessage`, `adminMessage`), so off-chain signers never re-implement the encoding.
"""

PAGES["chain/evm-windows.md"] = """# EVM Windows

On QoreChain an EVM transaction is admitted only while the sending account has an open **EVM authorisation window**: a hybrid-signed `MsgOpenEVMWindow`, bounded by

| Bound | Meaning |
|---|---|
| blocks | the window closes after this many blocks |
| transactions | at most this many EVM transactions |
| value | at most this much QOR transferred into the EVM |
| allowed targets (optional) | a **scoped** window admits calls only to these contracts |

A stolen secp256k1 key alone cannot open a window: that needs the account's ML-DSA-87 signature.

## How Darwin uses them

- **The keeper's window is scoped** to Darwin's contracts and tokens (`allowed_targets`). A contract creation is refused in a scoped window, so deployments open an unscoped one, closed again by the keeper's scoped window.
- **The value cap is real.** Each window caps the QOR it admits. Funding the reserve with wrapped QOR needed a window with a raised cap (`WINDOW_MAX_QOR` in `ops/src/window.ts`), replaced by the keeper's scoped window right after.
- **Each user's own window admits relayed trades.** When the relayer executes a trade through an authz grant, the chain checks that the user did not send the call itself and admits it only through **the user's** window. The transaction records `pqc_evm_window_used` with the user's address.

QoreX opens a user's window from its own screen; a website cannot open one for the user.
"""

PAGES["chain/oracle.md"] = """# Oracle

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
| QWAKK | 30-minute median of its pool's price in QOR, times QOR |
| USD | 1 |

## Changes

The breaker and the staleness limit change only with the admin's ML-DSA-87 signature (`setParams`). On 2026-11-20, round 60 moved QOR from the testnet AMM pools (about 10x above its market) to its market price: the breaker was widened and restored around it by two ML-DSA-87 admin signatures.

## Verify a round yourself

Each round's page in the app rebuilds `roundMessage` from the transaction's calldata and verifies the reporter's 4,627-byte ML-DSA-87 signature in your browser with `@qorechain/pqc`, then checks that the same signature fails for the next round number. See [Verify It Yourself](/security/verify).
"""

PAGES["chain/relayer.md"] = """# QoreX & the Relayer

## What QoreX signs

QoreX shows every message it signs, decoded, and refuses what it cannot display. Darwin tested the extension message type by message type, with a diagnostic page that asks it to sign one type at a time:

| Message | Result |
|---|---|
| `cosmos.bank.v1beta1.MsgSend` | signed |
| `cosmos.authz.v1beta1.MsgGrant` | signed, shown with its expiry |
| `cosmwasm.wasm.v1.MsgExecuteContract` | signed |
| `signArbitrary` (message signature) | signed: ADR-36 secp256k1 + ML-DSA-87 |
| `qorechain.crossvm.v1.MsgCrossVMCall` | refused: "QoreX cannot show what ... does" |
| `cosmos.evm.erc20.v1.MsgConvertCoin`, `MsgConvertERC20` | refused |

QoreX does not send EVM transactions either. So a QoreX user cannot send Darwin's trade transaction, which is a cross-VM call into the router. The testnet also has CosmWasm uploads switched off, which rules out a CosmWasm gateway.

## The design

| Step | Who | Signature |
|---|---|---|
| Open an EVM access window | the user, in QoreX | hybrid `MsgOpenEVMWindow` |
| Grant `MsgCrossVMCall` and `MsgConvertCoin` to the relayer for 24 h | the user, in the app | hybrid `MsgGrant`, decoded by QoreX |
| Sign a trade intent | the user, in the app | `signArbitrary`: secp256k1 + ML-DSA-87 |
| Verify it | the relayer | QoreSign `verifyMessageWithChain` against the user's registered key |
| Execute it as the user | the relayer | hybrid `MsgExec`; admitted by the user's EVM window |

## What the relayer checks

`ops/src/relayer.ts`:

- the intent's signature, with `requirePq`, against the key the user registered on chain;
- `darwin: "trade-v1"`, chain id `qorechain-diana`, a known Darwin basket, positive amounts;
- `expires` in the future and at most 10 minutes ahead;
- the nonce was never used for this account (kept until the intent expires);
- the user's window is open and the grant is live.

A replay is refused (`already executed`), a tampered intent is refused (the signature does not verify). Both are checked on chain by Darwin's test suite.

## What it sends

One `MsgExec` from the relayer, with the user as the sender of every inner message: `MsgConvertCoin` if the user's ERC-20 fUSD is short, an `approve` if the router's allowance is short, then the router's `buy` or `sell` with the user's minimum. The relayer pays the gas.

## Trust bounds

See [Risks](/risks#the-relayer).

## Running it

`npm run relayer` in `ops/` (port 3046). The app proxies `/api/relay/status` and `/api/relay/trade` to it.
"""

PAGES["security/model.md"] = """# Every Privileged Action

There is one call site for both precompiles: `PqcAuth.requireSigned` (`contracts/src/pqc/PqcAuth.sol`). It reads the signer's key with `pqcKeyStatus`, refuses an unregistered key, a key without proof of possession or a key of another algorithm than ML-DSA-87, then checks the signature with `pqcVerify`.

| Action | Signer | Checked in | Protects |
|---|---|---|---|
| Oracle round | reporter | `DarwinOracle.submit` | every price the baskets are valued at |
| Rebalance | curator | `DarwinBasket.rebalance` | the exact trades the vault makes |
| Target weights | curator | `DarwinBasket.setTargetWeights` | the basket's composition |
| 16 admin functions | admin | `PqcAdmin._authorizeAdmin` | every power over the protocol and its funds |
| Test-token minting | admin | `DarwinTestToken.mint` | fQOR and fQWAKK supply |
| User trades | the user | the relayer (QoreSign) + the chain (hybrid `MsgExec`, the user's EVM window) | what is traded for whom |

The 16 admin functions: oracle `addFeed`, `setTokenFeed`, `setReporter`, `setParams`; reserve `listToken`, `setSpread`, `setSpreadExempt`, `withdraw`, `setOracle`; basket `setMintPaused`, `setCurator`, `setGuardian`, `setReserve`, `setMaxRebalanceLoss`, `setOracle`; and `setAdmin` on each. Each admin signature works once (nonce) and expires (deadline).

## What a leaked secp256k1 key can do

The deployer's key relays transactions and holds the guardian role, which can only pause new mints, never selling or redeeming. It cannot change a price, a weight, a trade or a parameter, and cannot move the reserve's funds. No seed shares sit on it: every seed went to `0x...dEaD`.

## Tested

Each row is covered by Foundry tests with mock precompiles and by the on-chain suite against the real `pqcVerify` and `pqcKeyStatus`: forged, tampered, replayed, stale and expired signatures refused. See [Tests](/developers/testing).
"""

PAGES["security/verify.md"] = """# Verify It Yourself

You do not have to take the chain's word, or Darwin's. Each transaction page in the app re-verifies the signatures in your browser.

## A trade

QoreSign's `inspectTransaction` (`@qorechain/qoresign`) re-reads the committed transaction and checks both its secp256k1 signature and its ML-DSA-87 layer against the keys the signer registered on chain, over the sign-bytes version the network verifies. A relayed trade shows the relayer's signature and the user it was relayed for.

## An oracle round

The page decodes `submit(timestamp, ids, prices, signature)` from the transaction's calldata, rebuilds the exact `roundMessage` the oracle checked, reads the reporter's key, and verifies the 4,627-byte ML-DSA-87 signature with `@qorechain/pqc`. It then checks that the same signature **fails** for the next round number.

## From the terminal

QoreChain's `qore` CLI gives a second opinion; Darwin's on-chain suite uses it:

```bash
npx @qorechain/qore-cli pq status <txhash> --json      # tier, layer count, verified
npx @qorechain/qore-cli pq status <qor1 or 0x> --json  # registered key, proof of possession, EVM window
```

## Raw data

Every transaction page links to the raw transaction on the testnet's REST API and to the QoreChain explorer (set it to Testnet once; it remembers).
"""

PAGES["security/cbom.md"] = """# Cryptographic Inventory

Darwin keeps a CycloneDX 1.6 CBOM of its deployment, generated with [QoreScan](https://github.com/qorechain/qorescan): the Solidity contracts, the accounts that run Darwin read live from the testnet, and the TLS endpoints the app and services talk to. Files in `docs/cbom/`; regenerate with `npm run cbom` in `ops/`.

| Classification | Where it shows up | Why, and what covers it |
|---|---|---|
| **ML-DSA-87** (FIPS 204) | every account's registered key; `pqcVerify` / `pqcKeyStatus` in `PqcAuth` | every Darwin power, and every trade |
| **X25519MLKEM768** (hybrid, FIPS 203) | TLS 1.3 key exchange of QoreChain's API endpoints | the endpoints already negotiate a post-quantum key exchange |
| ECDSA secp256k1 | the classical half of each hybrid transaction; EVM transaction signatures | never alone: native transactions carry a required ML-DSA-87 layer; EVM transactions are admitted only through windows opened from that lane; every privileged call also checks ML-DSA-87 in the contract |
| Ed25519 | validators' consensus keys | chain level, outside Darwin |
| ECDSA P-256 / P-384, RSA | web PKI certificates of the endpoints | outside Darwin |
| Keccak-256, SHA-256, AES-128-GCM, HKDF | hashes in signed messages; TLS | symmetric: Grover halves their margin, which stays at 128 bits or more |

QoreScan also maps the inventory to DORA (EU financial-sector ICT rules, `docs/cbom/dora-report.md`) and fills a crypto-agility template. Its output is an inventory aid, not a certification.
"""

PAGES["security/limitations.md"] = """# Known Limitations

Darwin had its repository read cold, as a juror would, on 2026-11-20. What it found, and where it stands:

| Finding | Status |
|---|---|
| Duplicate feed ids in one round could chain the 15% breaker; rounds could follow each other within seconds | fixed and live (v2): ids strictly increasing, rounds at least 60 s apart; refused on chain as `FeedsNotSorted` and `TooSoon` |
| `PqcAuth` assumed the registered key was ML-DSA-87 | fixed: algorithm id 1 enforced |
| An emptied basket could be re-seeded by the classical seeder key | fixed: one-shot seed |
| The oracle address was fixed in the reserve and baskets | fixed: `setOracle`, ML-DSA-87 admin only |
| Seed shares sat on the deployer, whose secp256k1 key relays transactions | fixed: every seed minted to `0x...dEaD` |
| QWAKK's only market is a thin pool whose spot could be pumped | fixed: 30-minute median; QOR needs two of three quotes |
| The reserve trades at the oracle price with a 0.30% spread, which arbitrage can farm around updates | accepted on testnet |
| QoreX does not sign cross-VM calls | addressed by the relayer, with the trust bounds in [Risks](/risks#the-relayer) |
| The QOR baskets were bounded by the real QOR and QWAKK on the testnet | addressed by fQOR and fQWAKK |

## Found by testing with a real wallet

Every trade path had been tested with QoreX's test double, which signs any message type. A buy from the real extension failed: QoreX refuses `MsgConvertCoin` and `MsgCrossVMCall`. That finding is what led to the relayer design, verified with the real extension on the testnet.
"""

PAGES["developers/repository.md"] = """# Repository

[`darwinmarket/darwin-qorechain`](https://github.com/darwinmarket/darwin-qorechain), MIT.

```
contracts/   Solidity 0.8.28, Foundry, OpenZeppelin
  pqc/PqcAuth.sol       ML-DSA-87 check against the on-chain key registry
  pqc/PqcAdmin.sol      admin powers usable only with a post-quantum signature
  DarwinOracle.sol      price rounds signed by the reporter, breaker, spacing, staleness
  DarwinReserve.sol     oracle-priced inventory market maker
  DarwinBasket.sol      ERC-20 share, in-kind mint/redeem, NAV, curator-signed rebalances
  DarwinRouter.sol      buy or sell a whole basket with fUSD in one call
  DarwinTestToken.sol   fQOR, fQWAKK: price-tracking stand-ins, ML-DSA-87 minting
  WQOR.sol              wrapped QOR
ops/         TypeScript, QoreChain SDK, viem
  relayer.ts            executes QoreX users' signed intents through authz
  keeper.ts             oracle rounds, the weekly rebalance, the scoped window
  prices.ts             BTC/ETH spot median, QOR market price, QWAKK pool median
  oracle.ts, rebalance.ts, window.ts, deploy.ts, redeploy-v2.ts, ...
app/         Next.js: Darwin's mainnet front on QoreChain
  src/lib/qore/         chain reads, QoreX, the relayer client, in-browser verification
  src/app/api/          REST proxy, relayer proxy, trades summary, price history
docs/        audit map, pricing, testing, CBOM, submission, E2E reports
docs-site/   this documentation
deployments/diana.json  every address, role, seed and retired version
```

## Kits

| Kit | Used for |
|---|---|
| QoreChain SDK (`@qorechain/sdk`, `@qorechain/evm`) | key derivation, hybrid signing, PQC registration, EVM windows |
| QoreSign (`@qorechain/qoresign`) | intent verification in the relayer; in-browser checks of committed transactions |
| qorechain-pqc (`@qorechain/pqc`) | in-browser verification of oracle rounds |
| QoreChain React (`@qorechain/react`) | the PQC key badge |
| Wallet adapter (`@qorechain/wallet-adapter`) | QoreX capability checks and requests |
| QoreX integrations (`@qorechain/qorex-wallet-mock`) | browser end-to-end tests |
| MCP + qore CLI (`@qorechain/mcp`, `@qorechain/qore-cli`) | second opinion in the on-chain suite; `.mcp.json` for agents |
| QoreScan (`@qorechain/qorescan`) | the CBOM |
"""

PAGES["developers/local.md"] = """# Running Locally

Requirements: Foundry, Node 20+.

```bash
git clone --recursive https://github.com/darwinmarket/darwin-qorechain && cd darwin-qorechain

# contracts: unit, fuzz and invariant tests with mock precompiles
cd contracts && forge test && cd ..

# the trade relayer (needs a testnet mnemonic in ~/.config/qorechain/testnet.mnemonic or QORE_MNEMONIC)
cd ops && npm install && npm run relayer &      # :3046

# the app, against the live testnet deployment
cd ../app && npm install && npm run build && npm start   # :3032, proxies /api/relay to :3046
```

The mnemonic is a **testnet-only** secret, never committed. The app reads the chain through its own REST proxy (`/api/rest`): QoreChain's public REST endpoint sends no CORS headers.

## The documentation

```bash
cd docs-site && pnpm install && pnpm build && pnpm start   # :3048/qorechain
```
"""

PAGES["developers/ops.md"] = """# Ops Scripts

All in `ops/`, run with `npx tsx src/<script>.ts` or the npm scripts.

| Script | What |
|---|---|
| `status` | keys, windows and balances of every role |
| `window register <role>` | register a role's ML-DSA-87 key, with proof of possession |
| `window open <role> [blocks] [txs] [targets...]` | open an EVM window; with targets it is scoped |
| `deploy`, `redeploy-v2` | idempotent deployments, recorded in `deployments/diana.json` |
| `oracle` | sign and relay a price round |
| `rebalance plan\\|run\\|weights <BASKET>` | the curator's planner, rebalances and target weights |
| `keeper` | rounds, the weekly rebalance, the scoped window |
| `relayer` | the QoreX trade relayer |
| `relay-setup` | a test account's one-time setup (window, grants) |
| `refill`, `mint-ftokens`, `source-qor`, `return-to-amm` | the reserve's inventory |
| `sweep <index>` | bring a faucet-funded account's tokens to the deployer |
| `cbom` | regenerate the cryptographic inventory |
| `e2e`, `battery` | the on-chain suites |

Every admin action goes through `adminCall`: read the exact message the contract will check, sign it with the admin's ML-DSA-87 key, relay it.
"""

PAGES["developers/testing.md"] = """# Tests

| Layer | Where | What |
|---|---|---|
| Unit and fuzz | `contracts/test/*.t.sol` | oracle rounds and refusals, PQ admin, reserve pricing, basket mint/redeem/rebalance, router, test tokens |
| Invariant | `contracts/test/invariant` | two campaigns: at fixed prices, and while the oracle's prices walk in signed rounds. Shares fully backed; in-kind redemption never fails; the router keeps nothing |
| On-chain E2E | `ops/src/e2e.ts` | against the real `pqcVerify` and `pqcKeyStatus`: forged, tampered, replayed, stale and expired signatures refused; a feed twice and a round too soon refused; the relayer executing a signed intent and refusing a replay and a tampered one; a second opinion from the `qore` CLI |
| Multi-user battery | `ops/src/battery.ts` | 8 users trading all four baskets in parallel, every trade's hybrid signature checked on chain |
| Browser E2E | `app/e2e/suite.mjs` | Chromium with the QoreX test double: every trade an intent signed with `signArbitrary` and executed by the relayer, checked on chain |

Locally the precompiles do not exist, so a mock is etched at `0x...0A01` and `0x...0A02`; the on-chain suite then proves the same paths with real ML-DSA-87 signatures. Reports with every transaction hash are in `docs/e2e`.

```bash
cd contracts && forge test
cd ops && npm test && npm run e2e && npm run battery
cd app && npm run e2e               # ONLY=<regex> for a subset
```
"""

PAGES["reference/contracts.md"] = """# Deployed Contracts

Network: QoreChain testnet `qorechain-diana`, EVM chain id 9800. Source of truth: `deployments/diana.json`.

## Core (v2 stack)

| Contract | Address |
|---|---|
| DarwinOracle | `0xabe07a51e1974d36970b40d3c1c84da37364685f` |
| DarwinReserve | `0x3a87144e2193db059228f5b982ffb2bdf65bc264` |
| DarwinRouter | `0xf402f3ce6505be9ba382ddf0bc53c27c1bd1d018` |

## Baskets

| Basket | Address |
|---|---|
| BLUEDW | `0xc35a0eb298693a011d26132eb7f4b8aca8112f92` |
| BALDW | `0xfe862c4947626bc9c86bcee12d82153f8286df9a` |
| QOREDW | `0x86514e17c50265c9ea90d2001bd879b6b724e575` |
| DEGENDW | `0x112d76f9bd9e421228f4b326d13e2ea160e92b74` |

## Tokens

| Token | Address | Decimals |
|---|---|---|
| fUSD (fest) | `0x97143B771D34ddb9130b807b135Ae675A5a963CA` | 6 |
| fETH (fest) | `0x02292293c13880a26242690eb70a0e42B8E91c28` | 18 |
| fBTC (fest) | `0x4604e7E45b2ecdbfbDc157103f5B2b62cb16451A` | 8 |
| fQOR (Darwin) | `0x3042be6c87cd1e1b170cfcc44620a84f16a3416d` | 18 |
| fQWAKK (Darwin) | `0xc558289c8c24a9171a549bf329724ad718d61aca` | 6 |
| WQOR | `0xa140f05ff3fec2d757ae758cddc064e2e386b749` | 18 |
| QWAKK (community) | `0xa5b3c3Fb92E2E89555F9909b9004C65F3542eE23` | 6 |

## Testnet accounts

| Address | Role |
|---|---|
| `qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5` | treasury and QoreX test trader |
| `qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p` | deployer, admin, guardian, fee recipient (`0x20807acc...`) |
| `qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs` | oracle reporter (`0x6A286f3D...`) |
| `qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u` | curator (`0xe0BBCcb7...`) |
| `qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf` | trade relayer (`0x08Ac091C...`) |

## Precompiles

| Name | Address |
|---|---|
| `pqcVerify` | `0x0000000000000000000000000000000000000a01` |
| `pqcKeyStatus` | `0x0000000000000000000000000000000000000a02` |
"""

PAGES["reference/status.md"] = """# Status

What is live, what is not, and what is known to be imperfect. Accurate as of **20 November 2026**, on the QoreChain testnet.

## Live

| Thing | State |
|---|---|
| Network | `qorechain-diana` testnet. Test tokens, no value |
| Baskets | Blue Chip, Balanced, Qore Ecosystem, Degen, on the v2 stack |
| Buy and sell | From QoreX: one signed intent per trade, executed by Darwin's relayer; setup once (EVM window, 24-hour grant) |
| Pricing | ML-DSA-87 signed oracle rounds: BTC/ETH spot median, QOR market price, QWAKK pool median |
| Rebalancing | Weekly, Mondays 12:00 UTC, curator-signed |
| Fees | 0.30% on buys and sells, plus the reserve's 0.30% spread |
| Verification | In-browser re-verification of trades (QoreSign) and oracle rounds (`@qorechain/pqc`) |

## Not live

| Thing | Why |
|---|---|
| Mainnet | QoreChain's PQC precompiles are on the testnet |
| A redeem-in-kind button | The contract allows it for anyone; the app exits by selling for fUSD |
| QoreX signing cross-VM calls directly | QoreX does not display them today; the relayer covers it |

## Audit

The two-stage QCAI audit runs on QoreChain's dashboard; the design map and the review's findings are in `docs/AUDIT.md` and on [Known Limitations](/security/limitations).
"""

PAGES["reference/glossary.md"] = """# Glossary

| Term | Meaning |
|---|---|
| **Basket** | A set of assets bought and sold as one ERC-20 token |
| **BLUEdw, BALdw, QOREdw, DEGENdw** | The four baskets' tokens (on chain: BLUEDW, BALDW, QOREDW, DEGENDW) |
| **Reserve** | `DarwinReserve`, which sells and buys components at oracle prices minus a spread |
| **Router** | `DarwinRouter`, which buys or sells a whole basket for fUSD in one call |
| **Reporter** | The key that signs oracle rounds |
| **Curator** | The key that signs target weights and rebalances |
| **Admin** | The key whose ML-DSA-87 signature authorises every admin action |
| **Guardian** | The one classical power: pause new mints |
| **Relayer** | Darwin's service that executes QoreX users' signed trade intents through authz |
| **Intent** | A JSON trade request a user signs with QoreX's `signArbitrary` |
| **ML-DSA-87** | The NIST post-quantum signature standard (FIPS 204) QoreChain uses, category 5 |
| **Hybrid signature** | secp256k1 + ML-DSA-87 on the same transaction |
| **Proof of possession** | Proof, at registration, that the account holds its ML-DSA-87 secret key |
| **EVM window** | A bounded authorisation for an account's EVM transactions; scoped when it lists allowed targets |
| **Authz grant** | Permission, with an expiry, for another account to send a message type as you |
| **MsgExec** | The authz message that carries messages sent on someone's behalf |
| **Cross-VM call** | `MsgCrossVMCall`: a native transaction calling an EVM contract |
| **fUSD, fETH, fBTC** | The fest's test tokens |
| **fQOR, fQWAKK** | Darwin's test tokens priced by the QOR and QWAKK feeds |
| **NAV** | The value of a basket's holdings at oracle prices; shown as an index, base 100 at launch |
| **CBOM** | Cryptographic bill of materials (CycloneDX) |
"""

for rel, body in PAGES.items():
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(body.lstrip("\n"))
print(len(PAGES), "pages written")
