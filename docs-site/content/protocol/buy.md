# Buying

<Diagram src="/images/buy-flow.svg" alt="The four steps of a buy: you sign plain text in QoreX, the relayer checks it and submits it, your Darwin account verifies the ML-DSA-87 signature on chain and calls the router, the shares are on your account." width="900" caption="Step 1 is your only signature." />

## The router call

`DarwinRouter.buy(basket, usdIn, minShares, to)`:

1. takes `usdIn` fUSD from the caller and keeps the fee (0.30%) for Darwin's fee recipient;
2. sizes the shares with `quoteBuy`, which checks the exact cost of the quoted shares with a 0.2% headroom so rounding never makes the buy revert;
3. buys each component from the reserve at oracle prices (`swapExactOut`);
4. mints the shares to `to` and refunds the fUSD not spent;
5. reverts if fewer than `minShares` would be minted.

The router holds nothing between transactions.

## From QoreX

The trade is plain text signed with QoreX's `signArbitrary`, submitted by Darwin's relayer to the user's [Darwin account](/chain/accounts), which checks the ML-DSA-87 signature with `pqcVerify` before making the calls:

| Call made by the account | When |
|---|---|
| fUSD `approve(router, max)` | the router's allowance is short |
| router `buy(basket, usdIn, minShares, account)` | always; the shares go to the account itself |

The account needs fUSD in ERC-20 form. When it holds less than `usdIn`, the app first asks QoreX to sign one `MsgSend` of the difference (bank-form faucet fUSD) to the relayer, which converts exactly that amount onto the account (`MsgConvertCoin`, receiver = the account). No EVM window, no grant; the relayer pays the trade's gas.

See [How a Trade Works](/how-it-works).

## Limits

| Limit | Value |
|---|---|
| Per buy | what the reserve holds of each component (the trade card shows it) |
| Minimum | none in the contract; the fee is rounded down |
| Paused baskets | buying is refused (`MintIsPaused`); selling is not |
