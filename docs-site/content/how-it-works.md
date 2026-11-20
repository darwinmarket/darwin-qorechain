# How a Trade Works

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
