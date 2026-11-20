# DarwinAccount battery, 2026-11-20T22:53:42.442Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 3 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: PASS.**

- users 3, rounds 2, operations 19 (19 ok), trades 13, deposits 3, withdrawals 3
- attacks 24, refused 24
- 16/16 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 4.4 s, p90 12.8 s, max 13.7 s
- failures: 0
- duration 102 s, 4.61 QOR of leftover gas returned

## State after the run

- relayer: EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 951 txs left
- BLUEDW: supply 13.6521, NAV/share 9.5149
- BALDW: supply 12.9196, NAV/share 9.6243
- QOREDW: supply 6.9733, NAV/share 9.9234
- DEGENDW: supply 3.2762, NAV/share 10.2771
- Activity: 13/13 account trades listed
- user 0: deposited 4.00, withdrew 3.7121, wallet 11.7121 fUSD
- user 1: deposited 4.00, withdrew 2.3360, wallet 22.2095 fUSD
- user 2: deposited 4.00, withdrew 2.8396, wallet 10.8396 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1hrre87xdduy75p0lmkl6r82meqeknmpcc3yle2 |
| 0 | replay its own last executed message | yes | the classical signature does not verify |
| 0 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a buy that pays someone else | yes | a trade must pay the account itself |
| 0 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | claim its own deposit twice | yes | refused: already credited |
| 0 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |
| 1 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1uz6qxdvfgjrqmk56n0mcrfwfpww73mnclh99jv |
| 1 | replay its own last executed message | yes | the classical signature does not verify |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | refused: already credited |
| 1 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |
| 2 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1qk4w0x2hj4cd0ynu5mvycl6sg68x7fk2q3tf08 |
| 2 | replay its own last executed message | yes | the classical signature does not verify |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayer in that transaction |

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 2 | deposit 4.00 fUSD | yes | 7829 | `AB19C9517771F5409CF2C08EBD5329129BE799B2AD99FB79D4EFEA91DD094112` | send 32B9F69F9D… |
| 1 | deposit 4.00 fUSD | yes | 11178 | `3FC60CF504FD1098E91C9437B0697B8A741C9B0E24BF23F0E02C3E5DE6896709` | send 0C7FFCF8B6… |
| 0 | deposit 4.00 fUSD | yes | 13283 | `55D605C623C0DC72C9A89FF189E13CACB3A3160476E5D6F0CEFC2E1EE524DAAE` | send A6CDF62D96… |
| 2 | buy QOREDW 0.38 fUSD | yes | 13654 | `0x6ccab36c6fb9ca89d930d496f3e50c89bdd09c9c62b80085014faa349a914caa` | +0.0376 QOREDW |
| 1 | buy BALDW 0.71 fUSD | yes | 12495 | `0x0588a10436c58f5ff59558769af13080b97b075f305277650658b4d0623753c5` | +0.0733 BALDW |
| 0 | buy BLUEDW 0.56 fUSD | yes | 9734 | `0x915cb982e06d8c47212b20e634be9052d75f67452745fae5cedd80f1e2d5899f` | +0.0580 BLUEDW |
| 2 | buy BLUEDW 1.16 fUSD | yes | 3381 | `0xa03578afe4b1dc7a82e831ffef7f98092af34fa15131ab1357a7f6e88c0f8a13` | +0.1203 BLUEDW |
| 1 | buy QOREDW 0.34 fUSD | yes | 2548 | `0xb18b7520ea55f9eb890272d0152991006f2a1902f1bd3081e03033cbebcd1c51` | +0.0343 QOREDW |
| 0 | sell BLUEDW 0.0290 | yes | 3373 | `0x4443597ad7aa8c63a7746ee4b8210b842259789e68ac992867b73da2776d813d` | +0.2738 fUSD |
| 2 | buy DEGENDW 0.32 fUSD | yes | 3805 | `0x536ccd4b45a938003493bd6113a45eb975ec59dd33c3637de9afd1ac05051ef6` | +0.0312 DEGENDW |
| 1 | buy BLUEDW 0.95 fUSD | yes | 3691 | `0xc89634c9635853973fd2032134c3066df7ca462acf9e0e0abfe9320919075537` | +0.0993 BLUEDW |
| 0 | buy DEGENDW 0.53 fUSD | yes | 3284 | `0xff4b2342ed884c81fe85145050ec811f6a801b68dce70d04b4104ac1fd24d30e` | +0.0512 DEGENDW |
| 1 | exit: sell all QOREDW 0.0343 | yes | 4408 | `0x267a6e7abdf4dbbf11a99a15023a333c3a2debf8853663ba4362ba080ac63cfb` | +0.3384 fUSD |
| 2 | exit: sell all QOREDW 0.0376 | yes | 4736 | `0x16bd444771e6eb14edd8c73795ab87fdff211406010bcfc51873b9f64f34f349` | +0.3713 fUSD |
| 0 | exit: sell all DEGENDW 0.0512 | yes | 6061 | `0xc6a389e33dbe33d7ee5a86ecb4596f8f471bb1ae8e9c79a1e6b1ec6ab97acdd8` | +0.5232 fUSD |
| 2 | exit: sell all DEGENDW 0.0312 | yes | 12811 | `0xb9da1069ce86200e614d6db900277a8efd078577977d41ad161dd93f562435ff` | +0.3191 fUSD |
| 1 | withdraw 2.3360 fUSD | yes | 13484 | `0x7d5115f01ba8cd9de3e4af4ba9a306173791b81713ffad031c83d3fec070ea9a` | returned EA74DD599D… |
| 0 | withdraw 3.7121 fUSD | yes | 19059 | `0x3beffdc215b420f51ffc3f65d3637d0d7d6c9bbcf0a4a6c4bd4c646d4f36cd51` | returned A7FF14B486… |
| 2 | withdraw 2.8396 fUSD | yes | 14752 | `0x0ced7f8ec4f8724212c6e830075c068f6cc8a7ef70332107efa89dc0edc9dded` | returned 48CAD83893… |
