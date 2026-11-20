# Tests

| Layer | Where | What |
|---|---|---|
| Unit and fuzz | `contracts/test/*.t.sol` | oracle rounds and refusals, PQ admin, reserve pricing, basket mint/redeem/rebalance, router, test tokens, Darwin accounts (11 tests); 110 in all |
| Invariant | `contracts/test/invariant` | two campaigns: at fixed prices, and while the oracle's prices walk in signed rounds. Shares fully backed; in-kind redemption never fails; the router keeps nothing |
| On-chain E2E | `ops/src/e2e.ts` | against the real `pqcVerify` and `pqcKeyStatus`: forged, tampered, replayed, stale and expired signatures refused; a feed twice and a round too soon refused; the relayer executing a signed intent and refusing a replay and a tampered one; a second opinion from the `qore` CLI |
| Darwin accounts on chain | `ops/src/account-check.ts` | 9 checks through the app's API: deposit credited once, buy, sell, withdraw; replay, calls changed after signing, another key, a target outside Darwin, and a forged call sent on chain directly, all refused |
| Multi-user battery | `ops/src/battery.ts` | 8 users trading all four baskets in parallel, every trade's hybrid signature checked on chain |
| Browser E2E | `app/e2e/suite.mjs` | Chromium with the QoreX test double: buys and sells signed with `signArbitrary` and checked on chain by the user's Darwin account, the deposit before a buy, a withdrawal, the transaction page's in-browser ML-DSA-87 re-verification, Activity |

Locally the precompiles do not exist, so a mock is etched at `0x...0A01` and `0x...0A02`; the on-chain suite then proves the same paths with real ML-DSA-87 signatures. Reports with every transaction hash are in `docs/e2e`.

```bash
cd contracts && forge test
cd ops && npm test && npm run e2e && npm run battery
cd ops && npx tsx src/account-check.ts   # APP=<app url>, default localhost:3032
cd app && npm run e2e               # ONLY=<regex> for a subset
```
