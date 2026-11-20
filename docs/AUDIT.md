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
| `src/account/DarwinAccount.sol` | a QoreX user's account, controlled only by the owner's ML-DSA-87 key |
| `src/account/DarwinAccountFactory.sol` | CREATE2 deployment of accounts for proven owners; allowed targets, PQ admin only |

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
| Admin takeover with a leaked classical key | PqcAdmin | no `msg.sender` admin check anywhere; every action needs the admin's ML-DSA-87 signature, single-use nonce, deadline | `test_adminActionsNeedTheAdminsPqcSignature`, `test_adminSignatureWorksOnce`, `test_adminSignatureExpires`, `test_withdrawNeedsTheAdminsPqcSignature`, `test_setOracleNeedsTheAdminsPqcSignature`, `test_guardianCanOnlyPause` |
| Curator signature reused for other trades | Basket | signature covers the exact trades, nonce and deadline | `test_rebalanceSignatureIsBoundToItsTrades`, `test_rebalanceRefusesAForgedSignature` |
| Rebalance that leaks value | Basket | NAV after must stay within `maxRebalanceLossBps` (1%); only components can be traded | `test_rebalanceCannotLeakValue`, `test_rebalanceOnlyTradesComponents` |
| Holders locked in | Basket | in-kind `redeem` uses no oracle, no curator, no admin, cannot be paused | `test_redeemWorksWhenOracleIsDeadAndMintIsPaused` |
| Rounding in favour of the user | Basket, Reserve | mint rounds up, redeem rounds down; exact-out quotes round against the trader | `testFuzz_mintThenRedeemNeverProfits`, `test_exactOutRoundsAgainstTheTrader`, `testFuzz_roundTripNeverProfits` |
| First-depositor share inflation | Basket | only the seeder can make the first mint, once | `test_onlyTheSeederSeedsOnce` |
| Router overcharging or keeping dust | Router | buy sized from a quote with a 0.2% buffer, unspent fUSD refunded, nothing held between calls | `test_routerKeepsNothing`, `testFuzz_buyNeverOverchargesTheNav` |
| Reentrancy | Reserve, Basket, Router | `nonReentrant` on every state-changing external function that moves tokens; state updated before transfers | — |
| Guardian abuse | Basket | the guardian can only pause minting; unpausing needs the admin's ML-DSA-87 signature, and its key is refused for unpausing and rebalancing | `test_guardianCanOnlyPause` |
| Breaker chained inside a round, or across rounds seconds apart | Oracle | ids strictly increasing; rounds at least 60 s apart | `test_aFeedAppearsOnceARound`, `test_feedsMustBeInIncreasingOrder`, `test_roundsAreAtLeastAMinuteApart` |
| A key registered under another algorithm | PqcAuth | algorithm id must be 1 (ML-DSA-87) | `test_aKeyOfAnotherAlgorithmIsRefused` |
| Re-seeding an emptied basket with the classical seeder key | Basket | one-shot `seeded` flag | `test_aBasketIsSeededOnceEvenIfEmptiedLater` |
| A user's account moved by anyone but its owner | DarwinAccount | every call needs the owner's ML-DSA-87 signature over the account, nonce, deadline and hash of the calls, checked with `pqcVerify` | `test_buyThenSellBySignaturesOnly`, `test_anotherKeyCannotSign`, `test_theSubmitterCannotChangeTheCalls` |
| A signed account message replayed or used late | DarwinAccount | single-use nonce; deadline | `test_aSignatureWorksOnce`, `test_expiredMessagesAreRefused` |
| An account used to call arbitrary contracts | DarwinAccount, Factory | factory allow-list (router, baskets, fUSD), changed only by the admin's ML-DSA-87 signature | `test_onlyDarwinsContractsCanBeCalled`, `test_targetsChangeOnlyWithTheAdminsPqSignature` |
| An account for an owner without a post-quantum key | Factory | `PqcAuth.isQuantumSafe`: registered, ML-DSA-87, proven | `test_noAccountForAnOwnerWithoutAProvenKey` |

Accepted for a testnet: the reserve is a market maker that holds inventory and trades at the oracle
price, so its solvency is bounded by that inventory (`InsufficientInventory`); the keeper refills it.

## Post-quantum design

On the EVM the ML-DSA-87 check is done by the chain through the `pqcVerify` precompile, so the
QCAI "quantum readiness" rating shows "Not scored" for Solidity (expected, per the fest FAQ). This
section is the explanation the FAQ asks for: every place Darwin calls `pqcVerify` or
`pqcKeyStatus`, what it protects, and the tests that cover it.

There is one library for both precompiles, `PqcAuth` (`src/pqc/PqcAuth.sol`). `requireSigned`
(lines 29-36) reads the signer's key with `pqcKeyStatus` (`0x…0A02`), refuses an unregistered key,
a key of another algorithm or one without proof of possession, then checks the ML-DSA-87 signature
with `pqcVerify` (`0x…0A01`). `isQuantumSafe` (lines 24-27) is the same key check without a
signature, used by the account factory. Every privileged path goes through them:

| Call | Signer | Protects | Unit tests | On-chain check (`ops/src/e2e.ts`) |
|---|---|---|---|---|
| `DarwinOracle.submit` (`DarwinOracle.sol:99`) | reporter | every price the baskets are valued at | `test_refusesARoundSignedByAnotherKey`, `test_aSignatureIsBoundToItsPrices`, `test_aRoundCannotBeReplayed`, `test_reporterWithoutProvenKeyIsRefused` | curator-signed round refused; tampered prices refused; past round refused; replay refused; valid round stored |
| `DarwinBasket.rebalance` (`DarwinBasket.sol:272`) | curator | the exact trades the vault makes | `test_rebalanceSignatureIsBoundToItsTrades`, `test_rebalanceRefusesAForgedSignature` | reporter-signed rebalance refused; curator rebalance and restore |
| `DarwinBasket.setTargetWeights` (`DarwinBasket.sol:310`) | curator | the basket's composition | `test_curatorChangesTargetWeights`, `test_weightsRefuseASignatureFromAnotherKey`, `test_weightsSignatureIsBoundToItsWeights` | weights shifted and restored, then pinned to the published ones |
| `DarwinAccount.execute` (`DarwinAccount.sol:68`) | the account's owner (a QoreX user) | every call a user's account makes: trades and fUSD withdrawals | `test_buyThenSellBySignaturesOnly`, `test_withdrawIsASignedTransfer`, `test_aSignatureWorksOnce`, `test_theSubmitterCannotChangeTheCalls`, `test_anotherKeyCannotSign`, `test_expiredMessagesAreRefused` | `ops/src/account-check.ts`: buy, sell, withdraw; replay, changed calls, another key refused; a forged call sent on chain directly refused by `pqcVerify` |
| `DarwinAccountFactory.create` (`DarwinAccountFactory.sol:40`, `isQuantumSafe`) | none (key status) | no account for an owner without a proven ML-DSA-87 key | `test_noAccountForAnOwnerWithoutAProvenKey` | — |
| `PqcAdmin._authorizeAdmin` (`PqcAdmin.sol:46`), used by 16 admin functions, plus the account factory's `setTarget`: oracle `addFeed`, `setTokenFeed`, `setReporter`, `setParams`; reserve `listToken`, `setSpread`, `setSpreadExempt`, `withdraw`, `setOracle`; basket `setMintPaused`, `setCurator`, `setGuardian`, `setReserve`, `setMaxRebalanceLoss`, `setOracle`; `setAdmin` on each | admin | every power over the protocol and its funds | `test_adminActionsNeedTheAdminsPqcSignature`, `test_adminSignatureWorksOnce`, `test_adminSignatureExpires`, `test_withdrawNeedsTheAdminsPqcSignature`, `test_setOracleNeedsTheAdminsPqcSignature`, `test_guardianCanOnlyPause` | curator-signed withdrawal refused; expired signature refused; spread change signed and restored |

What a leaked secp256k1 key can still do: the deployer's key relays transactions and holds the
guardian role, which can only pause new mints (never selling, never in-kind redemption). It cannot
change a price, a weight, a trade or any parameter, and cannot move the reserve's funds. The trade
relayer's key can submit only to the account factory (its EVM window is scoped to it), where every
call needs the owner's ML-DSA-87 signature. A user's leaked secp256k1 key cannot move the user's
DarwinAccount at all: the account checks only the ML-DSA-87 half.

The same signatures can be checked without trusting the chain: the app's transaction page
re-verifies an oracle round's ML-DSA-87 signature and an account trade's owner signature in the
browser with `@qorechain/pqc`, each with a tamper check (next round, next nonce), and a committed
transaction's hybrid signature with QoreSign. See also the cryptographic inventory in
[cbom/](cbom/).

## DarwinAccounts and the trade relayer (QoreX users)

QoreX signs only messages it can display, refuses `MsgCrossVMCall` and the ERC-20 conversions, and
sends no EVM transactions. So each QoreX user trades through a `DarwinAccount`: the user signs plain
text in QoreX (`signArbitrary`), Darwin's relayer (`app/src/server/accounts.ts`) submits it through
`DarwinAccountFactory.execute`, and the account checks the owner's ML-DSA-87 signature on chain
before any call. The signed bytes are `"qorechain-msg-v1|qorechain-diana|" ‖ summary ‖
"\n\nDarwin account " ‖ account ‖ "\nnonce " ‖ n ‖ "\nvalid until " ‖ deadline ‖ "\ncalls " ‖
keccak256(abi.encode(calls))`. See the README's "How a trade works".

| Risk | How it is handled | Test |
|---|---|---|
| The relayer changes a call | the calls hash is in the signed text; the account rebuilds it and `pqcVerify` fails | `test_theSubmitterCannotChangeTheCalls`; on chain: calls changed after signing refused |
| The relayer (or anyone) replays a message | the account's nonce moves on every execution and is in the signed text | `test_aSignatureWorksOnce`; on chain: the same signature replayed refused |
| A message for another account or chain | the account address and the chain id (`qorechain-diana`, in the prefix) are in the signed bytes | `textFor`, `PREFIX` |
| A forged message submitted on chain directly, skipping the relayer | the account checks `pqcVerify` itself; the relayer's checks are only a gas guard | on chain: forged call sent directly refused by the account |
| Another key signs for the owner | `PqcAuth.requireSigned(owner, …)` reads the owner's key from `pqcKeyStatus` | `test_anotherKeyCannotSign`; on chain: another key refused |
| A stale signed message | `deadline` in the signed text (`Expired`); the app signs for 10 minutes, the relayer refuses more than 15 | `test_expiredMessagesAreRefused` |
| An account calls a contract outside Darwin | the factory's allow-list (router, 4 baskets, fUSD) is checked per call (`TargetNotAllowed`); the relayer also refuses anything but a trade paying the account (optional router approvals) or an fUSD withdrawal | `test_onlyDarwinsContractsCanBeCalled`; on chain: target outside Darwin refused |
| The allow-list is widened by a stolen classical key | `setTarget` needs the admin's ML-DSA-87 signature (`PqcAdmin`), single-use nonce, deadline | `test_targetsChangeOnlyWithTheAdminsPqSignature` |
| An account for an owner without a post-quantum key | the factory refuses it (`OwnerNotQuantumSafe`) | `test_noAccountForAnOwnerWithoutAProvenKey` |
| The relayer pays for messages the chain would refuse | it verifies both halves first with QoreSign `verifyMessageWithChain` (`requirePq`) against the user's on-chain keys | `ops/src/account-check.ts` |
| Custody during a deposit | the user's `MsgSend` of fUSD to the relayer is converted, in one transaction, onto the account (`MsgConvertCoin`, receiver = the account); the relayer checks sender, recipient, denom and amount, and credits once (memo `darwin deposit <txhash>`, read back from the chain) | on chain: deposit credited once |
| Custody during a withdrawal | the account transfers fUSD to the relayer; the relayer returns it in one transaction (`MsgConvertERC20`, receiver = the user, memo `darwin withdraw <evm hash>`) | on chain: withdraw back to the QoreX wallet |
| A withdrawal cut between its two transactions (serverless timeout) | `settleWithdrawals()` reads the factory's recent transactions and completes every successful withdrawal without its memo, before each withdrawal and in the daily cron; a second return of the same withdrawal would fail for lack of balance | tested on chain with a withdrawal deliberately cut halfway |
| The relayer's own key | a dedicated coin-60 account with its own ML-DSA-87 key (registered with proof of possession); its EVM window is scoped to the factory | `ops/src/deploy-accounts.ts` |
| Slippage | the signed calls carry the user's minimum (shares or fUSD), enforced by the router | router tests |

What remains trusted: the relayer can refuse or delay a message (liveness), and it holds a user's
fUSD for one transaction during a deposit or a withdrawal (a custody of seconds). Trades themselves
are non-custodial: they are enforced by the account contract. The account accepts a signed message
from any submitter, so the relayer is not the only way in.

## The original relayer path (shares bought before DarwinAccounts)

Shares bought before DarwinAccounts sit on the user's EVM twin. Selling them keeps the original
path (`app/src/server/relayer.ts`, `app/src/lib/qore/relay.ts`): the user's EVM window, a 24-hour
authz grant to the relayer, and an intent signed with `signArbitrary`, executed through `MsgExec`.

| Risk | How it is handled | Test |
|---|---|---|
| A forged intent | the relayer acts only on an intent whose secp256k1 (ADR-36) and ML-DSA-87 signatures verify against the key the user registered on chain (QoreSign `verifyMessageWithChain`, `requirePq`) | on-chain suite: a tampered intent is refused (`the classical signature does not verify`) |
| A replayed intent | a single-use nonce per account, kept until the intent expires; an intent expires within 10 minutes | on-chain suite: the same intent twice is refused (`already executed`) |
| An intent for another chain, contract or account | `chainId` must be qorechain-diana, the basket one of Darwin's, the account the signer | `parseIntent` |
| The relayer acting beyond intents | bounded by the user's authz grant (two message types, 24 hours, revocable) and the user's EVM window (transaction count, value, expiry); every action is a public `MsgExec` naming the user as sender | stated to the user in the app before the grant; README |
| Slippage on a relayed trade | the intent carries the user's minimum (shares or fUSD), enforced by the router | router tests |
