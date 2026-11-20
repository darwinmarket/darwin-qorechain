# DarwinAccount battery, 2026-11-20T23:15:02.165Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 12 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: FAIL.**

- users 12, rounds 5, operations 156 (0 ok), trades 0, deposits 0, withdrawals 0
- attacks 32, refused 32
- 0/0 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 - s, p90 - s, max - s
- failures: 160
- duration 127 s, 13.08 QOR of leftover gas returned

## State after the run

- relayer: serves 1 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 11207014
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 877 txs left
- relayer2: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 32674038
- relayer2 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 1000 txs left
- relayer3: serves 6 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 70104265
- relayer3 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 1000 txs left
- relayer4: serves 2 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 21624981
- relayer4 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 1000 txs left
- BLUEDW: supply 15.5419, NAV/share 9.5454
- BALDW: supply 14.2625, NAV/share 9.6483
- QOREDW: supply 6.9733, NAV/share 9.9112
- DEGENDW: supply 3.5214, NAV/share 10.2462
- Activity: 0/0 account trades listed
- user 0: deposited 0.00, withdrew 0.0000, wallet 0.1772 fUSD
- user 1: deposited 0.00, withdrew 0.0000, wallet 1.8059 fUSD
- user 2: deposited 0.00, withdrew 0.0000, wallet 0.1156 fUSD
- user 3: deposited 0.00, withdrew 0.0000, wallet 1.5079 fUSD
- user 4: deposited 0.00, withdrew 0.0000, wallet 0.4189 fUSD
- user 5: deposited 0.00, withdrew 0.0000, wallet 0.3613 fUSD
- user 6: deposited 0.00, withdrew 0.0000, wallet 0.5564 fUSD
- user 7: deposited 0.00, withdrew 0.0000, wallet 2.0137 fUSD
- user 8: deposited 0.00, withdrew 0.0000, wallet 0.0121 fUSD
- user 9: deposited 0.00, withdrew 0.0000, wallet 0.0632 fUSD
- user 10: deposited 0.00, withdrew 0.0000, wallet 0.7930 fUSD
- user 11: deposited 0.00, withdrew 0.0000, wallet 0.5645 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | replay its own last executed message | yes | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648 |
| 0 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a buy that pays someone else | yes | a trade must pay the account itself |
| 0 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | claim its own deposit twice | yes | no deposit yet |
| 0 | claim another user's deposit as its own | yes | victim has no deposit |
| 1 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | replay its own last executed message | yes | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795a |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | no deposit yet |
| 1 | claim another user's deposit as its own | yes | victim has no deposit |
| 2 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | replay its own last executed message | yes | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F23 |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | no deposit yet |
| 2 | claim another user's deposit as its own | yes | victim has no deposit |
| 3 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | replay its own last executed message | yes | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d2 |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | no deposit yet |
| 3 | claim another user's deposit as its own | yes | victim has no deposit |

## Failures

- user 1 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 10 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 5 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 11 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 3 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 2 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 4 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 0 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 7 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 6 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 9 deposit 4.00 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 1 deposit 1.77 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 10 deposit 1.34 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 5 deposit 1.56 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 11 deposit 1.16 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 3 deposit 1.39 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 0 deposit 2.13 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 4 deposit 2.95 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 2 deposit 1.63 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 9 deposit 3.24 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 7 deposit 1.18 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 deposit 1.61 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 6 deposit 2.48 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 1 buy BALDW 0.77 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 772232))
- user 3 buy DEGENDW 0.39 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 388843))
- user 5 buy BALDW 0.56 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 557123))
- user 4 buy BLUEDW 1.95 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 1952826))
- user 10 buy QOREDW 0.34 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 337682))
- user 11 buy DEGENDW 0.16 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 156507))
- user 0 buy BLUEDW 1.13 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 1128504))
- user 9 buy BALDW 2.24 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 2244895))
- user 2 buy QOREDW 0.63 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 626147))
- user 7 buy DEGENDW 0.18 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 177277))
- user 8 buy BLUEDW 0.61 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 606463))
- user 6 buy QOREDW 1.48 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 1481689))
- user 1 deposit 1.48 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 10 deposit 3.37 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 4 deposit 1.70 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 3 deposit 1.66 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 9 deposit 1.27 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 0 deposit 2.16 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 7 deposit 1.62 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 11 deposit 2.31 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 5 deposit 1.58 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 2 deposit 2.77 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 1 buy QOREDW 0.48 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 479883))
- user 6 deposit 2.13 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 deposit 2.14 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 4 buy BLUEDW 0.70 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 701092))
- user 3 buy DEGENDW 0.66 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 658268))
- user 10 buy BALDW 2.37 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 2370181))
- user 7 buy DEGENDW 0.62 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 621775))
- user 9 buy QOREDW 0.27 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 274442))
- user 11 buy BLUEDW 1.31 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 1314053))
- user 0 buy BLUEDW 1.16 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 1161968))
- user 5 buy DEGENDW 0.58 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 584923))
- user 6 buy BALDW 1.13 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 1129979))
- user 8 buy BALDW 1.14 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 1140445))
- user 2 buy BLUEDW 1.77 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 1772956))
- user 3 deposit 1.35 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 1 deposit 2.94 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 10 deposit 2.50 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 7 deposit 3.19 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 11 deposit 1.36 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 4 deposit 1.36 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 5 deposit 1.67 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 9 deposit 1.61 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 3 buy DEGENDW 0.35 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 346296))
- user 1 buy BALDW 1.94 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 1941971))
- user 6 deposit 2.83 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 deposit 2.02 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 0 deposit 2.29 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 10 buy BLUEDW 1.50 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 1499151))
- user 11 buy DEGENDW 0.36 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 363715))
- user 4 buy QOREDW 0.36 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 361021))
- user 7 buy BLUEDW 2.19 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 2187276))
- user 9 buy DEGENDW 0.61 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 608132))
- user 5 buy BLUEDW 0.67 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 670838))
- user 2 deposit 1.93 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 buy BALDW 1.02 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 1018734))
- user 6 buy BALDW 1.83 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 1831944))
- user 0 buy BALDW 1.29 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 1291267))
- user 2 buy QOREDW 0.93 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 929361))
- user 1 deposit 2.98 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1805914erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2979874erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 3B54DB26C1CB1D7FF76C6C7D98110AF2E68
- user 3 deposit 2.10 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 11 deposit 3.27 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 3165725erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 3265441erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 7A711F3E972BA3886129F24F094DD970359
- user 4 deposit 2.23 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1985061erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2234421erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx AAEDEB9541D98869AA19FD535C82FB3771D
- user 7 deposit 2.25 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2013672erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2252087erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 91A8F67CDAA5EC504BF1DCD68DF28620075
- user 10 deposit 2.46 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 792986erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2456174erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 0402AC7A8842274939DA10C9A28A9F1CF8CD
- user 1 buy BALDW 1.98 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 1979874))
- user 9 deposit 3.21 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1872531erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 3208733erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 46D2D61564B884F124949F5949B7B4BFEA9
- user 3 buy QOREDW 1.10 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 1098677))
- user 6 deposit 1.38 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 556388erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 1381716erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 70ED041C437D8CD49F9DB1263B323F9FBA4B
- user 8 deposit 2.62 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2234358erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2622542erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 2F253035C5D0EC595F0F2F1D6D2A91DABAB
- user 11 buy BALDW 2.27 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 2265441))
- user 5 deposit 1.53 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 7 buy BLUEDW 1.25 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 1252087))
- user 2 deposit 2.01 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1671536erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2006982erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 8F2FF69291DD9F9FFB4D484CDF3C8A42670
- user 4 buy QOREDW 1.23 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 1234421))
- user 10 buy QOREDW 1.46 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 1456174))
- user 0 deposit 1.24 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 buy BLUEDW 1.62 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 1622542))
- user 6 buy DEGENDW 0.38 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 381716))
- user 9 buy BALDW 2.21 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 2208733))
- user 5 buy DEGENDW 0.53 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 528583))
- user 2 buy BLUEDW 1.01 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 1006982))
- user 0 buy DEGENDW 0.24 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 241050))
- user 1 deposit 2.43 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1805914erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2428158erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 6382BBEADB6FE38161D615B1B128B83EF39
- user 3 deposit 1.98 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1507916erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 1977781erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 9E9AED1FDD194E28AAC75DD0C91DF01826A
- user 7 deposit 3.46 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2013672erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 3455729erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx F55F807ABBCD69C55FFE023B13CD53CA6FC
- user 1 buy QOREDW 1.43 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 1428158))
- user 10 deposit 2.05 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 792986erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2048817erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx C271B79A94F4B6C412B1BF7638869BFEACD5
- user 4 deposit 1.57 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 11 deposit 1.39 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 6 deposit 2.02 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 556388erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2025000erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 3725F6FA0893E0C47618863EBA986DF6FB0D
- user 5 deposit 3.26 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1658533erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 3263720erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 1F0290F9EFF64C32BBFC96CDA14E284775E
- user 3 buy BLUEDW 0.98 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 977781))
- user 7 buy BLUEDW 2.46 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 2455729))
- user 9 deposit 1.81 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 2 deposit 1.56 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 8 deposit 2.22 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 0 deposit 2.10 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 177211erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2097647erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 6DF94882D34C7D22F7FAC0BEE6CA9EBAE9E5
- user 11 buy QOREDW 0.39 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 394386))
- user 4 buy QOREDW 0.57 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 566197))
- user 6 buy BALDW 1.02 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 1025000))
- user 10 buy QOREDW 1.05 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 1048817))
- user 5 buy BALDW 2.26 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 2263720))
- user 2 buy DEGENDW 0.56 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 555960))
- user 9 buy QOREDW 0.81 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 809297))
- user 8 buy BLUEDW 1.22 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 1222226))
- user 0 buy QOREDW 1.10 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 1097647))
- user 1 deposit 1.93 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1805914erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 1928713erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx D5B0B23F61C0C2087B7B52CE9DD75D02AE7
- user 3 deposit 3.39 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1507916erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 3391861erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 33377B10BF2DDF82D12DD16B01A44A8D368
- user 7 deposit 2.19 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2013672erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2189718erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 153B130EB26C53E7DF12423ACE083994BF4
- user 1 buy BALDW 0.93 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 928713))
- user 3 buy BALDW 2.39 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 2391861))
- user 7 buy QOREDW 1.19 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 1189718))
- user 6 deposit 2.50 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 556388erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2501485erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 3E0CA230C2B3F4CB3EC847DD750CEFBD631A
- user 4 deposit 2.73 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 418864erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2727183erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 1CAA730352716556AFDF96EABB04A22A350F
- user 11 deposit 1.21 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 10 deposit 1.60 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 792986erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 1604031erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 251149C08E7232D5A9114F7CB8470564375C
- user 9 deposit 1.47 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 63234erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 1471030erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx AD9EF727868148BED11CD659624E8F589AAFB
- user 8 deposit 2.56 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 12132erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2557386erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 8603A1953F677B5E71382F5124FFADABBDA04
- user 2 deposit 2.32 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 115576erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2319341erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx C4F7D1E4AEA42912834A9959CED406975268
- user 5 deposit 1.30 fUSD: Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed
- user 0 deposit 2.14 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 177211erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2137778erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 78C8101A44964D69A8D30BB2268D31528907
- user 6 buy BALDW 1.50 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 1501485))
- user 4 buy BLUEDW 1.73 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 1727183))
- user 11 buy DEGENDW 0.21 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 206877))
- user 10 buy DEGENDW 0.60 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 604031))
- user 8 buy BALDW 1.56 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 1557386))
- user 9 buy DEGENDW 0.47 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 471030))
- user 2 buy BALDW 1.32 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 1319341))
- user 5 buy QOREDW 0.30 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 297186))
- user 0 buy QOREDW 1.14 fUSD: refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 1137778))
- relayer bank fUSD changed: 0 -> 11207014 (a deposit not credited?)
- relayer2 bank fUSD changed: 0 -> 32674038 (a deposit not credited?)
- relayer3 bank fUSD changed: 0 -> 70104265 (a deposit not credited?)
- relayer4 bank fUSD changed: 0 -> 21624981 (a deposit not credited?)

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 1 | deposit 4.00 fUSD | **NO** | 4548 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 10 | deposit 4.00 fUSD | **NO** | 4368 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 5 | deposit 4.00 fUSD | **NO** | 4368 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 11 | deposit 4.00 fUSD | **NO** | 4376 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 3 | deposit 4.00 fUSD | **NO** | 4409 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 2 | deposit 4.00 fUSD | **NO** | 4417 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 4 | deposit 4.00 fUSD | **NO** | 4532 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 0 | deposit 4.00 fUSD | **NO** | 4595 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 7 | deposit 4.00 fUSD | **NO** | 4722 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | deposit 4.00 fUSD | **NO** | 4956 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 6 | deposit 4.00 fUSD | **NO** | 4932 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 9 | deposit 4.00 fUSD | **NO** | 4971 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 1 | deposit 1.77 fUSD | **NO** | 3939 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 10 | deposit 1.34 fUSD | **NO** | 4027 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 5 | deposit 1.56 fUSD | **NO** | 3880 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 11 | deposit 1.16 fUSD | **NO** | 3971 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 3 | deposit 1.39 fUSD | **NO** | 3984 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 0 | deposit 2.13 fUSD | **NO** | 3808 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 4 | deposit 2.95 fUSD | **NO** | 3971 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 2 | deposit 1.63 fUSD | **NO** | 3911 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 9 | deposit 3.24 fUSD | **NO** | 3959 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 7 | deposit 1.18 fUSD | **NO** | 4067 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | deposit 1.61 fUSD | **NO** | 3962 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 6 | deposit 2.48 fUSD | **NO** | 4109 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 1 | buy BALDW 0.77 fUSD | **NO** | 1438 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 772232 |
| 3 | buy DEGENDW 0.39 fUSD | **NO** | 1237 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 388843 |
| 5 | buy BALDW 0.56 fUSD | **NO** | 1303 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 557123 |
| 4 | buy BLUEDW 1.95 fUSD | **NO** | 1079 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 195282 |
| 10 | buy QOREDW 0.34 fUSD | **NO** | 1357 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 337682 |
| 11 | buy DEGENDW 0.16 fUSD | **NO** | 1295 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 156507 |
| 0 | buy BLUEDW 1.13 fUSD | **NO** | 1312 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 112850 |
| 9 | buy BALDW 2.24 fUSD | **NO** | 1236 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 224489 |
| 2 | buy QOREDW 0.63 fUSD | **NO** | 1467 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 626147 |
| 7 | buy DEGENDW 0.18 fUSD | **NO** | 1335 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 177277 |
| 8 | buy BLUEDW 0.61 fUSD | **NO** | 1303 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 606463 |
| 6 | buy QOREDW 1.48 fUSD | **NO** | 1383 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 148168 |
| 1 | deposit 1.48 fUSD | **NO** | 4036 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 10 | deposit 3.37 fUSD | **NO** | 3899 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 4 | deposit 1.70 fUSD | **NO** | 3818 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 3 | deposit 1.66 fUSD | **NO** | 4002 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 9 | deposit 1.27 fUSD | **NO** | 3908 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 0 | deposit 2.16 fUSD | **NO** | 4014 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 7 | deposit 1.62 fUSD | **NO** | 4005 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 11 | deposit 2.31 fUSD | **NO** | 4118 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 5 | deposit 1.58 fUSD | **NO** | 4219 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 2 | deposit 2.77 fUSD | **NO** | 4181 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 1 | buy QOREDW 0.48 fUSD | **NO** | 1283 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 479883 |
| 6 | deposit 2.13 fUSD | **NO** | 3875 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | deposit 2.14 fUSD | **NO** | 3907 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 4 | buy BLUEDW 0.70 fUSD | **NO** | 1162 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 701092 |
| 3 | buy DEGENDW 0.66 fUSD | **NO** | 1137 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 658268 |
| 10 | buy BALDW 2.37 fUSD | **NO** | 1768 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 237018 |
| 7 | buy DEGENDW 0.62 fUSD | **NO** | 1360 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 621775 |
| 9 | buy QOREDW 0.27 fUSD | **NO** | 1592 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 274442 |
| 11 | buy BLUEDW 1.31 fUSD | **NO** | 1495 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 131405 |
| 0 | buy BLUEDW 1.16 fUSD | **NO** | 1975 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 116196 |
| 5 | buy DEGENDW 0.58 fUSD | **NO** | 1769 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 584923 |
| 6 | buy BALDW 1.13 fUSD | **NO** | 1958 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 112997 |
| 8 | buy BALDW 1.14 fUSD | **NO** | 1926 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 114044 |
| 2 | buy BLUEDW 1.77 fUSD | **NO** | 2370 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 177295 |
| 3 | deposit 1.35 fUSD | **NO** | 3834 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 1 | deposit 2.94 fUSD | **NO** | 4016 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 10 | deposit 2.50 fUSD | **NO** | 3963 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 7 | deposit 3.19 fUSD | **NO** | 4056 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 11 | deposit 1.36 fUSD | **NO** | 3961 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 4 | deposit 1.36 fUSD | **NO** | 4196 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 5 | deposit 1.67 fUSD | **NO** | 3975 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 9 | deposit 1.61 fUSD | **NO** | 4080 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 3 | buy DEGENDW 0.35 fUSD | **NO** | 1437 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 346296 |
| 1 | buy BALDW 1.94 fUSD | **NO** | 1378 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 194197 |
| 6 | deposit 2.83 fUSD | **NO** | 3926 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | deposit 2.02 fUSD | **NO** | 3948 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 0 | deposit 2.29 fUSD | **NO** | 4033 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 10 | buy BLUEDW 1.50 fUSD | **NO** | 1454 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 149915 |
| 11 | buy DEGENDW 0.36 fUSD | **NO** | 1316 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 363715 |
| 4 | buy QOREDW 0.36 fUSD | **NO** | 1384 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 361021 |
| 7 | buy BLUEDW 2.19 fUSD | **NO** | 1830 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 218727 |
| 9 | buy DEGENDW 0.61 fUSD | **NO** | 1172 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 608132 |
| 5 | buy BLUEDW 0.67 fUSD | **NO** | 1424 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 670838 |
| 2 | deposit 1.93 fUSD | **NO** | 4067 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | buy BALDW 1.02 fUSD | **NO** | 1286 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 101873 |
| 6 | buy BALDW 1.83 fUSD | **NO** | 1790 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 183194 |
| 0 | buy BALDW 1.29 fUSD | **NO** | 1741 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 129126 |
| 2 | buy QOREDW 0.93 fUSD | **NO** | 1388 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 929361 |
| 1 | deposit 2.98 fUSD | **NO** | 3195 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1805914erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 3 | deposit 2.10 fUSD | **NO** | 3855 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 11 | deposit 3.27 fUSD | **NO** | 3178 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 3165725erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 4 | deposit 2.23 fUSD | **NO** | 3180 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1985061erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 7 | deposit 2.25 fUSD | **NO** | 3334 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2013672erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 10 | deposit 2.46 fUSD | **NO** | 3334 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 792986erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 1 | buy BALDW 1.98 fUSD | **NO** | 1252 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 197987 |
| 9 | deposit 3.21 fUSD | **NO** | 3370 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1872531erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 3 | buy QOREDW 1.10 fUSD | **NO** | 1309 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 109867 |
| 6 | deposit 1.38 fUSD | **NO** | 3349 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 556388erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 8 | deposit 2.62 fUSD | **NO** | 3376 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2234358erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 11 | buy BALDW 2.27 fUSD | **NO** | 1382 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 226544 |
| 5 | deposit 1.53 fUSD | **NO** | 3786 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 7 | buy BLUEDW 1.25 fUSD | **NO** | 1284 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 125208 |
| 2 | deposit 2.01 fUSD | **NO** | 3207 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1671536erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 4 | buy QOREDW 1.23 fUSD | **NO** | 1552 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 123442 |
| 10 | buy QOREDW 1.46 fUSD | **NO** | 1921 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 145617 |
| 0 | deposit 1.24 fUSD | **NO** | 4639 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | buy BLUEDW 1.62 fUSD | **NO** | 1628 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 162254 |
| 6 | buy DEGENDW 0.38 fUSD | **NO** | 1689 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 381716 |
| 9 | buy BALDW 2.21 fUSD | **NO** | 2320 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 220873 |
| 5 | buy DEGENDW 0.53 fUSD | **NO** | 1949 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 528583 |
| 2 | buy BLUEDW 1.01 fUSD | **NO** | 1830 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 100698 |
| 0 | buy DEGENDW 0.24 fUSD | **NO** | 1528 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 241050 |
| 1 | deposit 2.43 fUSD | **NO** | 3221 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1805914erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 3 | deposit 1.98 fUSD | **NO** | 3180 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1507916erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 7 | deposit 3.46 fUSD | **NO** | 3233 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2013672erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 1 | buy QOREDW 1.43 fUSD | **NO** | 1904 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 142815 |
| 10 | deposit 2.05 fUSD | **NO** | 3683 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 792986erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 4 | deposit 1.57 fUSD | **NO** | 4481 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 11 | deposit 1.39 fUSD | **NO** | 4628 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 6 | deposit 2.02 fUSD | **NO** | 3341 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 556388erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 5 | deposit 3.26 fUSD | **NO** | 3244 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1658533erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 3 | buy BLUEDW 0.98 fUSD | **NO** | 2448 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 977781 |
| 7 | buy BLUEDW 2.46 fUSD | **NO** | 1853 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 245572 |
| 9 | deposit 1.81 fUSD | **NO** | 4441 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 2 | deposit 1.56 fUSD | **NO** | 4080 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 8 | deposit 2.22 fUSD | **NO** | 4455 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 0 | deposit 2.10 fUSD | **NO** | 3325 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 177211erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 11 | buy QOREDW 0.39 fUSD | **NO** | 2102 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 394386 |
| 4 | buy QOREDW 0.57 fUSD | **NO** | 2320 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 566197 |
| 6 | buy BALDW 1.02 fUSD | **NO** | 1931 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 102500 |
| 10 | buy QOREDW 1.05 fUSD | **NO** | 2460 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 104881 |
| 5 | buy BALDW 2.26 fUSD | **NO** | 1949 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 226372 |
| 2 | buy DEGENDW 0.56 fUSD | **NO** | 1445 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 555960 |
| 9 | buy QOREDW 0.81 fUSD | **NO** | 1550 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 809297 |
| 8 | buy BLUEDW 1.22 fUSD | **NO** | 1293 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 122222 |
| 0 | buy QOREDW 1.10 fUSD | **NO** | 1390 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 109764 |
| 1 | deposit 1.93 fUSD | **NO** | 3321 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1805914erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 3 | deposit 3.39 fUSD | **NO** | 3191 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1507916erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 7 | deposit 2.19 fUSD | **NO** | 3195 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 2013672erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 1 | buy BALDW 0.93 fUSD | **NO** | 1084 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3dc6A409EAb505FD04c36574dDd795aB2aB3bE3B, 0, 928713 |
| 3 | buy BALDW 2.39 fUSD | **NO** | 1037 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF63EC9BeA1385775fC872138756d0d217DbBE2a0, 0, 239186 |
| 7 | buy QOREDW 1.19 fUSD | **NO** | 967 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x082bE5Cc734aE5ec22a13F281CD2c1E8989aD754, 0, 118971 |
| 6 | deposit 2.50 fUSD | **NO** | 3218 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 556388erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 4 | deposit 2.73 fUSD | **NO** | 3173 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 418864erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 11 | deposit 1.21 fUSD | **NO** | 4330 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 10 | deposit 1.60 fUSD | **NO** | 3418 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 792986erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 9 | deposit 1.47 fUSD | **NO** | 3157 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 63234erc20:0x97143B771D34ddb9130b807b135Ae675A5a |
| 8 | deposit 2.56 fUSD | **NO** | 3202 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 12132erc20:0x97143B771D34ddb9130b807b135Ae675A5a |
| 2 | deposit 2.32 fUSD | **NO** | 3182 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 115576erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 5 | deposit 1.30 fUSD | **NO** | 3904 |  | Broadcasting transaction failed with code 1 (codespace: undefined). Log: empty address string is not allowed |
| 0 | deposit 2.14 fUSD | **NO** | 3337 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 177211erc20:0x97143B771D34ddb9130b807b135Ae675A5 |
| 6 | buy BALDW 1.50 fUSD | **NO** | 1117 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xA3907A1e8D993d4558d99e48A6f610c82d7306e7, 0, 150148 |
| 4 | buy BLUEDW 1.73 fUSD | **NO** | 1246 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x3031AC6ba2cE3F31aa6Bb0916453ecFD9d32D93d, 0, 172718 |
| 11 | buy DEGENDW 0.21 fUSD | **NO** | 1097 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xfdaA414535163812663B8102aD1B58CC4A18A7CE, 0, 206877 |
| 10 | buy DEGENDW 0.60 fUSD | **NO** | 1135 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x84ce0BB5A1586687be9122D11e1eFF229B489E17, 0, 604031 |
| 8 | buy BALDW 1.56 fUSD | **NO** | 1183 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xF33a17DE92f1bad4CdAB71DD6469cf386562f673, 0, 155738 |
| 9 | buy DEGENDW 0.47 fUSD | **NO** | 1240 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xc5Df288104Cf8903FD3718348bc1c9e4A78db1B9, 0, 471030 |
| 2 | buy BALDW 1.32 fUSD | **NO** | 1279 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x9c42bBEF3E30E258C43cB1fa5b20F2358E74C6Be, 0, 131934 |
| 5 | buy QOREDW 0.30 fUSD | **NO** | 1203 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0xB3f9F3E1732043c3aF8EF97bF086443F82028851, 0, 297186 |
| 0 | buy QOREDW 1.14 fUSD | **NO** | 1284 |  | refused before sending: not enough balance on your Darwin account (call 1 failed: ERC20InsufficientBalance(0x64CeA57293061afB2aEd21C7d8F7648737040B85, 0, 113777 |
