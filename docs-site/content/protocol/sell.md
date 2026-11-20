# Selling

<Diagram src="/images/sell-flow.svg" alt="The four steps of a sell: you sign plain text in QoreX, the relayer checks it and submits it, your Darwin account verifies the signature and the router redeems in kind and sells the components to the reserve, fUSD is on your account." width="900" caption="Selling stays open when buying is paused." />

## The router call

`DarwinRouter.sell(basket, shares, minUsdOut, to)`:

1. takes the shares from the caller (it needs an allowance);
2. redeems them in kind: the basket pays `shares × balanceᵢ / supply` of each component;
3. sells each component to the reserve at oracle prices;
4. keeps the fee (0.30%) and pays the rest in fUSD to `to`;
5. reverts if less than `minUsdOut` would be paid.

## From QoreX

Like a buy: one text signed in QoreX, checked on chain by the user's [Darwin account](/chain/accounts). The account approves the router for the basket token if needed, then calls `sell(basket, shares, minUsdOut, account)`. The fUSD lands on the account; Portfolio's **Withdraw X fUSD to QoreX** returns it to the QoreX wallet in bank form, with one more signed message.

Shares bought before Darwin accounts sit on the user's EVM twin and are sold through the original path (EVM window, grant, authz `MsgExec`). See [QoreX & the Relayer](/chain/relayer#before-darwinaccounts).

## Redeeming in kind, without the router

`DarwinBasket.redeem(shares, to)` pays the holder's share of every component directly. It needs no oracle, no curator, no admin and no relayer, and it cannot be paused. The app does not offer it as a button; the contract allows it for anyone.
