# To do before 2 December 2026

## Build (at the end)

- [ ] **4th basket, degen: DEGENDW (display DEGENdw).** QOR + QWAKK (QWAKK is the community memecoin
      registered by governance, `0xa5b3c3Fb92E2E89555F9909b9004C65F3542eE23`, 6 decimals; pool 6
      QWAKK/QOR on the native AMM). Needs: a QWAKK/USD feed in the oracle (priced from pool 6 x QOR),
      QWAKK listed on the reserve with inventory (QWAKK bought on the AMM), deploy + seed + spread
      exemption via `ops/src/deploy.ts`, then sync the app (`npm run sync`) and add it to the E2E suites.

## Only the team can do

- [ ] QCAI audit stage 1 and stage 2 on dashboard.qorechain.io (AI Audit, "Ethereum (EVM/Solidity)"),
      reports in `docs/audit/`, findings table in `docs/AUDIT.md`.
- [ ] 3-minute video (mandatory). Screenshots in `docs/screenshots/`.
- [ ] Submission form: text in `docs/SUBMISSION.md`.
- [ ] Public demo link: choose the Vercel account, then deploy `app/` (everything is localhost for now).
- [ ] Claim the faucet daily: the keeper spends a few QOR a day.
