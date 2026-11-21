# Tests

| Layer | Where | What |
|---|---|---|
| Unit and fuzz | `contracts/test/*.t.sol` | oracle rounds and refusals, PQ admin, reserve pricing, basket mint/redeem/rebalance, router, test tokens, Darwin accounts (11 tests); 110 in all |
| Invariant | `contracts/test/invariant` | two campaigns: at fixed prices, and while the oracle's prices walk in signed rounds. Shares fully backed; in-kind redemption never fails; the router keeps nothing |
| On-chain E2E | `ops/src/e2e.ts` | 28 checks against the real `pqcVerify` and `pqcKeyStatus`: forged, tampered, replayed, stale and expired signatures refused; a feed twice and a round too soon refused; the relayer executing a signed intent and refusing a replay and a tampered one; no Darwin account holds an EVM window and the chain refuses an ECDSA-only transaction from the deployer; every basket's NAV per share recomputed from its holdings at the oracle's prices; a second opinion from the `qore` CLI. Latest 28/28 |
| Signing audit | `ops/src/pq-audit.ts` | every transaction of the deployer and the four relayers since a date carries a hybrid signature the chain verified. Latest 230/230 since 2026-11-21T09:12Z, when the windows were closed |
| Darwin accounts on chain | `ops/src/account-check.ts` | 9 checks through the app's API: deposit credited once, buy, sell, withdraw; replay, calls changed after signing, another key, a target outside Darwin, and a forged call sent on chain directly, all refused. Latest 9/9 on production |
| Darwin account battery | `ops/src/account-battery.ts` | fresh users against the production app in parallel. Latest: 16 users, 168/168 operations, 32/32 attacks refused, 138/138 owner signatures re-verified, 138/138 relayer transactions hybrid-signed, 122/122 in Activity, 0 failures |
| Multi-user battery | `ops/src/battery.ts` | users trading all four baskets in parallel through native cross-VM calls, every trade's hybrid signature checked on chain. Latest: 6 users, 32/32 trades hybrid-verified, 0 failures |
| Browser E2E | `app/e2e/suite.mjs` | Chromium with the QoreX test double: buys and sells signed with `signArbitrary` and checked on chain by the user's Darwin account, the deposit before a buy, a withdrawal, the transaction page's in-browser ML-DSA-87 re-verification, Activity |

Locally the precompiles do not exist, so a mock is etched at `0x...0A01` and `0x...0A02`; the on-chain suite then proves the same paths with real ML-DSA-87 signatures. Reports with every transaction hash are in `docs/e2e`.

```bash
cd contracts && forge test
cd ops && npm test && npm run e2e && npm run battery
cd ops && npx tsx src/account-check.ts   # APP=<app url>, default localhost:3032
cd ops && npx tsx src/pq-audit.ts 2026-11-21T09:12:00Z
cd app && npm run e2e               # ONLY=<regex> for a subset
```
