# Testing

Four layers, from pure logic to the live chain. Every layer is run before a change is called done.

| Layer | Where | What | Run |
|---|---|---|---|
| Unit and fuzz | `contracts/test/*.t.sol` | 76 tests: oracle rounds and refusals, PQ admin, reserve pricing, basket mint/redeem/rebalance, router, WQOR, QOREDW | `cd contracts && forge test` |
| Invariant | `contracts/test/invariant` | 4 invariants under random mints, redeems, buys and sells (256 runs x 500 calls each): shares fully backed, NAV per share never drops at fixed prices, router keeps nothing, weights sum to 100% | `forge test --match-path "test/invariant/*"` |
| On-chain E2E | `ops/src/e2e.ts` | 18 checks on qorechain-diana against the real `pqcVerify` and `pqcKeyStatus` precompiles: forged, tampered, replayed and stale signatures refused; admin, guardian, router, in-kind redemption, native cross-VM trades, ERC-20 conversions, curator rebalances | `cd ops && npm run e2e` (stop the keeper first) |
| Browser E2E | `app/e2e/suite.mjs` | 20 checks in Chromium with the QoreX test double (real hybrid signing, real broadcast), each followed by on-chain assertions | `cd app && npm run build && npm start & node e2e/suite.mjs` |

Locally the precompiles do not exist, so `test/utils/MockPqc.sol` is etched at `0x…0A01` and
`0x…0A02`: a signature is valid when it equals `keccak256("ok", key, message)`. The on-chain suite
then proves the same paths with real ML-DSA-87 signatures.

Reports with every transaction hash: [docs/e2e](e2e).

## Coverage (forge coverage, unit and fuzz tests)

| File                                  | % Lines          | % Statements     | % Branches     | % Funcs         |
|---|---|---|---|---|
| src/DarwinBasket.sol                  | 99.37% (158/159) | 96.23% (204/212) | 74.19% (23/31) | 95.24% (20/21)  |
| src/DarwinOracle.sol                  | 100.00% (76/76)  | 92.66% (101/109) | 55.56% (10/18) | 100.00% (12/12) |
| src/DarwinReserve.sol                 | 94.74% (72/76)   | 83.70% (77/92)   | 36.84% (7/19)  | 93.33% (14/15)  |
| src/DarwinRouter.sol                  | 97.06% (66/68)   | 95.10% (97/102)  | 66.67% (12/18) | 83.33% (5/6)    |
| src/WQOR.sol                          | 100.00% (10/10)  | 88.89% (8/9)     | 0.00% (0/1)    | 100.00% (3/3)   |
| src/pqc/PqcAdmin.sol                  | 100.00% (17/17)  | 100.00% (17/17)  | 100.00% (3/3)  | 100.00% (4/4)   |
| src/pqc/PqcAuth.sol                   | 100.00% (5/5)    | 100.00% (10/10)  | 100.00% (3/3)  | 100.00% (1/1)   |

Uncovered branches are mostly the `require`-style guards on constructor arguments and the
duplicate-entry paths of `listToken`.
