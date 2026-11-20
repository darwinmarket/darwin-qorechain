# Selling

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
