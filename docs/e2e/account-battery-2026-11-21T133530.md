# DarwinAccount battery, 2026-11-21T13:35:30.767Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 6 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: PASS.**

- users 6, rounds 3, operations 45 (45 ok), trades 31, deposits 8, withdrawals 6
- attacks 36, refused 36
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 0 failed
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 0 failed
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 0 failed
- double click (two messages for one nonce): 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer txs for nonce 4: 1 executed, 0 failed
- calls cut before their answer and resolved from the account's nonce: 0
- 37/37 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text for exactly one nonce; 37/37 hybrid-signed (ML-DSA-87) by the relayer
- trade latency (sign -> confirmed on chain, through the API): p50 5.4 s, p90 10.4 s, max 16.5 s
- failures: 0
- duration 214 s, 7.12 QOR of leftover gas returned

## State after the run

- relayer: serves 1 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer: EVM window none open
- relayer2: serves 1 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer2: EVM window none open
- relayer3: serves 1 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer3: EVM window none open
- relayer4: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer4: EVM window none open
- BLUEDW: supply 31.6264, NAV/share 9.6808
- BALDW: supply 29.2445, NAV/share 9.7728
- QOREDW: supply 11.0538, NAV/share 10.2117
- DEGENDW: supply 5.0534, NAV/share 10.5637
- Activity: 31/31 account trades listed
- user 0: deposited 5.21, withdrew 2.6319, wallet 9.4264 fUSD
- user 1: deposited 4.00, withdrew 3.1194, wallet 11.1194 fUSD
- user 2: deposited 4.00, withdrew 1.9610, wallet 9.9610 fUSD
- user 3: deposited 4.00, withdrew 3.1912, wallet 11.1912 fUSD
- user 4: deposited 5.16, withdrew 1.3422, wallet 8.1837 fUSD
- user 5: deposited 4.00, withdrew 1.2521, wallet 9.2521 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | replay its own last executed message | yes | refused: already executed in 9D2F99DE0204A01119E9597D4F2B682E29D5DD423554C702E036FF21C907441C, nothing sent |
| 0 | two messages signed for the same nonce, sent at once (a double click) | yes | refused cleanly: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer |
| 0 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a buy that pays someone else | yes | a trade must pay the account itself |
| 0 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | claim its own deposit twice | yes | refused: already credited |
| 0 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 1 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1srldwvc5zep5adcv9y8430z8gn27eh38p6wa8w |
| 1 | replay its own last executed message | yes | refused: already executed in CCC4AE2A111F8F43EEC0CC645EDC3811F1333FB84CCC475E098C5C7FADBEE153, nothing sent |
| 1 | two messages signed for the same nonce, sent at once (a double click) | yes | refused cleanly: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | refused: already credited |
| 1 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 2 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | replay its own last executed message | yes | refused: already executed in C84D0C81CADD8AD6AC7A619DDA77444D567966CAF40D0B9A4858BAB688AC134D, nothing sent |
| 2 | two messages signed for the same nonce, sent at once (a double click) | yes | refused cleanly: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 3 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | replay its own last executed message | yes | refused: already executed in B21C7F5E9368860324B6A761CBA8F8389CFC9BA44F7654A1895D3F2F57869954, nothing sent |
| 3 | two messages signed for the same nonce, sent at once (a double click) | yes | refused cleanly: 1 executed, 1 refused (Your previous action was still being confirmed. Nothing was sent: try again.); nonce 4 -> 5; relayer |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 1 | deposit 4.00 fUSD | yes | 7959 | `E930AAC23DD4343C0490B58E212A63D31DE14433BC918B86FCBBA8A9ED4268D0` | send CFFBE92632… |
| 0 | deposit 4.00 fUSD | yes | 8026 | `1C4231EE207DD87F6D1D4F4770D943BDCCE1E8AD0E2634D190A9C9C1BDDB94B3` | send FD3E718105… |
| 5 | deposit 4.00 fUSD | yes | 7574 | `92FD00BB20B3F8E4CC5199A8AABC9399AC599CF7431E6908007042CAEC5E7386` | send 7E8BF211D7… |
| 3 | deposit 4.00 fUSD | yes | 7795 | `070A908E52C19A07F709B48A1441E0FD35A66D3F9ABE0ECDB38DDEF59ACCE57D` | send E67E44C508… |
| 4 | deposit 4.00 fUSD | yes | 10245 | `CE7C585FD1347EB276A1E3C36C65F643F70484D7B7E872AA5458A436D7AD7812` | send B5D25EFFEE… |
| 0 | buy BLUEDW 0.71 fUSD | yes | 4900 | `52505BA4F95D49AC79507D038E339212C13E2AF82B4D3BD9945931FFE56EAD88` | +0.0729 BLUEDW |
| 5 | buy BALDW 0.56 fUSD | yes | 4929 | `01C81682EE56583B90563248E151DE2244AA36C73800C94B140F1B002FC9B0AE` | +0.0565 BALDW |
| 3 | buy DEGENDW 0.16 fUSD | yes | 4842 | `38DA3EF5DCCD24298CCC7B4AB2963C6E2FA3F4683B85195ED7AE31CE572BE5D1` | +0.0147 DEGENDW |
| 2 | deposit 4.00 fUSD | yes | 13507 | `DFBF0D25725854A5C2B1A8075DF7BED4C82E9A93FCF725C6813417E57B41E235` | send AABBF8C149… |
| 1 | buy BALDW 0.77 fUSD | yes | 8904 | `A1FB4B402039ADD7E3E757F3384BCC5792F7EFEF4F50578C99C1FF01CE9364BA` | +0.0783 BALDW |
| 5 | buy BLUEDW 2.47 fUSD | yes | 5213 | `A19CCF776DC620D1F4BC74855EC165D59649C7681F62A8ED2D97D6992BD20E68` | +0.2530 BLUEDW |
| 3 | buy DEGENDW 0.32 fUSD | yes | 5228 | `6CB9AF93877C1F2985723B2F857D108B80285795A93EC12B590136816429F199` | +0.0304 DEGENDW |
| 0 | buy BALDW 1.13 fUSD | yes | 5411 | `3E520182E8B56F61BE11098E2BDF91D7A39C91C99CF714585EB89D340E39A0E1` | +0.1145 BALDW |
| 2 | buy QOREDW 0.48 fUSD | yes | 4987 | `2BF493B1B12B9E312DDF0811EF99FA1AEAECB72A032B067D6B08F94E4867436F` | +0.0466 QOREDW |
| 1 | buy DEGENDW 0.66 fUSD | yes | 5127 | `F8703647EE24C34F28DF43371735728268C10FF0D22BF5D2A1B311CCA5DB26D5` | +0.0618 DEGENDW |
| 3 | buy BLUEDW 0.70 fUSD | yes | 5367 | `876F5DAACC1AB7892A06332F96E3CD23D00944653DC031C77AE76FE617E597A9` | +0.0717 BLUEDW |
| 5 | buy DEGENDW 0.24 fUSD | yes | 5243 | `D7605DB27EC5E864E2C7F3408CE49FAED09ECBF382A0312EF318625CB736E547` | +0.0225 DEGENDW |
| 4 | buy BLUEDW 1.33 fUSD | yes | 16506 | `D08FF8A58153508ACEAF531A81179867A7EC8EC3565A42D1C935618CF3633736` | +0.1356 BLUEDW |
| 0 | deposit 1.21 fUSD | yes | 7336 | `43F7B986E6BF484BFAAAD9EF13626E4C2D6A9B8902B5CBF60100F7C1584E98DE` | send ADB083BB0E… |
| 2 | buy BLUEDW 1.92 fUSD | yes | 10402 | `3E0A548A44828BA737FCB5A1AB5586F39342147F685B61E44F0F195D512D6079` | +0.1968 BLUEDW |
| 3 | buy QOREDW 0.35 fUSD | yes | 5408 | `B21C7F5E9368860324B6A761CBA8F8389CFC9BA44F7654A1895D3F2F57869954` | +0.0342 QOREDW |
| 5 | sell BALDW 0.0283 | yes | 5497 | `DFEE07FD4BB31096FD446B47DCA4EAB7762161072A8569C9DB7DAB93E9BD3B3E` | +0.2747 fUSD |
| 0 | buy BALDW 2.37 fUSD | yes | 5207 | `1FE4B797C9E94A58C78B4051CB54A92ED8D0989A8161C6DF79BCCF41A3AEE5E9` | +0.2408 BALDW |
| 4 | buy BALDW 1.13 fUSD | yes | 5265 | `F3C857490B31841707DBFC2FE223A25E860C827DE4BED48DBFBABFEC1DDAE879` | +0.1148 BALDW |
| 1 | buy QOREDW 0.27 fUSD | yes | 12589 | `16B64B445D8BAE1A063F4104E237F146AEF95CBAAEB7170AC70CA70A80D20744` | +0.0266 QOREDW |
| 0 | sell BALDW 0.1777 | yes | 4894 | `9D2F99DE0204A01119E9597D4F2B682E29D5DD423554C702E036FF21C907441C` | +1.7269 fUSD |
| 2 | buy QOREDW 1.41 fUSD | yes | 8866 | `3E9D9AFDDF215FA05DB2705549842B22E0ACCF80FEBB1858D3362283B3B2F520` | +0.1371 QOREDW |
| 4 | buy BALDW 1.37 fUSD | yes | 9188 | `10F7ABC2E7F3B865F157846ADE8C606549053E5D91DBD011FF9C09468FFA02F7` | +0.1388 BALDW |
| 1 | sell QOREDW 0.0133 | yes | 10439 | `CCC4AE2A111F8F43EEC0CC645EDC3811F1333FB84CCC475E098C5C7FADBEE153` | +0.1352 fUSD |
| 2 | sell QOREDW 0.0918 | yes | 9559 | `C84D0C81CADD8AD6AC7A619DDA77444D567966CAF40D0B9A4858BAB688AC134D` | +0.9322 fUSD |
| 4 | deposit 1.16 fUSD | yes | 8915 | `9E3A9F8536AC10681450FB711CDD64F471D910C371C60B56284807741719FE27` | send B8CBA413B7… |
| 4 | buy DEGENDW 0.35 fUSD | yes | 5422 | `3B6CE58C0B13DECE92EA2660C97118F0F993D3B9B45BC367C43C8C4E0D6588EC` | +0.0325 DEGENDW |
| 1 | exit: sell all QOREDW 0.0133 | yes | 5561 | `A971E311971656DC29EBACE68A4538D8095D266A438F425A21D91EEC892E81CD` | +0.1352 fUSD |
| 3 | exit: sell all QOREDW 0.0342 | yes | 5678 | `1199A5729D61B6876681FEDFBE0236D7E95C4AED0BC3D576949739F18CE057A6` | +0.3467 fUSD |
| 5 | exit: sell all DEGENDW 0.0225 | yes | 5871 | `58B73800A900DC58C8F47CCCB2E5B7A308E388591BE8828BEF481061ED2B6B8D` | +0.2361 fUSD |
| 2 | exit: sell all QOREDW 0.0918 | yes | 8817 | `94A0468CC3718F10FC6239BBF44C7E2FCA8F82BCEDDE22D45ADD6D350E295882` | +0.9322 fUSD |
| 3 | exit: sell all DEGENDW 0.0451 | yes | 5062 | `D67BF8DBC8FA5E2A195B26B37680B0771B3F75D5319A05ED6E25094857A068F5` | +0.4733 fUSD |
| 4 | exit: sell all DEGENDW 0.0325 | yes | 11900 | `7A3167A7AE6E92B01F3A71017312AA6D6299FEA7A530A315E0F2AB2AC78B4315` | +0.3411 fUSD |
| 0 | withdraw 2.6319 fUSD | yes | 12088 | `C162B472A84D6E6B70743275E54018DA19E299F4941D6DC24095E69057F6F99B` | returned C847BED53A… |
| 1 | exit: sell all DEGENDW 0.0618 | yes | 9856 | `1E89BC2606FC9FD409C7273047CF9D0794234BA02438C23135C1ACF4C7C76796` | +0.6485 fUSD |
| 5 | withdraw 1.2521 fUSD | yes | 10098 | `23352E29835FB0D46E08CAD1CB88BE8A60C39FE02038A359CD5DFBDF357463E6` | returned 178FECE646… |
| 3 | withdraw 3.1912 fUSD | yes | 10082 | `C8A6A71A9C2179A8D62ED6FF50576630247C57F956599B31E31DC0C527DE62DA` | returned 283E2AEAB0… |
| 2 | withdraw 1.9610 fUSD | yes | 14229 | `6E48D05BBFB07E8EDB03C256F68999EDF76FEA096EF56C2AEA75C3E423741B55` | returned BBB68AC914… |
| 4 | withdraw 1.3422 fUSD | yes | 17546 | `036CBFC9497BBA10A8B80E0D458CC2E5D2CFBD465FDB471CEDD80E26D1E23755` | returned 4C860C4C2F… |
| 1 | withdraw 3.1194 fUSD | yes | 20496 | `117EA4376175683B6D1B77D37D093B195C3A2D41F5061D75CA431645CB033AF7` | returned D99C61A8F1… |
