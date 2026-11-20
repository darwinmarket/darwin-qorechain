# Testing

Five layers, from pure logic to the live chain. Every layer is run before a change is called done.

| Layer | Where | What | Run |
|---|---|---|---|
| Unit and fuzz | `contracts/test/*.t.sol` | oracle rounds and refusals, PQ admin, reserve pricing, basket mint/redeem/rebalance, router, WQOR, QOREDW, and DarwinAccount (11 tests, `DarwinAccount.t.sol`: the address known beforehand and the account created by the first action, buy then sell by signatures only, a withdrawal as a signed transfer, a signature works once, the submitter cannot change the calls, another key cannot sign, expired messages refused, only Darwin's contracts callable, no account for an owner without a proven key, targets changed only by the admin's PQ signature, `create` idempotent). Full forge suite with the invariants: **110/110** | `cd contracts && forge test` |
| Invariant | `contracts/test/invariant` | two campaigns of 256 runs x 500 calls. At fixed prices (random mints, redeems, buys, sells): shares fully backed, NAV per share never drops, router keeps nothing, weights sum to 100%, sells refused only for an empty reserve or dust. With the oracle's prices walking (signed rounds a minute apart, up to ±10% each): still fully backed, **in-kind redemption never fails**, sells refused only for known reasons, router keeps nothing. Failures are counted, never swallowed | `forge test --match-path "test/invariant/*"` |
| On-chain E2E | `ops/src/e2e.ts` | 27 checks on qorechain-diana against the real `pqcVerify` and `pqcKeyStatus` precompiles: forged, tampered, replayed and stale signatures refused; admin, guardian, router, in-kind redemption, native cross-VM trades, ERC-20 conversions, curator rebalances (restoring the basket's own targets), every basket pinned to its published weights, a feed twice in a round and a round seconds after the last refused, every seed at `0x…dEaD`, the original relayer path executing an ML-DSA-87 signed intent as the user and refusing a replay and a tampered intent, and a second opinion from the official `qore` CLI | `cd ops && npm run e2e` (stop the keeper first) |
| DarwinAccounts on chain | `ops/src/account-check.ts` | **9/9** on qorechain-diana, through the app's API, with the test wallet as QoreX (same mnemonic, coin 118; `signMessage` = what QoreX `signArbitrary` signs): a deposit (one `MsgSend`) lands on the account as ERC-20 and is credited once; a buy and a sell by one signed message each, no window, no grant; a withdrawal back to the wallet's bank balance; refused: the same signature replayed, calls changed after signing, another key's signature, a target outside Darwin, and the forged call submitted on chain directly (refused by the account's `pqcVerify`). Separately, a withdrawal deliberately cut halfway on chain was completed by `settleWithdrawals()` | `cd ops && APP=<app url> npx tsx src/account-check.ts [BASKET] [usd]` |
| DarwinAccount battery | `ops/src/account-battery.ts` | N fresh QoreX-style users against the **production** app (darwin.market/qorechain), in parallel, never opening a window or granting: register an ML-DSA-87 key, deposit fUSD (one `MsgSend`), random buys and sells on all four baskets (one signed message each), attacks (another user's signature for its own account, a replay, an expired message, one valid for over 15 minutes, a buy paying someone else, a transfer the relayer does not relay, a deposit claimed twice, another user's deposit claimed), then exit and withdraw everything. Afterwards every account transaction's ML-DSA-87 signature is re-verified off chain over the text rebuilt from calldata (and must fail for nonce + 1), and the invariants: nothing left on any relayer, each relayer's window scoped to the factory alone, no user with a window or a grant, account nonces = executed messages, baskets fully backed, router dust-free, Activity complete. Latest: **16 users, 163/163 operations, 32/32 attacks refused, 138/138 signatures re-verified, 122/122 trades in Activity, 0 failures** (`account-battery-2026-11-20T234636.md`); p50 8.4 s from signature to confirmation | `cd ops && npx tsx src/account-battery.ts [users] [rounds] [firstIndex]` |
| Deposit audit | `ops/src/reconcile-deposits.ts` | every deposit to every relayer since the start against its credits, all pages: received, credited, over-credited, never credited, float; `--fix` credits what was missed | `cd ops && npx tsx src/reconcile-deposits.ts [--fix]` |
| Multi-user battery | `ops/src/battery.ts` | 8 fresh QoreX-style users trade all four baskets in parallel (buys, sells, in-kind redemptions, faucet-form and ERC-20 fUSD), every trade's hybrid signature checked on chain, then solvency, NAV and router invariants; the users then exit the QOR baskets (whose QOR and QWAKK inventory is scarce) and leftover gas is returned. Latest: 6 users, 33/33 trades hybrid-verified, 0 failures (`battery-2026-11-20T2350.md`) | `cd ops && npm run battery` |
| Browser E2E | `app/e2e/suite.mjs` | 26 checks in Chromium with the QoreX test double (real hybrid signing, real broadcast); every buy and sell is one message signed with `signArbitrary` and checked on chain by the user's DarwinAccount, with no window; a buy above the account's fUSD deposits the rest first (one `MsgSend`) then signs once; Portfolio withdraws fUSD back to QoreX; the transaction page re-verifies the owner's ML-DSA-87 signature in the browser and shows it fails for the next nonce; Activity lists the account's trades from the chain; the in-browser verification of a round; the PQC key badge; buys sized to the vault's capacity (SKIP, not FAIL, when the testnet reserve is empty). Latest local run 24/26 with 1 skip and 1 page-load timeout (`more fUSD than the balance disables the button`), which passed on rerun (`browser-2026-11-20T221356.md`, `browser-2026-11-20T221408-subset.md`); on production (darwin.market/qorechain) 7/7: buys, the transaction page's browser re-verification, withdraw, Activity (`browser-2026-11-20T222533-subset.md`); full run on production after the battery fixes **25/26**, 1 skip (`browser-2026-11-20T235348.md`) | `cd app && npm run build && npm start & npm run e2e` (`ONLY=<regex>` for a subset) |

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

## What a real QoreX found (2026-11-20)

The test double signs every message type; the real QoreX extension does not. A buy from the real
wallet failed with "QoreX cannot show what /cosmos.evm.erc20.v1.MsgConvertCoin does". A diagnostic
page (`app/src/app/debug/qorex`) then asked the real QoreX to sign one message type at a time:
bank sends, authz grants and CosmWasm calls are shown and signed; `MsgCrossVMCall`,
`MsgConvertCoin` and `MsgConvertERC20` are refused. A grant executed by a third party further needs
the user's own EVM window (`did not send this call itself, and its EVM authorisation window does
not admit it`). Hence the relayer design, verified with the real QoreX on testnet
(tx `4DCBD85715036495D6C32CF3A07AF7DD0ADE6C01191BE69470A9EFFA03986BA3`). It was later replaced for
new trades by DarwinAccounts, which need no window and no grant (see the README's "How a trade
works"); the original path remains for selling shares bought before.

## What the DarwinAccount battery found (2026-11-20)

The first 12-user run against production failed 43 of 140 operations. Each finding was fixed and the
battery run again until a 16-user run passed with no failure.

| Finding | Effect | Fix |
|---|---|---|
| Serverless calls run in parallel instances, all signing with one relayer account | `account sequence mismatch`: deposits not credited, the users' fUSD left on the relayer (33.08 fUSD) | a pool of four relayers, each user fixed to one by its address; a sequence race is signed again with the sequence the chain expects, after a block |
| One relayer's queue in one instance | calls waited past Vercel's 60 s and Cloudflare's 100 s: HTTP 504/524, once after the trade had gone through | the pool spreads the load (p50 21 s -> 8 s); routes may run 300 s; the app resolves a cut call from the account's nonce instead of reporting a failure |
| `settleDeposits()` looked for a credit among the relayer's latest 100 transactions | ten deposits credited twice (21.32 fUSD, to the battery's own test users) once the battery passed 100 transactions | every credit also sends 1 uqor to the depositor, so it is found by an indexed search (`transfer.recipient`, every page); `reconcile-deposits.ts` audited the whole history, credited the six deposits never credited, and the deployer covered the 21.32 fUSD |
| The chain's tx search returns nothing for `AND` queries | a combined search found no credit at all | search by recipient, filter the sender in code |
| A hand-encoded `MsgSend` passed to a signer that knows `MsgSend` | re-encoded empty: `empty address string is not allowed`, every deposit refused | known types are passed in object form |
| Two instances took one relayer's EVM nonce | one transaction accepted, then dropped from the mempool with no error | after 30 s without a receipt and no such transaction, sent again while the account's nonce shows it was not executed |
| A settle in one call returned a withdrawal another call was finishing | the duplicate conversion failed (as designed, no double payment), but the user saw an error | settle skips withdrawals under two minutes old; a failed return checks whether it was already returned |
| Two calls raced to publish the price round a trade asks for | the trade failed on the deployer's nonce | wait for the winner's round; a trade proceeds while the current round is still valid (under 28 of its 30 minutes) |
| Activity read the factory's latest 100 transactions | 87 of 89 trades listed | every page |
| A failed call inside the account (`CallFailed`) | an undecoded `0x5c0dee5d` | the reason is unwrapped: `call 1 failed: ERC20InsufficientBalance(…)`, with a plain-English lead |

## What building DarwinAccounts found (2026-11-20)

- **An EVM window can be opened for at most 17,280 blocks**, about 7 hours at 1.43 s blocks.
- **`MsgConvertCoin` and `MsgConvertERC20` sent by the relayer need ~2M gas.** Below it the chain
  reports a misleading `failed to retrieve balance: EVM call unexpected error`.
- **`MsgConvertERC20`'s `sender` must be bech32** (`qor1…`), not `0x`.
- **A withdrawal is two transactions**, and a serverless call can be cut between them;
  `settleWithdrawals()` completes it before the next withdrawal and in the daily cron. Tested on
  chain by cutting one halfway.
