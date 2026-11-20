# DarwinAccount battery, 2026-11-20T23:01:34.039Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 12 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: FAIL.**

- users 12, rounds 5, operations 140 (99 ok), trades 71, deposits 26, withdrawals 2
- attacks 32, refused 32
- 73/73 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 21.2 s, p90 28.3 s, max 32.0 s
- failures: 43
- duration 461 s, 13.51 QOR of leftover gas returned

## State after the run

- relayer: EVM fUSD 0 -> 0, bank fUSD 0 -> 33080508
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 877 txs left
- BLUEDW: supply 15.5419, NAV/share 9.5153
- BALDW: supply 14.2625, NAV/share 9.6245
- QOREDW: supply 6.9733, NAV/share 9.9234
- DEGENDW: supply 3.5214, NAV/share 10.2771
- Activity: 71/71 account trades listed
- user 0: deposited 4.00, withdrew 0.0000, wallet 8.0000 fUSD
- user 1: deposited 5.57, withdrew 0.0000, wallet 6.4340 fUSD
- user 2: deposited 3.91, withdrew 0.0000, wallet 2.7464 fUSD
- user 3: deposited 4.35, withdrew 0.0000, wallet 3.6483 fUSD
- user 4: deposited 6.02, withdrew 0.0000, wallet 5.9767 fUSD
- user 5: deposited 5.35, withdrew 0.0000, wallet 2.6543 fUSD
- user 6: deposited 5.47, withdrew 3.5746, wallet 10.1070 fUSD
- user 7: deposited 4.76, withdrew 0.0000, wallet 1.6336 fUSD
- user 8: deposited 3.67, withdrew 0.0000, wallet 4.3277 fUSD
- user 9: deposited 4.66, withdrew 0.0000, wallet 1.2089 fUSD
- user 10: deposited 5.17, withdrew 1.1103, wallet 7.9357 fUSD
- user 11: deposited 1.17, withdrew 0.0000, wallet 7.3752 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1hxj3383klv6y2gd52gyk082tj430r07mzrr5cn |
| 0 | replay its own last executed message | yes | the classical signature does not verify |
| 0 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a buy that pays someone else | yes | a trade must pay the account itself |
| 0 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | claim its own deposit twice | yes | refused: already credited |
| 0 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |
| 1 | sign for another user's account (owner = victim) | yes | the classical key does not control qor19zksxf32n0yxmjredj07q8zvq2xl75mtm385ll |
| 1 | replay its own last executed message | yes | the classical signature does not verify |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | refused: already credited |
| 1 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |
| 2 | sign for another user's account (owner = victim) | yes | the classical key does not control qor10rqf9fcq82mveqqasxtrtugwlszw40wa5hz08l |
| 2 | replay its own last executed message | yes | the classical signature does not verify |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |
| 3 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1d8gjazaqnu5x8tjqhew6tcftvw6dq76zmqc853 |
| 3 | replay its own last executed message | yes | the classical signature does not verify |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |

## Failures

- user 8 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence
- user 11 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence
- user 5 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence
- user 3 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence
- user 7 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 130, got 129: incorrect account sequence
- user 9 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 130, got 129: incorrect account sequence
- user 2 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 130, got 129: incorrect account sequence
- user 1 buy BALDW 1.16 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 7 deposit 1.61 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 9 deposit 2.13 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 2 deposit 1.34 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 7 buy DEGENDW 0.61 fUSD: The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided ABI.
Make sure you are using the correct ABI and that the error exists on it.
You can look up the decoded signature here: https://4byte.sourc
- user 10 buy QOREDW 0.27 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 9 buy BALDW 1.13 fUSD: The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided ABI.
Make sure you are using the correct ABI and that the error exists on it.
You can look up the decoded signature here: https://4byte.sourc
- user 2 buy QOREDW 0.34 fUSD: The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided ABI.
Make sure you are using the correct ABI and that the error exists on it.
You can look up the decoded signature here: https://4byte.sourc
- user 5 buy BALDW 0.56 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 4 buy BLUEDW 2.47 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 3 buy DEGENDW 0.16 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 8 buy BLUEDW 0.77 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 6 buy QOREDW 0.48 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 11 buy DEGENDW 0.66 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 0 buy DEGENDW 0.17 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 7 deposit 1.70 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1633585erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 1698652erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx 858239FE357566C3BD4C2FF64ECB3B3A7FF
- user 7 buy QOREDW 1.14 fUSD: The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided ABI.
Make sure you are using the correct ABI and that the error exists on it.
You can look up the decoded signature here: https://4byte.sourc
- user 7 deposit 2.46 fUSD: insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1633585erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA is smaller than 2462475erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA: insufficient funds) (tx C241830525142218F0A425476B37B274D35
- user 7 buy BLUEDW 1.90 fUSD: The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided ABI.
Make sure you are using the correct ABI and that the error exists on it.
You can look up the decoded signature here: https://4byte.sourc
- user 1 withdraw 1.3363 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 10 exit: sell all DEGENDW 0.1414: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 11 exit: sell all DEGENDW 0.0084: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 4 withdraw 1.8701 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 9 exit: sell all DEGENDW 0.0496: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 8 exit: sell all DEGENDW 0.0334: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 5 exit: sell all DEGENDW 0.0124: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 7 withdraw 0.9984 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 3 withdraw 2.0420 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 2 withdraw 1.1457 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 0 withdraw 1.7448 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 11 withdraw 0.5494 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 9 withdraw 2.8181 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 8 withdraw 1.8022 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 5 withdraw 1.2936 fUSD: HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- relayer bank fUSD changed: 0 -> 33080508 (deposits converted != received?)
- user 11: account nonce 7, executed 6

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 8 | deposit 4.00 fUSD | **NO** | 4450 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence |
| 11 | deposit 4.00 fUSD | **NO** | 4953 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence |
| 5 | deposit 4.00 fUSD | **NO** | 5479 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence |
| 3 | deposit 4.00 fUSD | **NO** | 4887 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 128, got 127: incorrect account sequence |
| 6 | deposit 4.00 fUSD | yes | 7604 | `46CC45C09AD3670E741FA8CE216A3EFE98C62933B5939B5C2985EFD85178784B` | send 4B663EE2E8… |
| 1 | deposit 4.00 fUSD | yes | 10869 | `FC6B7B3FE0A0F3836384F2AAEA6874763042BA97CC726EA3802021693DCEF716` | send 655E8E1C6F… |
| 7 | deposit 4.00 fUSD | **NO** | 10829 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 130, got 129: incorrect account sequence |
| 9 | deposit 4.00 fUSD | **NO** | 11233 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 130, got 129: incorrect account sequence |
| 2 | deposit 4.00 fUSD | **NO** | 10318 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 130, got 129: incorrect account sequence |
| 11 | deposit 1.17 fUSD | yes | 7554 | `180833448E40E068E78DEE8824DEF3C22A3D98F49084D5210B977FDE9C2F0951` | send 9A08168170… |
| 10 | deposit 4.00 fUSD | yes | 14008 | `7EFEDF17FA4A1237F58A77947FF327EBDE006EE739F8B972C6F5FC40E064B5FD` | send 5DA71C34E9… |
| 5 | deposit 1.56 fUSD | yes | 10484 | `7241CD5441C381BEB4057ECDFFFEF8CA4AD9E40520C5CD5FDC4921BE8DD5C107` | send 47E29133FA… |
| 4 | deposit 4.00 fUSD | yes | 17293 | `3DB52C70A0F93F297476317FDB1F9479A03D0C2E3B8901FEAB77BDAA18DA7B8E` | send F91DFABC09… |
| 3 | deposit 1.16 fUSD | yes | 13365 | `1BF5B37570658A861DD4CDFA7A53DFECDC8BD26661B766BD561A1BA94AECBA73` | send A7B28A4DB9… |
| 0 | deposit 4.00 fUSD | yes | 21084 | `320BD6BBF874656D7F428C35C8CB837071CC5AA3DB2B6A83FB77B95E8C02DFA7` | send 70B4C73096… |
| 8 | deposit 1.77 fUSD | yes | 20280 | `70D90280AD568F27DC1E22D2B232D2013881B5A1429B28F855EEE8CB68D881F3` | send EC4227BE89… |
| 6 | buy QOREDW 0.74 fUSD | yes | 18669 | `0x713976d413fab8686f9dd57e344d9a7fb0ec33be338ed09ae1e458ca351f1689` | +0.0735 QOREDW |
| 11 | buy DEGENDW 0.17 fUSD | yes | 15358 | `0x6d2c90fdf258bdf840e8500423e42c075a3cf6990edf9690c8b9764e64940628` | +0.0168 DEGENDW |
| 0 | buy BLUEDW 2.24 fUSD | yes | 6816 | `0x8982d2e02ad21e7c486a066489112e1587c02cc06313865c5ac83d70ed3052ec` | +0.2338 BLUEDW |
| 1 | buy BALDW 1.16 fUSD | **NO** | 60832 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 7 | deposit 1.61 fUSD | **NO** | 63630 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 9 | deposit 2.13 fUSD | **NO** | 63665 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 2 | deposit 1.34 fUSD | **NO** | 63666 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 7 | buy DEGENDW 0.61 fUSD | **NO** | 1177 |  | The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided A |
| 10 | buy QOREDW 0.27 fUSD | **NO** | 60934 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 9 | buy BALDW 1.13 fUSD | **NO** | 1138 |  | The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided A |
| 1 | buy QOREDW 0.67 fUSD | yes | 4471 | `0x6065315c71da4d34304cdce4daa77c0ce3bb8bbd6a46e99cd0db4ab54b59ff5f` | +0.0668 QOREDW |
| 2 | buy QOREDW 0.34 fUSD | **NO** | 1322 |  | The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided A |
| 5 | buy BALDW 0.56 fUSD | **NO** | 60819 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 4 | buy BLUEDW 2.47 fUSD | **NO** | 60819 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 3 | buy DEGENDW 0.16 fUSD | **NO** | 60807 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 10 | buy BLUEDW 0.66 fUSD | yes | 7339 | `0x6a1197ae9b9932a0a0296b0178c65a53eff04993cc6c5c9131a65d5edd2640c2` | +0.0684 BLUEDW |
| 1 | buy BLUEDW 1.13 fUSD | yes | 7197 | `0xa616e1e72d741cc930f254c6d16dde5251c06f74a89e2f04ae0d1866ab1f6800` | +0.1178 BLUEDW |
| 8 | buy BLUEDW 0.77 fUSD | **NO** | 60734 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 6 | buy QOREDW 0.48 fUSD | **NO** | 60993 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 7 | deposit 3.00 fUSD | yes | 11892 | `B78814D66FC96C57E19795A1FE68AD1D45142B6E0ED1C112BCCA1D8A956B01E1` | send 3501AB294A… |
| 4 | buy BALDW 1.06 fUSD | yes | 9395 | `0x1b7052151742809844d12dd0c5ad8e5ef9c1eb16af2887efd15fae8e91d16036` | +0.1095 BALDW |
| 11 | buy DEGENDW 0.66 fUSD | **NO** | 60920 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 0 | buy DEGENDW 0.17 fUSD | **NO** | 60834 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 9 | deposit 2.31 fUSD | yes | 15251 | `17F316BC49D0C9CA75F68977E49A49806A921A15FA75CDFD5C6D00858D6C0F39` | send 53B727CBAA… |
| 2 | deposit 2.77 fUSD | yes | 18375 | `31CCA7FD6FB0ED8AC3C0D3DB975687C8D12C84D65DE082EBB482D6BF544C62C0` | send 51B6043339… |
| 3 | buy DEGENDW 0.32 fUSD | yes | 17272 | `0x40e349e187af269d3bc26fee14461c25edffdb57103bb17f8960a7785e7f0a62` | +0.0309 DEGENDW |
| 5 | deposit 1.43 fUSD | yes | 24152 | `49E15DDB88E5674B11CEC235899FCB62A8E12E82CB24A3A894A798879E385493` | send 8B526A7772… |
| 1 | sell QOREDW 0.0334 | yes | 22286 | `0x30bdc9e9d83a76e489fbe7768694bd2f552b76243b740ec9f25957c772fafd71` | +0.3293 fUSD |
| 10 | buy BALDW 1.94 fUSD | yes | 23279 | `0x0c2f694a474e9a3d9b56a0dc54e1e3ae369f30193d5cb78b197ff48bbc51339b` | +0.2001 BALDW |
| 8 | buy DEGENDW 0.35 fUSD | yes | 24245 | `0xfa78df64d255b0d2c1a40d2c8003ec3b3a72671f650692d6d48d2dbf9bf44124` | +0.0334 DEGENDW |
| 6 | buy BLUEDW 1.50 fUSD | yes | 22587 | `0x27a366c17c4c302d529bbaa95cbf71091d4c5325f023f865e9a7c133e5f0a95b` | +0.1561 BLUEDW |
| 7 | buy BLUEDW 2.00 fUSD | yes | 23234 | `0xa5e9b6a08776a4aeb12f1fec2403b008325ccec3224b0350308291d4393961a9` | +0.2081 BLUEDW |
| 11 | sell DEGENDW 0.0084 | yes | 24435 | `0x06f3920fc4fdc00aa6cb4b86804168a20f7e3e15905eda43615400fe4977b1fd` | +0.0858 fUSD |
| 4 | buy BLUEDW 2.19 fUSD | yes | 25215 | `0xdc5b55efdcf428751493a5c08f2908193c348f42531499e2d4d5e5f65c78d00f` | +0.2280 BLUEDW |
| 0 | buy DEGENDW 0.36 fUSD | yes | 25639 | `0x1c9a4b702bc941c4130c6fa9729308e8087fce17caa9c41237801a1f0c85a11c` | +0.0351 DEGENDW |
| 9 | buy BLUEDW 1.31 fUSD | yes | 25968 | `0xc6c292c4251846cef257c84d98e1c249c5652bd52ec9889d4c4a9b7c75bf1f46` | +0.1368 BLUEDW |
| 2 | buy BLUEDW 1.77 fUSD | yes | 23319 | `0x205e69367c283fdebae5f18d7217f544823d76fba992f2148da3412d4644176a` | +0.1846 BLUEDW |
| 3 | deposit 2.14 fUSD | yes | 24590 | `839AF5B0EC7159313E311A3991C39E8F87450173EC566654D86BBF81A071AE60` | send 322F2A0BFE… |
| 5 | buy BALDW 1.99 fUSD | yes | 26472 | `0xdf1e08309bd73b212aa51d592736d710ecfc5b8560523c9a7eb3ba99c84eac00` | +0.2051 BALDW |
| 1 | buy BLUEDW 0.67 fUSD | yes | 21125 | `0x692e1cb22e830601af2db57518cb9358bf4848e0198db5c084f6c7cf2a3d09b6` | +0.0698 BLUEDW |
| 10 | buy QOREDW 0.89 fUSD | yes | 22300 | `0x8ea64c34e6f83ee0d546da4c30e0e4105205ce642e467f79073c162085e6b569` | +0.0887 QOREDW |
| 8 | buy QOREDW 1.26 fUSD | yes | 21467 | `0x312a65c766939b3b08db3136bf7cdfb1dc7955b7d9ee097182fd9b4469889513` | +0.1254 QOREDW |
| 6 | deposit 1.47 fUSD | yes | 23414 | `06336C3C06C3D90B9A7C6D0D123BBBFD6205CA41C9A09DF88E852D41D357B73A` | send 9E3BCD790B… |
| 4 | sell BLUEDW 0.1140 | yes | 26132 | `0xf06848e6fc0565bfe9ab75a12c46f5281293477fd0a49ad3409e93386caf8d44` | +1.0778 fUSD |
| 11 | buy BALDW 1.05 fUSD | yes | 27233 | `0x3293a285a35cc3808e54bc245bb8b1a4e80fe0cb5f0c6a02326fe9e251284ec0` | +0.1088 BALDW |
| 7 | deposit 1.76 fUSD | yes | 33598 | `849BC36E4B38212878930F7574147F45EDF4036AC6764E21F96614B05FBC7B1A` | send 0645BBD507… |
| 0 | buy QOREDW 0.69 fUSD | yes | 31175 | `0x3b651669fffac201fbe89cca6b181c92634e35a65831252f31abe654e2f57660` | +0.0690 QOREDW |
| 2 | sell BLUEDW 0.0923 | yes | 29795 | `0xbd8927d18f42db0c4ea22d725118462b0a054d88066b1037a2175a00df70a4f5` | +0.8726 fUSD |
| 3 | buy BLUEDW 1.98 fUSD | yes | 27447 | `0x67472f8f0e9438a539ac723da4036e54d4ebf5370fcab534c47f2b4e911513ab` | +0.2058 BLUEDW |
| 9 | deposit 1.03 fUSD | yes | 35106 | `5066AF3525D56F26CBD82B70DCBAD99147029D967CAEAA24ED93957BC0E1F197` | send 6F65F2615B… |
| 5 | deposit 1.25 fUSD | yes | 28835 | `2FBEE3D8FC65BA5D6C0C4D9BADC6EE4370ECA99D4725B94964E936B465319FF0` | send 08F44C5A1A… |
| 1 | deposit 1.57 fUSD | yes | 31298 | `5D3CFDD5784CF3C1B118F19CD64E46DBA130847E6BEE594740C0AB34984D9BE2` | send EC86458982… |
| 10 | deposit 1.17 fUSD | yes | 33001 | `6A1D5F69B3313B94D21A47B8F3CC5A4102FA019566BEF3C7007FD0C5C2D7E430` | send 1BFB354DAE… |
| 6 | buy BALDW 2.24 fUSD | yes | 31312 | `0x9c03b0c0ddf0f2cfccce6fadec79533986bd36b86f0e23a29b032d14217bf3f0` | +0.2307 BALDW |
| 8 | deposit 1.90 fUSD | yes | 37869 | `D67BD647927E18984C8AB0815A2B975360E41B96ADD50F5047344C1C2DB1B027` | send DCD3C94947… |
| 11 | sell BALDW 0.0544 | yes | 29225 | `0x1b0706792b2729b7fce10ed18560904f5be2617e07ab70daebd26f64deac18c3` | +0.5204 fUSD |
| 4 | buy QOREDW 0.88 fUSD | yes | 31952 | `0xb87e5a8cba820d754c36ca29dc792c6e9d9f338b340b693bcc0e90b3f2329c5e` | +0.0876 QOREDW |
| 7 | buy BALDW 1.77 fUSD | yes | 28282 | `0x5bfc7da2bd6fd9a8d5e87e9a97a8b91e2888fda8fdaaf538232e1b159ed59f52` | +0.1819 BALDW |
| 0 | buy QOREDW 0.41 fUSD | yes | 27905 | `0x16dafd73e2b30bc065e109d44288fd8e9aece685596cbd06593bb7a0acca97bf` | +0.0410 QOREDW |
| 2 | buy BLUEDW 1.87 fUSD | yes | 28933 | `0xa87dd1b4c2fed0d2bea16b5c6b13c6fcd38c58d8b13a9f64b9904d13baa50cee` | +0.1951 BLUEDW |
| 3 | sell BLUEDW 0.1029 | yes | 29062 | `0xd6b592596c348030668e4cd465f09216b951b971b7362a2a8b06f83287f6b47e` | +0.9727 fUSD |
| 9 | buy QOREDW 1.03 fUSD | yes | 25989 | `0x0695abce22d04313e4dde16b726f1c2a3b68e2577ef21178ce694cd1a5dba06f` | +0.1033 QOREDW |
| 5 | buy BLUEDW 1.25 fUSD | yes | 24950 | `0x56070a3ef2b2021bcdd0f14180a9094a487bc26fb2a88ed83f0e9a26e0a006d3` | +0.1304 BLUEDW |
| 1 | buy BALDW 2.43 fUSD | yes | 23196 | `0xd163464cf1daa4518eba08b273d914fb01359aa971af4a9bd2f8c5fba1302fb4` | +0.2507 BALDW |
| 10 | buy DEGENDW 0.70 fUSD | yes | 20512 | `0xd5dcf82f06787271da2086333d2f56df84070aeb01def00c4576cd01fe2f7c56` | +0.0673 DEGENDW |
| 6 | sell BLUEDW 0.0781 | yes | 19740 | `0x76720ad028bc3690f5247a74e70ffc13cea918485e671f2ed3cc6e97526be711` | +0.7381 fUSD |
| 8 | buy QOREDW 1.07 fUSD | yes | 17168 | `0xf4a0e079166589338cb96ae9b4606e58e5deb6a14c1389af1b52d9cb78b8e708` | +0.1073 QOREDW |
| 11 | buy QOREDW 0.39 fUSD | yes | 17048 | `0xc8148a5a6095560743d83c0226aa2c7fac9cf61fb3397c8921385be8dd8d06c5` | +0.0394 QOREDW |
| 7 | buy QOREDW 0.57 fUSD | yes | 16189 | `0x794fd75aa02d942f4ae02df31532d43c54bc947abfc9d06be6571d5dcf6a31e9` | +0.0565 QOREDW |
| 0 | sell QOREDW 0.0550 | yes | 15107 | `0xe2bdda8efdfe76ada6f5178866f8903c68fc83f8ea31072179d369046655b1af` | +0.5424 fUSD |
| 7 | deposit 1.70 fUSD | **NO** | 3376 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1633585erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 4 | deposit 2.02 fUSD | yes | 21237 | `02C4A14FE19B9B94EDE37010A8F6D07F286C6FB87108B75AED13C2764DF4DAEC` | send B735B80AA4… |
| 3 | buy DEGENDW 0.73 fUSD | yes | 21174 | `0x2cc32b1b33da4d5d02e426a1c15136126ed2834ea9fcdc38c03ecccaa6fcbf3e` | +0.0707 DEGENDW |
| 9 | buy QOREDW 0.81 fUSD | yes | 21356 | `0xcca610643c1df242c3c5ed3cfd30a7638d3a60dbe51039ccbb7bbc56823b9b14` | +0.0808 QOREDW |
| 2 | deposit 1.14 fUSD | yes | 26832 | `EDD58B15EE185A75C1876D94B48CE3742CD974E0919F9A9023DAB6F8402875A2` | send 77163CB18D… |
| 5 | buy BALDW 0.69 fUSD | yes | 28255 | `0x7f4ee767fe18abb59a54a050e29c3fba4bdd5456544252c79c50261f2f7215cf` | +0.0710 BALDW |
| 10 | buy DEGENDW 0.77 fUSD | yes | 26664 | `0x98da6ecd932d0d524f1f64aee1f63615ddb65adf54766658a61ba9598ad1f53f` | +0.0741 DEGENDW |
| 6 | sell BALDW 0.1154 | yes | 27724 | `0x183fb63b9bf73f2f3f9da55ed7b915ac3f6772c9b92b6cf657ae73cfc82b4298` | +1.1045 fUSD |
| 7 | buy QOREDW 1.14 fUSD | **NO** | 19360 |  | The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided A |
| 8 | sell QOREDW 0.1164 | yes | 27040 | `0xf139095eddc7f335e99ec93e1ae9f2c4c67d51e46ccc1d35c2c2ae47a5ed47d8` | +1.1480 fUSD |
| 4 | buy BLUEDW 1.98 fUSD | yes | 20118 | `0xb4989740d125c75947a5f5988da9ab9ab687b311d4efcf2e270af96669461cc2` | +0.2066 BLUEDW |
| 7 | deposit 2.46 fUSD | **NO** | 3349 |  | insufficient funds to cover the transfer or fee (failed to execute message; message index: 0: spendable balance 1633585erc20:0x97143B771D34ddb9130b807b135Ae675A |
| 3 | deposit 1.06 fUSD | yes | 17173 | `33B56DA62DBAB69511450EE521A3BC473D6859424961A7130A8168AD7D80BFD6` | send A5D0A1F666… |
| 9 | deposit 1.32 fUSD | yes | 20999 | `E1ED50C6F1004CFB3F5B3BF6612D92641BFF44F7097ACD0711D1262BDEB4A15C` | send 882A85F70E… |
| 2 | buy DEGENDW 0.15 fUSD | yes | 19540 | `0xe14da12ab8ba5c214ccd5d3a89d5a317a36c4919549d5b6c657cfed6724ccc81` | +0.0142 DEGENDW |
| 5 | buy DEGENDW 0.13 fUSD | yes | 14053 | `0xbd7a2993ed1dfbfdb0789fea0dafb7a867710df2aa3f3414ab240dc0666390b0` | +0.0124 DEGENDW |
| 7 | buy BLUEDW 1.90 fUSD | **NO** | 8450 |  | The contract function "execute" reverted with the following signature:
0x5c0dee5d

Unable to decode signature "0x5c0dee5d" as it was not found on the provided A |
| 8 | buy BALDW 1.50 fUSD | yes | 12358 | `0xef233a3c815b73a6dc9d08d6a859b2e7ece973efa05ea7f4003ce354e22d2a66` | +0.1547 BALDW |
| 3 | buy BLUEDW 1.30 fUSD | yes | 9472 | `0xb32d6e4b21d04c32aa9625d5591417d8526a577676ea5b9b07f9ad32441f0344` | +0.1358 BLUEDW |
| 9 | buy DEGENDW 0.51 fUSD | yes | 7313 | `0x4abf5bd22c3daafeac457ca162b96037f98fa84eacabb41a1b51182c389fa4f1` | +0.0496 DEGENDW |
| 2 | sell DEGENDW 0.0071 | yes | 6047 | `0xf171534b87d475d874c5f9b4ea2644bca9b2bd74082b36958f3b101896bc854c` | +0.0726 fUSD |
| 5 | deposit 1.11 fUSD | yes | 9098 | `60039031476FF55CDECFC7E3839FE75E32F734D5AE062BD1EBD49E6BA4C14263` | send A180C0CC35… |
| 9 | sell QOREDW 0.0921 | yes | 9893 | `0xd8e286415fbf70dc5e7c34ef72b9bff4e4ae7744a5e2fc4c3c24cb35e456254c` | +0.9083 fUSD |
| 5 | buy QOREDW 0.30 fUSD | yes | 5548 | `0xd88fe5780b55d41bace8ae1921454ee29f82bab5901eec3ca785b8616d4fe7cc` | +0.0297 QOREDW |
| 0 | exit: sell all QOREDW 0.0550 | yes | 6968 | `0x7475aa027b7509361084d058aaf657954f794a2bfde15764ae21f53526180a27` | +0.5424 fUSD |
| 1 | exit: sell all QOREDW 0.0334 | yes | 9155 | `0x49bc56d36382d61a6958c85621774c7bfc62ac7b6b5067a5c3bcc5784e7916d6` | +0.3293 fUSD |
| 6 | exit: sell all QOREDW 0.0735 | yes | 9590 | `0x61096edf80911e0253299f2dace58aa22c95c4dab5c13e11b07a692e05b02b25` | +0.7254 fUSD |
| 10 | exit: sell all QOREDW 0.0887 | yes | 11596 | `0x1cb66c7bfb4a23c45f633ec1253d05238bd672f13b5a88ceede0a532578b4313` | +0.8747 fUSD |
| 11 | exit: sell all QOREDW 0.0394 | yes | 12246 | `0xecbde1fb7e2a19c1769c67b8e8fd9e5335c96ec51cbf5fa8311f1acd9e88e7f5` | +0.3885 fUSD |
| 4 | exit: sell all QOREDW 0.0876 | yes | 13697 | `0xd6892b81c364a090495922f060ae8ed2bba615de3ac2b8731e41aa158b5de468` | +0.8641 fUSD |
| 9 | exit: sell all QOREDW 0.0921 | yes | 15938 | `0x1805080c303f2d6ebc22ed0f91d29eb8e1fbcccc8817af4380c083c02c7ccfd6` | +0.9083 fUSD |
| 8 | exit: sell all QOREDW 0.1164 | yes | 17333 | `0x32768f7fdd52aeea1e2a518291958a73b0b4f3d8c4e80a125034f3ca1cb74186` | +1.1480 fUSD |
| 5 | exit: sell all QOREDW 0.0297 | yes | 18788 | `0x6bf7b4c869991501ccf65d6976e06baee2f2bb4ef513a407bf16b7a8d4e5f91e` | +0.2928 fUSD |
| 7 | exit: sell all QOREDW 0.0565 | yes | 20344 | `0xd238df199328ff94f65206e959cfc26f3e48981ed0602d59dfc8d63b9fba1867` | +0.5578 fUSD |
| 3 | exit: sell all DEGENDW 0.1016 | yes | 21253 | `0x4eb206fb7005cd424e301a413edc9c204e492bab79d82f0343756155b55c6ba8` | +1.0380 fUSD |
| 2 | exit: sell all DEGENDW 0.0071 | yes | 22689 | `0x44ca675d0dacc3bbfa820138fcb0a0e2f1bc6ea7f706f8c768ecebeb4186998b` | +0.0726 fUSD |
| 0 | exit: sell all DEGENDW 0.0351 | yes | 16697 | `0x103710804eb8c464070e9f805f572aa48e1dba9b706e1921e1f4cbdef0910267` | +0.3583 fUSD |
| 6 | withdraw 3.5746 fUSD | yes | 53184 | `0x83a2c7c139b0475c73df61527195d4ff513d909e7c1749a445864f8e3697a926` | returned B7A13AF16A… |
| 1 | withdraw 1.3363 fUSD | **NO** | 61355 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 10 | exit: sell all DEGENDW 0.1414 | **NO** | 60967 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 11 | exit: sell all DEGENDW 0.0084 | **NO** | 60947 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 4 | withdraw 1.8701 fUSD | **NO** | 60517 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 9 | exit: sell all DEGENDW 0.0496 | **NO** | 61830 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 8 | exit: sell all DEGENDW 0.0334 | **NO** | 61722 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 5 | exit: sell all DEGENDW 0.0124 | **NO** | 61827 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 7 | withdraw 0.9984 fUSD | **NO** | 60505 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 3 | withdraw 2.0420 fUSD | **NO** | 60495 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 2 | withdraw 1.1457 fUSD | **NO** | 60520 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 0 | withdraw 1.7448 fUSD | **NO** | 60547 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 10 | withdraw 1.1103 fUSD | yes | 29331 | `0xdaeb000b441b69dfe12d018f1611774bd79879ff2893f679f310d0eba4b0879b` | returned DC7C44630B… |
| 11 | withdraw 0.5494 fUSD | **NO** | 60923 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 9 | withdraw 2.8181 fUSD | **NO** | 60942 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 8 | withdraw 1.8022 fUSD | **NO** | 60670 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 5 | withdraw 1.2936 fUSD | **NO** | 60595 |  | HTTP 504: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
