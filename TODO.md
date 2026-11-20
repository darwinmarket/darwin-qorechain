# To do before 2 December 2026

## Build

- [x] 4 baskets live: BLUEDW, BALDW, QOREDW v4, DEGENDW v2 (`deployments/diana.json`).
- [ ] **v2 redeploy** (after the faucet, needs QOR): oracle, reserve, the four baskets and the router
      on the fixed contracts (feed ids sorted, 60 s round spacing, ML-DSA-87 algorithm check, one-shot
      seed, `setOracle`); seeds minted to an unspendable address; keeper and app synced; E2E updated
      (`TooSoon` / `FeedsNotSorted` expectations); all suites rerun green.
- [ ] Refill the reserve's QOR and QWAKK so the QOR baskets can fill more than cents.

## Only the team can do

- [ ] QCAI audit stage 1 and stage 2 on dashboard.qorechain.io (AI Audit, "Ethereum (EVM/Solidity)"),
      reports in `docs/audit/`, findings table in `docs/AUDIT.md`.
- [ ] 3-minute video (mandatory). Screenshots in `docs/screenshots/`.
- [ ] Submission form: text in `docs/SUBMISSION.md`.
- [ ] Public demo link: choose the Vercel account, then deploy `app/` (everything is localhost for now).
- [ ] Claim the faucet daily: the keeper spends a few QOR a day.
