# Quickstart

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
