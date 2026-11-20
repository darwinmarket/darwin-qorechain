# Testing

Four layers, from pure logic to the live chain. Every layer is run before a change is called done.

| Layer | Where | What | Run |
|---|---|---|---|
| Unit and fuzz | `contracts/test/*.t.sol` | 85 tests: oracle rounds and refusals, PQ admin, reserve pricing, basket mint/redeem/rebalance, router, WQOR, QOREDW | `cd contracts && forge test` |
| Invariant | `contracts/test/invariant` | two campaigns of 256 runs x 500 calls. At fixed prices (random mints, redeems, buys, sells): shares fully backed, NAV per share never drops, router keeps nothing, weights sum to 100%, sells refused only for an empty reserve or dust. With the oracle's prices walking (signed rounds a minute apart, up to ±10% each): still fully backed, **in-kind redemption never fails**, sells refused only for known reasons, router keeps nothing. Failures are counted, never swallowed | `forge test --match-path "test/invariant/*"` |
| On-chain E2E | `ops/src/e2e.ts` | 26 checks on qorechain-diana against the real `pqcVerify` and `pqcKeyStatus` precompiles: forged, tampered, replayed and stale signatures refused; admin, guardian, router, in-kind redemption, native cross-VM trades, ERC-20 conversions, curator rebalances (restoring the basket's own targets), every basket pinned to its published weights, a feed twice in a round and a round seconds after the last refused, every seed at `0x…dEaD`, and a second opinion from the official `qore` CLI | `cd ops && npm run e2e` (stop the keeper first) |
| Multi-user battery | `ops/src/battery.ts` | 8 fresh QoreX-style users trade all four baskets in parallel (buys, sells, in-kind redemptions, faucet-form and ERC-20 fUSD), every trade's hybrid signature checked on chain, then solvency, NAV and router invariants; the users then exit the QOR baskets (whose QOR and QWAKK inventory is scarce) and leftover gas is returned | `cd ops && npm run battery` |
| Browser E2E | `app/e2e/suite.mjs` | 25 checks in Chromium with the QoreX test double (real hybrid signing, real broadcast), each followed by on-chain assertions; the app's own in-browser ML-DSA-87 verification of a round and of a trade; the PQC key badge; buys sized to the vault's capacity (SKIP, not FAIL, when the testnet reserve is empty) | `cd app && npm run build && npm start & npm run e2e` (`ONLY=<regex>` for a subset) |

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

## What the batteries found

- **Router rounding on small buys** (fixed in router v2): a linear quote could undershoot the cost
  when an 8-decimal leg (fBTC) is rounded up to the satoshi; small QOREdw buys reverted. Reproduced
  in `RouterRoundingTest`, fixed by checking the exact cost of the quoted shares.
- **Gas limits**: 3-leg buys through a cross-VM call need ~1.36M gas; the app now sends 2.0M.
- **Reserve depth**: parallel QOR-heavy buys drain the WQOR and QWAKK inventory; the app and the
  battery refuse buys above the reserve's liquidity before signing.
- **Test hygiene**: a failed guardian check left BLUEdw paused; the check now always unpauses, and
  every suite verifies baskets are open first. A paused basket stays reachable for selling and
  redeeming in the app.

## What the 2026-11-20 review found

- **QOR was priced about 10x too high.** The oracle read QOR from two testnet AMM pools that
  disagree with each other; it now uses QOR's market price. See [PRICING.md](PRICING.md).
- **QWAKK's chart history was invented.** It was drawn as today's QWAKK/QOR ratio times QOR's
  history, back to August, although QWAKK only trades since 2026-11-18 and its ratio moved x14.6.
  It is now replayed swap by swap from its pool, and a check asserts nothing is drawn before then.
- **The curator check reset a production basket.** It set BLUEDW back to 50/50 after a test
  rebalance, written before BLUEDW moved to 70/30. It now restores the basket's own targets in a
  `finally`, and a new check pins every basket to its published weights.
- **Navbar tabs on a transaction page** went home instead of opening the tab (`/?tab=…` now).
- **Reserve depth at market prices**: the QOR baskets can fill only cents until the reserve holds
  more QOR and QWAKK; the trade card states the capacity to four decimals.
