# Browser E2E run, 2026-11-20T12:25:40.178Z

The Darwin front (mainnet design) at http://localhost:3032, QoreX test double (real hybrid signing), qorechain-diana. Suite: `app/e2e/suite.mjs`. Result: **2/2 passed**.

| | Check | Detail | Time |
|---|---|---|---|
| PASS | Connect wallet connects QoreX; the account shows in the navbar | qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5 | 1.3s |
| PASS | faucet fUSD (bank form) is converted in the same transaction as the buy | already in bank form, buy msgs [MsgConvertCoin, MsgCrossVMCall] | 6.0s |
