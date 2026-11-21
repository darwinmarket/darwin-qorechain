# How a Trade Works

A Darwin trade from QoreX is **one signature**: you sign plain text in QoreX, and your Darwin account checks it on chain before it trades. No EVM window, no authz grant, no gas for the trade. The first buy also asks you to approve one fUSD deposit. Developer detail is on [Buying](/protocol/buy), [Selling](/protocol/sell) and [Darwin Accounts](/chain/accounts).

## Why an account and a relayer

QoreX shows its user every message it signs, decoded, and **refuses what it cannot display**. Darwin established, message type by message type, what the extension accepts today:

| Message | QoreX |
|---|---|
| Bank send (`MsgSend`) | shown and signed |
| Authz grant (`MsgGrant`) | shown and signed, with its expiry |
| CosmWasm call (`MsgExecuteContract`) | shown and signed |
| Message signature (`signArbitrary`) | shown and signed |
| Cross-VM call (`MsgCrossVMCall`) | **refused** |
| ERC-20 conversions (`MsgConvertCoin`, `MsgConvertERC20`) | **refused** |

Darwin's baskets are EVM contracts, and QoreX cannot send an EVM transaction. So each QoreX user gets a **DarwinAccount**: a contract controlled only by the ML-DSA-87 key the user registered on QoreChain. You sign a message; Darwin's relayer submits it and pays the gas; the account checks your signature with `pqcVerify` and only then calls the router. See [Darwin Accounts](/chain/accounts).

## Your account

- Its address is fixed by your own address (CREATE2), so it is known before it exists. It is created with your first trade.
- Only an account whose ML-DSA-87 key is registered with proof of possession gets one. QoreX registers it with your first transaction.
- It can call only Darwin's router, the four baskets and fUSD.
- It holds your fUSD and your basket shares.

## Buying, step by step

<Diagram src="/images/buy-flow.svg" alt="Four steps. One: you sign plain text in QoreX with secp256k1 and ML-DSA-87, naming the trade, your account, a nonce, a deadline and the hash of the exact calls. Two: the relayer checks both halves against your on-chain keys and submits it to the factory, paying the gas. Three: your account verifies the ML-DSA-87 signature with pqcVerify, then the router takes the fee, buys each component from the reserve at oracle prices and the basket mints shares to your account. Four: the shares are on your account; only your key moves them." width="900" caption="Step 1 is your only signature. Step 3 is checked by the chain, not by Darwin." />

### 0. The deposit, when needed

Faucet fUSD sits in your QoreX wallet as a bank coin. If a buy needs more fUSD than your account holds, the app first asks QoreX to sign one `MsgSend` of the difference to Darwin's relayer. The relayer checks that transaction and converts exactly that amount onto your account in ERC-20 form (`MsgConvertCoin`, receiver = your account). Each deposit is credited once. It costs a little QOR in gas.

### 1. You sign the text

The app builds a short text and QoreX signs it with `signArbitrary`: an ADR-36 secp256k1 signature and an ML-DSA-87 signature over those exact bytes.

```
Darwin: Buy 10.00 fUSD of BLUEdw, for at least 1.035000 BLUEdw

Darwin account 0x…
nonce 4
valid until 1795190400
calls 0x…
```

The last line is the hash of the exact calls: an fUSD approval of the router if needed, then `router.buy(basket, 10 fUSD, minShares, your account)`. The message is valid for 10 minutes.

### 2. The relayer checks it

The relayer (`app/src/server/accounts.ts`) verifies both halves with QoreSign's `verifyMessageWithChain` against the keys your account registered on chain, and checks that the calls are a trade paying your account. Then it submits `factory.execute(owner, calls, summary, deadline, pqSignature)` and pays the gas. The transaction is a `MsgCrossVMCall` the relayer hybrid-signs (secp256k1 + ML-DSA-87), so the chain verifies it too. Every transaction Darwin sends, rounds and rebalances included, goes out this way; none of Darwin's accounts holds an EVM window.

### 3. Your account checks it on chain

The account rebuilds the text, prefixes it with `qorechain-msg-v1|qorechain-diana|` as QoreX did, and verifies your ML-DSA-87 signature with `pqcVerify` against the key `pqcKeyStatus` returns. It moves its nonce, checks every target against Darwin's list, then calls the router. The router takes the 0.30% fee, buys each component from the reserve at oracle prices, and the basket mints the shares to your account.

### 4. The shares are yours

They are an ERC-20 balance on your account. Only a message signed by your ML-DSA-87 key moves them.

## Selling

Same shape: one text you sign, for `router.sell(basket, shares, minUsd, your account)`. fUSD lands on your account.

<Diagram src="/images/sell-flow.svg" alt="Four steps. One: you sign the sell text in QoreX. Two: the relayer checks it and submits it. Three: your account verifies the signature, then the router redeems your shares in kind, sells each component to the reserve at oracle prices and keeps the fee. Four: fUSD lands on your account." width="900" caption="Selling stays open when buying is paused." />

## Withdrawing

Portfolio's Cash row has **Withdraw X fUSD to QoreX**: one signed message. Your account transfers the fUSD to the relayer, which returns it to your QoreX wallet in bank form (`MsgConvertERC20`, receiver = you). If the two steps are cut apart, the relayer completes the second before the next withdrawal and in its daily run.

## What each actor can and cannot do

| Actor | Can | Cannot |
|---|---|---|
| You | Sign trades and withdrawals; deposit fUSD | Mint shares without paying for the components |
| The relayer | Submit your signed messages and pay the gas; refuse or delay them; hold fUSD for one transaction during a deposit or withdrawal | Change a call, replay a message, make your account call a contract outside Darwin, or move anything you did not sign |
| The reporter (oracle key) | Sign price rounds | Move a price more than 15% in one round, or publish rounds less than 60 s apart |
| The curator | Sign target weights and rebalance trades | Trade components that are not in the basket; lose more than 1% of NAV in a rebalance |
| The admin | Sign the 16 admin actions; change the accounts' allowed targets | Act with a secp256k1 key alone |
| The guardian | Pause new mints, with a hybrid-signed transaction | Unpause, rebalance, or block selling and redeeming; pause with a secp256k1 key alone |

## Where the trust sits

Stated plainly.

- **Deposits and withdrawals.** Your fUSD passes through the relayer for one transaction each way: a custody of seconds. Trades themselves are enforced by your account, not by the relayer.
- **Liveness.** If the relayer stops, trades from QoreX stop. Your holdings stay on your account, and the account accepts your signed messages from any submitter.
- **The oracle's inputs.** Signatures prove who published a price, not that the price is right. QOR comes from its market (CoinGecko and MEXC), QWAKK from its only pool. See [Oracle](/chain/oracle).

## Shares bought before DarwinAccounts

They sit on your EVM twin. Selling them takes the original path: an EVM window opened in QoreX, a 24-hour grant to the relayer, then a signed intent the relayer executes through authz `MsgExec`. The trade card guides it. See [QoreX & the Relayer](/chain/relayer#before-darwinaccounts).

[Risks](/risks) covers the rest.
