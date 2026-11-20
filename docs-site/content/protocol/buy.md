# Buying

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
