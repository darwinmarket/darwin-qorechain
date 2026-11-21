# DarwinAccount battery, 2026-11-21T13:30:01.841Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 6 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: FAIL.**

- users 6, rounds 3, operations 44 (44 ok), trades 32, deposits 6, withdrawals 6
- attacks 36, refused 36
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 1 failed
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 0 failed
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 1 failed
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 0 failed
- calls cut before their answer and resolved from the account's nonce: 0
- 38/38 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text for exactly one nonce; 38/38 hybrid-signed (ML-DSA-87) by the relayer
- trade latency (sign -> confirmed on chain, through the API): p50 7.6 s, p90 11.3 s, max 15.3 s
- failures: 10
- duration 211 s, 15.98 QOR of leftover gas returned

## State after the run

- relayer: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer: EVM window none open
- relayer2: serves 0 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer2: EVM window none open
- relayer3: serves 0 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer3: EVM window none open
- relayer4: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer4: EVM window none open
- BLUEDW: supply 30.8556, NAV/share 9.6807
- BALDW: supply 28.7067, NAV/share 9.7727
- QOREDW: supply 11.0538, NAV/share 10.2117
- DEGENDW: supply 5.0534, NAV/share 10.5637
- Activity: 32/32 account trades listed
- user 0: deposited 4.00, withdrew 7.5150, wallet 23.5150 fUSD
- user 1: deposited 4.00, withdrew 4.9711, wallet 20.9711 fUSD
- user 2: deposited 4.00, withdrew 5.4276, wallet 21.4276 fUSD
- user 3: deposited 4.00, withdrew 6.2711, wallet 22.2711 fUSD
- user 4: deposited 4.00, withdrew 6.4954, wallet 22.4954 fUSD
- user 5: deposited 4.00, withdrew 6.6214, wallet 22.6214 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1u54mltqgmuz94glscqrfl28q73lccxqg36g4ra |
| 0 | replay its own last executed message | yes | refused: already executed in 037FB53306455647E430F5C34C55F0EB19E9E677C2961E6719A35C0EEF1EA42B, nothing sent |
| 0 | two messages signed for the same nonce, sent at once (a double click) | yes | UNEXPECTED 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs f |
| 0 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a buy that pays someone else | yes | a trade must pay the account itself |
| 0 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | claim its own deposit twice | yes | refused: already credited |
| 0 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 1 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | replay its own last executed message | yes | refused: already executed in B5A49D7CCFE86DEE9164D4729777212BAC7E0048D6F20C7B5FF7E1407C7D9231, nothing sent |
| 1 | two messages signed for the same nonce, sent at once (a double click) | yes | refused cleanly: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | refused: already credited |
| 1 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 2 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1qd5zhvy2atjdxnshakqkm25ursjn3q2y0rscp5 |
| 2 | replay its own last executed message | yes | refused: already executed in 78AF9BDD4EDE0F9E421E10C46295A833A116D7C63ACA278B689AE30D03D3254D, nothing sent |
| 2 | two messages signed for the same nonce, sent at once (a double click) | yes | UNEXPECTED 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs f |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 3 | sign for another user's account (owner = victim) | yes | the classical key does not control qor17zzfycvksr66q7xuw848r5hxc39mcjnpa25pm6 |
| 3 | replay its own last executed message | yes | refused: already executed in 6AE3165F6554F0743DA32D3B2C1FEFCD2399A346D252FBA4D748C9E785B7C1F2, nothing sent |
| 3 | two messages signed for the same nonce, sent at once (a double click) | yes | refused cleanly: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |

## Failures

- user 0 double click: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 1 failed
- user 2 double click: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 1 failed
- user 0: account nonce 8, executed 7
- user 2: account nonce 7, executed 6
- user 0 withdrew more than it deposited
- user 1 withdrew more than it deposited
- user 2 withdrew more than it deposited
- user 3 withdrew more than it deposited
- user 4 withdrew more than it deposited
- user 5 withdrew more than it deposited

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 5 | deposit 4.00 fUSD | yes | 7342 | `E4528C5FB54FEE5D9FF9C9F62F5119133C758CA27C81FF7FFD9B4993160B3FF8` | send 128EF46B4E… |
| 4 | deposit 4.00 fUSD | yes | 8028 | `F900B8BA9D30BA219E0BC546FBF16B9AD8D7E10386D604BA6486288CFFFD3091` | send 5DDF66AAAD… |
| 1 | deposit 4.00 fUSD | yes | 10644 | `AFACA15E12A249E8C2C1DCC62C95035C91C2F7B78CD66655B424C199D4AC85F2` | send CFFF2CE2CE… |
| 3 | deposit 4.00 fUSD | yes | 10752 | `7984D5A14DD88B0DAA957E57BE556A948FAEC6880E31D6154E9645A2EADEAF73` | send 28E1FD1637… |
| 5 | buy BALDW 0.77 fUSD | yes | 5024 | `6342183E2CCF227FDBBD54657A27302E57444682F7740FF07EAEA1A6C4292FDF` | +0.0783 BALDW |
| 2 | deposit 4.00 fUSD | yes | 13792 | `2D6B8AF135420853D4D800ECA6D720F7B424D79FEA8EB412783DC027FAFAF055` | send FCDD900E55… |
| 0 | deposit 4.00 fUSD | yes | 16042 | `51F9FC752FAE3651DD4BC4E8ACB85BBA1100CD3A74727D04B042E16C63187ABC` | send 26BC57F05E… |
| 4 | buy BLUEDW 0.71 fUSD | yes | 7457 | `4D6C6EEF3F24F5BE33F36C4BE1C5B02F4545860629766AD11F81FDE395AEA18C` | +0.0729 BLUEDW |
| 1 | buy BALDW 0.56 fUSD | yes | 7289 | `6253C27F9B2221D141F783EDA7947019EEE4C842C4FFC2599FC224C871E3B1A6` | +0.0565 BALDW |
| 3 | buy DEGENDW 0.16 fUSD | yes | 7932 | `B0B7EE4CA89D0FFCD832E2EFC4668E85C2C3B9927781BAA8992F1398EFD46E72` | +0.0147 DEGENDW |
| 5 | buy BALDW 1.95 fUSD | yes | 8367 | `26E20FE05648D4C37C5384838A4642347068D7D0B02324AD1FA31F192741ADF7` | +0.1982 BALDW |
| 2 | buy QOREDW 0.61 fUSD | yes | 7868 | `DB7CBECF1EDF8E6F63103691C408B92AEF93665DA858CC9259A98A56B5490902` | +0.0591 QOREDW |
| 1 | buy DEGENDW 0.32 fUSD | yes | 5119 | `EF39E917C34DE336B37DFCF8E1AC015B6C31B3F337887A4683FDB090577E1A7E` | +0.0304 DEGENDW |
| 3 | buy BLUEDW 0.95 fUSD | yes | 5070 | `67D90272D49531CCC29135700D1AEB27F2EC14526EA4A7885DF1257DFB772D9E` | +0.0974 BLUEDW |
| 0 | buy BLUEDW 0.72 fUSD | yes | 11694 | `1C357657D9F6788F6D5898FE0FDC03C10B4E58B539BCFBAB5D85D4047CCE62CA` | +0.0738 BLUEDW |
| 2 | buy BLUEDW 0.70 fUSD | yes | 5380 | `2A44CFBA70FF8DDB1D9657D0775C27F57F1006964103080648C56B8DE5191D85` | +0.0717 BLUEDW |
| 1 | buy BALDW 2.37 fUSD | yes | 5088 | `A16E1CC46BB39277CBE58CA75436DB80A1ACFE5ECD5791CEF77C4B8B95B71EC0` | +0.2408 BALDW |
| 5 | buy DEGENDW 0.53 fUSD | yes | 8579 | `26735442B2932FA34D73CC7F3A9D56C93DE52C73053D72D38C257487B4409B4C` | +0.0498 DEGENDW |
| 4 | sell BLUEDW 0.0365 | yes | 15315 | `B6E413E15480AC840AF941C7E93048D16047DCCB15073E287FB0CD402F254008` | +0.3504 fUSD |
| 0 | sell BLUEDW 0.0369 | yes | 5077 | `D0269160132517323FEFD65E3BF03721C96AF7F2C05D5870CB1BCF960DDB785C` | +0.3545 fUSD |
| 3 | sell BLUEDW 0.0487 | yes | 9243 | `D1E0AACF0F557C8E2692D09318B10E798FD600034BD14E06BE49CD32D90DA870` | +0.4684 fUSD |
| 1 | buy QOREDW 0.35 fUSD | yes | 6293 | `B5A49D7CCFE86DEE9164D4729777212BAC7E0048D6F20C7B5FF7E1407C7D9231` | +0.0342 QOREDW |
| 2 | buy QOREDW 0.27 fUSD | yes | 9027 | `080DD07776777F2E15CC5E49C7B4DA6B7EC51C74CA5B55B440894E41CE94E4FC` | +0.0266 QOREDW |
| 5 | sell BALDW 0.1383 | yes | 8262 | `2A3E93EC4E6B346E8373B0F9C7FC8C7852CEF63CADCECE1636393D212FB116F2` | +1.3441 fUSD |
| 4 | buy BALDW 1.13 fUSD | yes | 8925 | `BAFE5FE506198F68B16C8DA257683E57C2933B37063F44703E75811B4BB568CA` | +0.1148 BALDW |
| 0 | buy QOREDW 1.41 fUSD | yes | 9360 | `7A33C437C0E5ACD0B8B8C3EE7B3C48C22D135EF228FC4E9523E188AF26DDF934` | +0.1371 QOREDW |
| 2 | buy BALDW 1.76 fUSD | yes | 4988 | `78AF9BDD4EDE0F9E421E10C46295A833A116D7C63ACA278B689AE30D03D3254D` | +0.1785 BALDW |
| 3 | buy BALDW 1.14 fUSD | yes | 11859 | `6AE3165F6554F0743DA32D3B2C1FEFCD2399A346D252FBA4D748C9E785B7C1F2` | +0.1157 BALDW |
| 0 | buy DEGENDW 0.35 fUSD | yes | 5736 | `037FB53306455647E430F5C34C55F0EB19E9E677C2961E6719A35C0EEF1EA42B` | +0.0325 DEGENDW |
| 4 | buy QOREDW 1.41 fUSD | yes | 7218 | `490FB1BBD98E8B8EBDAFF32D0A1A1665840C71BC99A744549BCF836F4505CD45` | +0.1364 QOREDW |
| 0 | exit: sell all QOREDW 0.1371 | yes | 5817 | `6A27BDCE39CAFF0250A044C739197542C6144DCEB2AEF20A57C041C99A8655C8` | +1.3917 fUSD |
| 4 | exit: sell all QOREDW 0.1364 | yes | 6050 | `465C83ADB180FDBB65CD681018FD27EF38AAB2058BA97DF013F57C5827B04774` | +1.3841 fUSD |
| 1 | exit: sell all QOREDW 0.0342 | yes | 7553 | `0B6136F65E1D6C71597584720103A291B124C6220DB3B694B4CFCFDA03EA0A57` | +0.3467 fUSD |
| 3 | exit: sell all DEGENDW 0.0147 | yes | 7513 | `73004A2A98EEBD8672E15ADDA6E35A43C460C20D85210333C4286235C993A5AE` | +0.1542 fUSD |
| 5 | exit: sell all DEGENDW 0.0498 | yes | 8940 | `D7199414892BF5D1DE06DF4373F26308455D39CAD5C1D938833C0D11C07855A0` | +0.5232 fUSD |
| 2 | exit: sell all QOREDW 0.0857 | yes | 11340 | `D62ED951B582866837E504F6F7D0438F22D87E4442815D0977FF5438F22EAF4B` | +0.8698 fUSD |
| 0 | exit: sell all DEGENDW 0.0325 | yes | 6167 | `B2189B363303871ED8CC74BC51E67E3217DEAA3EE1420CEF45239B6368873533` | +0.3411 fUSD |
| 1 | exit: sell all DEGENDW 0.0304 | yes | 9397 | `97E9BBFAA92283417797885DEC3F370BAE5FA97108D1E27F758D1E6CD4FF69A2` | +0.3191 fUSD |
| 4 | withdraw 6.4954 fUSD | yes | 12544 | `AAB6C6C01A4653A84947A9E5ADFD3581B75B972B2172ABD0CC3816801B4C017A` | returned 1DC4EC8FBA… |
| 5 | withdraw 6.6214 fUSD | yes | 12194 | `3A196D6B120894956F555E73BA406EC61EBE0C759C6F207541189066C8377C0F` | returned 3C95BD4DFC… |
| 3 | withdraw 6.2711 fUSD | yes | 17256 | `6ED79934E488C79EA4F2C4562304CC1D8408A912F8171657468D937EA3341C9C` | returned 5FA947A2CA… |
| 0 | withdraw 7.5150 fUSD | yes | 15944 | `3975A9A7A92D8A58B240328A9318209D09D04A7093E9D7BBB9FB70DB634BEC64` | returned A202409BD6… |
| 2 | withdraw 5.4276 fUSD | yes | 20029 | `903332666A6E864984B9150589D76F2A52B7AC403867D8A17DF082C6E546FABA` | returned DD9BAAE64B… |
| 1 | withdraw 4.9711 fUSD | yes | 16862 | `952DC653C4F88014C5F8BB7C6A6CA239DD81A51D26029F5AA8C0BB774CC08A7D` | returned A14418C013… |
