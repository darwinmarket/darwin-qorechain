# Rebalancing

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
