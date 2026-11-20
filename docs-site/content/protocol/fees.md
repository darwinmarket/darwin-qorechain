# Fees & Treasury

| Fee | Rate | Where |
|---|---|---|
| Darwin's trade fee | 0.30% of a buy's fUSD in, or of a sell's fUSD out | `DarwinRouter.feeBps`, paid to the fee recipient |
| Reserve spread | 0.30% on each component the router buys from or sells to the reserve | `DarwinReserve.spreadBps`; changed only by an ML-DSA-87 admin signature |
| Rebalances | no spread: the baskets are spread-exempt | `DarwinReserve.spreadExempt` |
| Gas for trades and withdrawals from QoreX, and for converting deposits | paid by Darwin's relayer | the relayer's account |
| Gas for an fUSD deposit (`MsgSend` from QoreX) | paid by the user, a little QOR | the user's QoreX wallet |

The fee recipient is Darwin's admin account (`0x20807accBc9693B40a17F2EC73a07e6dc77d3f85`).

The reserve's inventory is managed by Darwin: `ops/src/refill.ts` wraps QOR or sends tokens, `ops/src/mint-ftokens.ts` mints fQOR and fQWAKK (each mint an ML-DSA-87 admin signature), and every withdrawal needs the admin's ML-DSA-87 signature.
