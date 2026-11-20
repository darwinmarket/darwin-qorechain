# Quickstart

Darwin on QoreChain runs on the **`qorechain-diana` testnet** at [darwin.market/qorechain](https://darwin.market/qorechain). The tokens are test tokens and have no value.

## 1. Get test tokens

Claim the faucet on the [QoreChain dashboard](https://dashboard.qorechain.io/faucet). A claim pays QOR, fUSD, fETH and fBTC. Darwin needs **fUSD** to buy, and a little **QOR** for the gas of your fUSD deposit. The faucet pays fUSD in bank form, in your QoreX wallet.

## 2. Connect QoreX

Install the [QoreX](https://docs.qorechain.io/qorex/browser-extension) browser extension, create or import a wallet, and switch it to **Testnet**. Press *Connect wallet* in the app.

Connecting gives Darwin nothing: every approval happens in QoreX. QoreX registers your ML-DSA-87 key with your first transaction. Your Darwin account, controlled only by that key, is created with your first trade. See [Darwin Accounts](/chain/accounts).

## 3. Buy

Open a basket, enter an amount of fUSD, and press *Buy*.

- **First buy:** QoreX first asks you to approve a deposit, one `MsgSend` of fUSD to Darwin's relayer, which puts the same amount on your Darwin account. Then QoreX shows the trade as text (what you buy, the minimum, your account, a nonce, a deadline): approve it.
- **Later buys:** one signature, while your account holds enough fUSD. A buy above it deposits the difference first.

Your account checks the signature on chain and buys. The trade card shows the progress and a link to the transaction. Darwin's relayer pays the gas of the trade. No EVM window, no authorization.

The trade card shows what the vault can fill right now; quick amounts stay within it.

## 4. Read your position

The portfolio reads your basket balances from your Darwin account and prices them at each basket's live NAV, next to your fUSD.

## 5. Sell

Switch the card to *Sell*, enter an amount of the basket token, approve the text in QoreX. fUSD lands on your Darwin account. Selling stays open when buying is paused.

## 6. Withdraw

In Portfolio, the Cash row has **Withdraw X fUSD to QoreX**. Approve one message: the fUSD goes back to your QoreX wallet in bank form.

## Shares bought before Darwin accounts

Shares bought before Darwin accounts sit on your account's EVM twin. Selling them takes the original setup, once: open an **EVM access window** in QoreX (it lasts about 7 hours), then authorize Darwin's relayer for 24 hours. The trade card shows these steps only for those shares.

## If QoreX is locked

The app asks QoreX to connect, which opens it for you to unlock, then sends the same request again.

## Troubleshooting

| Message | Meaning |
|---|---|
| *Approve the fUSD deposit in QoreX* | Your account holds less fUSD than this buy; the difference comes from your QoreX wallet |
| *Not enough fUSD* | The amount is above your fUSD, in your wallet and account together |
| *Above available liquidity* | The vault holds less of a component than this buy needs |
| *Relayer offline* | Darwin's relayer is not reachable; selling and redeeming in kind do not depend on it on chain |
| *Open an EVM window in QoreX* | Only for selling shares bought before Darwin accounts: your window is closed or expired |
| *Authorize Darwin's relayer (24 h)* | Only for selling shares bought before Darwin accounts: your grant expired or was revoked |
