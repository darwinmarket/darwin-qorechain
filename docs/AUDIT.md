# Audit

Two-stage QCAI audit, as the Post-Quantum dApp track asks, plus our own review and tests.
The QCAI audit runs in the QoreChain dashboard (sign-in required): **AI Audit**, setting
**Ethereum (EVM/Solidity)**. Reports go in [`docs/audit/`](audit), each with its date.

## Contracts audited

| Contract | Role |
|---|---|
| `src/pqc/PqcAuth.sol` | ML-DSA-87 check against the on-chain key registry |
| `src/pqc/PqcAdmin.sol` | admin actions authorised only by an ML-DSA-87 signature |
| `src/DarwinOracle.sol` | reporter-signed price rounds |
| `src/DarwinReserve.sol` | oracle-priced inventory market maker |
| `src/DarwinBasket.sol` | basket share, in-kind mint/redeem, curator-signed rebalances |
| `src/DarwinRouter.sol` | fUSD buy and sell of a whole basket |
| `src/WQOR.sol` | wrapped QOR |

## Stage 1: the draft

Status: **to run** on the dashboard (it needs the team's sign-in). Paste each contract above,
save the report as `docs/audit/stage1-<contract>-<date>.md`, and fill the table below: every
finding fixed, covered by a test, or explained.

| # | Severity | Contract | Finding | Resolution | Test |
|---|---|---|---|---|---|
| | | | | | |

## Stage 2: the final contracts

Status: **to run** before the 2 December deadline, same setting, on the deployed sources.

## Our own review (before the QCAI audit)

| Risk | Where | How it is handled | Test |
|---|---|---|---|
| Forged or replayed price round | Oracle | ML-DSA-87 signature over chain id, contract, round number, timestamp and prices; round must be `round + 1`, timestamp strictly newer | `test_refusesARoundSignedByAnotherKey`, `test_aSignatureIsBoundToItsPrices`, `test_aRoundCannotBeReplayed` |
| Compromised or broken reporter | Oracle | 15% per-round circuit breaker, 2-minute future skew limit, 30-minute staleness for readers | `test_circuitBreakerOnLargeMoves`, `test_refusesFutureTimestamps`, `test_stalePricesAreRefused` |
| Key without proof of possession | PqcAuth | `pqcKeyStatus` must report `possessionProven` | `test_reporterWithoutProvenKeyIsRefused` |
| Admin takeover with a leaked classical key | PqcAdmin | no `msg.sender` admin check anywhere; every action needs the admin's ML-DSA-87 signature, single-use nonce, deadline | `test_adminActionsNeedTheAdminsPqcSignature`, `test_adminSignatureWorksOnce`, `test_adminSignatureExpires`, `test_withdrawNeedsTheAdminsPqcSignature` |
| Curator signature reused for other trades | Basket | signature covers the exact trades, nonce and deadline | `test_rebalanceSignatureIsBoundToItsTrades`, `test_rebalanceRefusesAForgedSignature` |
| Rebalance that leaks value | Basket | NAV after must stay within `maxRebalanceLossBps` (1%); only components can be traded | `test_rebalanceCannotLeakValue`, `test_rebalanceOnlyTradesComponents` |
| Holders locked in | Basket | in-kind `redeem` uses no oracle, no curator, no admin, cannot be paused | `test_redeemWorksWhenOracleIsDeadAndMintIsPaused` |
| Rounding in favour of the user | Basket, Reserve | mint rounds up, redeem rounds down; exact-out quotes round against the trader | `testFuzz_mintThenRedeemNeverProfits`, `test_exactOutRoundsAgainstTheTrader`, `testFuzz_roundTripNeverProfits` |
| First-depositor share inflation | Basket | only the seeder can make the first mint, once | `test_onlyTheSeederSeedsOnce` |
| Router overcharging or keeping dust | Router | buy sized from a quote with a 0.2% buffer, unspent fUSD refunded, nothing held between calls | `test_routerKeepsNothing`, `testFuzz_buyNeverOverchargesTheNav` |
| Reentrancy | Reserve, Basket, Router | `nonReentrant` on every state-changing external function that moves tokens; state updated before transfers | — |
| Guardian abuse | Basket | the guardian can only pause minting; unpausing needs the admin's ML-DSA-87 signature | `test_guardianCanOnlyPause` |

Accepted for a testnet: the reserve is a market maker that holds inventory and trades at the oracle
price, so its solvency is bounded by that inventory (`InsufficientInventory`); the keeper refills it.

## Post-quantum design

On the EVM the ML-DSA-87 check is done by the chain through the `pqcVerify` precompile, so the
QCAI "quantum readiness" rating shows "Not scored" for Solidity (expected, per the fest FAQ). This
section is the explanation the FAQ asks for: every place Darwin calls `pqcVerify` or
`pqcKeyStatus`, what it protects, and the tests that cover it.

There is one call site for both precompiles, `PqcAuth.requireSigned` (`src/pqc/PqcAuth.sol:19-24`):
it reads the signer's key with `pqcKeyStatus` (`0x…0A02`), refuses an unregistered key or one
without proof of possession, then checks the ML-DSA-87 signature with `pqcVerify` (`0x…0A01`).
Every privileged path goes through it:

| Call | Signer | Protects | Unit tests | On-chain check (`ops/src/e2e.ts`) |
|---|---|---|---|---|
| `DarwinOracle.submit` (`DarwinOracle.sol:99`) | reporter | every price the baskets are valued at | `test_refusesARoundSignedByAnotherKey`, `test_aSignatureIsBoundToItsPrices`, `test_aRoundCannotBeReplayed`, `test_reporterWithoutProvenKeyIsRefused` | curator-signed round refused; tampered prices refused; past round refused; replay refused; valid round stored |
| `DarwinBasket.rebalance` (`DarwinBasket.sol:272`) | curator | the exact trades the vault makes | `test_rebalanceSignatureIsBoundToItsTrades`, `test_rebalanceRefusesAForgedSignature` | reporter-signed rebalance refused; curator rebalance and restore |
| `DarwinBasket.setTargetWeights` (`DarwinBasket.sol:310`) | curator | the basket's composition | `BasketAdmin.t.sol` | weights shifted and restored, then pinned to the published ones |
| `PqcAdmin._authorizeAdmin` (`PqcAdmin.sol:46`), used by 15 admin functions: oracle `addFeed`, `setTokenFeed`, `setReporter`, `setParams`; reserve `listToken`, `setSpread`, `setSpreadExempt`, `withdraw`; basket `setMintPaused`, `setCurator`, `setGuardian`, `setReserve`, `setMaxRebalanceLoss`; `setAdmin` | admin | every power over the protocol and its funds | `test_adminActionsNeedTheAdminsPqcSignature`, `test_adminSignatureWorksOnce`, `test_adminSignatureExpires`, `test_withdrawNeedsTheAdminsPqcSignature` | curator-signed withdrawal refused; expired signature refused; spread change signed and restored |

What a leaked secp256k1 key can still do: the deployer's key relays transactions and holds the
guardian role, which can only pause new mints (never selling, never in-kind redemption). It cannot
change a price, a weight, a trade or any parameter, and cannot move the reserve's funds.

The same signatures can be checked without trusting the chain: the app's transaction page
re-verifies an oracle round's ML-DSA-87 signature in the browser with `@qorechain/pqc` (and a
user trade's hybrid signature with QoreSign). See also the cryptographic inventory in
[cbom/](cbom/).
