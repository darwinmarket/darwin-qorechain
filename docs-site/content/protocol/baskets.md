# Baskets

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
