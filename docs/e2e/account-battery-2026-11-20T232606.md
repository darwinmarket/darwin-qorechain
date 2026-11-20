# DarwinAccount battery, 2026-11-20T23:26:06.913Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 12 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: FAIL.**

- users 12, rounds 5, operations 117 (115 ok), trades 89, deposits 14, withdrawals 12
- attacks 32, refused 32
- 101/101 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 8.2 s, p90 12.1 s, max 15.6 s
- failures: 5
- duration 308 s, 14.30 QOR of leftover gas returned

## State after the run

- relayer: serves 2 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 860 txs left
- relayer2: serves 4 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer2 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 968 txs left
- relayer3: serves 2 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer3 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 982 txs left
- relayer4: serves 4 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer4 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 965 txs left
- BLUEDW: supply 16.4791, NAV/share 9.5457
- BALDW: supply 15.5463, NAV/share 9.6487
- QOREDW: supply 7.0967, NAV/share 9.9112
- DEGENDW: supply 3.5214, NAV/share 10.2462
- Activity: 87/89 account trades listed
- user 0: deposited 4.00, withdrew 2.9209, wallet 10.9209 fUSD
- user 1: deposited 4.00, withdrew 3.6692, wallet 11.6692 fUSD
- user 2: deposited 4.00, withdrew 2.0489, wallet 10.0489 fUSD
- user 3: deposited 4.00, withdrew 3.5226, wallet 11.5226 fUSD
- user 4: deposited 4.00, withdrew 3.0200, wallet 11.0200 fUSD
- user 5: deposited 4.00, withdrew 3.6423, wallet 11.6423 fUSD
- user 6: deposited 4.00, withdrew 1.2239, wallet 9.2239 fUSD
- user 7: deposited 6.01, withdrew 0.3280, wallet 6.3217 fUSD
- user 8: deposited 4.00, withdrew 1.5737, wallet 9.5737 fUSD
- user 9: deposited 4.00, withdrew 3.6061, wallet 11.6061 fUSD
- user 10: deposited 6.48, withdrew 1.8697, wallet 7.3893 fUSD
- user 11: deposited 4.00, withdrew 2.1035, wallet 10.1035 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | replay its own last executed message | yes | the classical signature does not verify |
| 0 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 0 | a buy that pays someone else | yes | a trade must pay the account itself |
| 0 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 0 | claim its own deposit twice | yes | refused: already credited |
| 0 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 1 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1pzee2fjd4wmgq7s6ce6c439yalmlu0jjm52yxm |
| 1 | replay its own last executed message | yes | the classical signature does not verify |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | refused: already credited |
| 1 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 2 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1yhzauphmpnj5f9q76jhj4pfk0uxxrntt46f427 |
| 2 | replay its own last executed message | yes | the classical signature does not verify |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 3 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | replay its own last executed message | yes | the classical signature does not verify |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |

## Failures

- user 7 exit: sell all QOREDW 0.1234: Timed out while waiting for transaction with hash "0x1381bc01da94e102dfec790454ea4aebd85f78717c047edab4cdbb9177f21d22" to be confirmed.

Version: viem@2.57.17
- user 9 exit: sell all QOREDW 0.1087: HTTP 524: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endi
- user 9: account nonce 9, executed 8
- user 4: Activity lists 6 account trades, made 7
- user 6: Activity lists 7 account trades, made 8

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 4 | deposit 4.00 fUSD | yes | 8000 | `D7B3467CB8B905F2E778A0880436DA6BCE5735B51C58A38BAAC57412FF385044` | send 5120FB5C75… |
| 6 | deposit 4.00 fUSD | yes | 7681 | `6C7B501EE4928BF31C2B77C219D8B1768A2DE3FE9A7827BD8A8FB1E754C5D8D8` | send C0FAC82454… |
| 7 | deposit 4.00 fUSD | yes | 7602 | `2F63CEC4122105018EB8104F414179A6D9FF117091787E867CD1CA39B0EF5102` | send C4D5E250F7… |
| 3 | deposit 4.00 fUSD | yes | 7529 | `FCB7B0AEB76FC35793BFE8E63A582604962D5F01B2F30E7508792ECFEA3DF078` | send 5CC58EFE6B… |
| 5 | deposit 4.00 fUSD | yes | 8565 | `125F8351290B7C45F6A5E9EECC04941C5006CB4B110B38146CB3BE5C7CE8C3B3` | send 26F228E8B3… |
| 8 | deposit 4.00 fUSD | yes | 8760 | `208EB2C0EBE26AA5AE2FAC20E73A09A63340AD7F894FCF7BE1C60D189F20ADA0` | send A2B00F3A9A… |
| 11 | deposit 4.00 fUSD | yes | 8899 | `02BA1417B4F02A1FCBF7DDE03E2983A53A4BC216CF804BEE403B93A690F6BD5E` | send B155B7EDD9… |
| 10 | deposit 4.00 fUSD | yes | 9301 | `C35C14E3305C7B9672123B0021C19EA5C7DF2D36603D035E8D5456A0CF1DD8CD` | send D3269436A0… |
| 9 | deposit 4.00 fUSD | yes | 10542 | `304BB52B041AF815475A423FED4D83937A9F5821D3F864105271371E76672132` | send E97069CE3F… |
| 1 | deposit 4.00 fUSD | yes | 10855 | `CF7382428C20EAC4119BD744B82A17D6FF978E17F0A56BA131448A00B024F1ED` | send 2CEF9FFB56… |
| 7 | buy DEGENDW 0.12 fUSD | yes | 4060 | `0xff5505755dbd369a77fa3308b7747ba8a601d52bbf2ed8502b4493455e7d2153` | +0.0116 DEGENDW |
| 2 | deposit 4.00 fUSD | yes | 12782 | `6C8CBFF55F0DD3311C63607D3F5B10D37BB041BF22BF131E9B9D0D77F6BDAEA4` | send 6CE6B9C30A… |
| 10 | buy QOREDW 0.61 fUSD | yes | 3251 | `0x6d774540d2e36e6e7e783c7163ba863b50f32f888ee791a60a8bb82d93d285f7` | +0.0608 QOREDW |
| 4 | buy BLUEDW 0.77 fUSD | yes | 6444 | `0x4c0dec0a9de3b76a10927ec590cac8bdc82400e12b075b1cba1a134726d49602` | +0.0801 BLUEDW |
| 6 | buy QOREDW 0.34 fUSD | yes | 6191 | `0xc357fea0b4c21d504ec06d0354e19f526fb075d95d3e4b3a4ac320819ec3937d` | +0.0338 QOREDW |
| 0 | deposit 4.00 fUSD | yes | 15514 | `A844813A25096FD6E8935C73EC111F71833C3EFD3DD57C930F22F0386DDE9CBF` | send E5B8A7A049… |
| 3 | buy DEGENDW 0.16 fUSD | yes | 7974 | `0x73f86f1d3d7b2e894abf9f05c5c533e98bdf17f5cf52caf95146c721acee4486` | +0.0151 DEGENDW |
| 11 | buy DEGENDW 0.61 fUSD | yes | 6960 | `0x7f0888be025c8dbae60e1c0973f8c2e0221451220e29eceeffe4267eb8ef16d9` | +0.0589 DEGENDW |
| 8 | buy BLUEDW 1.16 fUSD | yes | 7745 | `0xa5b89f1afef295346d7d4bd086e01f502c7d0bf603cdec2bf05483e20507e687` | +0.1201 BLUEDW |
| 10 | buy BALDW 2.00 fUSD | yes | 6522 | `0x438399ab20c4608bf0df1ff2bd05c400a3970c26d8c394af869dc42163ee6ba9` | +0.2058 BALDW |
| 2 | buy QOREDW 0.90 fUSD | yes | 6751 | `0xb51bf515472c4794241af76d48a2b4f6460f9151d2adead3a38310f696e1c615` | +0.0901 QOREDW |
| 9 | buy BALDW 0.72 fUSD | yes | 10030 | `0xd473f2194c7c4845102086cdd30a448f2ac2cccf641fcd3099c1535004f2fef6` | +0.0741 BALDW |
| 0 | buy BLUEDW 1.62 fUSD | yes | 5489 | `0xa6e1ad52dc9fe531821e3396bbca67af43fd73f8fabd1906209b17377c27a746` | +0.1684 BLUEDW |
| 5 | buy BALDW 1.33 fUSD | yes | 12697 | `0xa7900e2f01f7b85387dc36424313442adf4fba154249d8ab537b39a88ddb0ff7` | +0.1362 BALDW |
| 4 | sell BLUEDW 0.0401 | yes | 7192 | `0xde24d7fe04be256feb79e1ca6ee01f6625eb0bc429a5a55025891ca3d0cb8946` | +0.3799 fUSD |
| 6 | buy DEGENDW 0.17 fUSD | yes | 6662 | `0xa5246f35a5164a6240c47938237e8ad06437007837a30fc6ba7e86d0983bcd0b` | +0.0166 DEGENDW |
| 7 | sell DEGENDW 0.0058 | yes | 9855 | `0x27eb0817bd63274bf98ecf7af29b35772d051edf8637ba2000f3eb63b3158bd8` | +0.0591 fUSD |
| 1 | buy BALDW 0.61 fUSD | yes | 11418 | `0x4553f32fa30cf4a1238326db685745bf4914c16be5bacac407ac1764c5ccb029` | +0.0623 BALDW |
| 8 | sell BLUEDW 0.0600 | yes | 9312 | `0xeb6a158f5de4a93dbdcd660c829058074efadd9153b85a30400a6ad0b836bd9e` | +0.5692 fUSD |
| 10 | buy QOREDW 0.27 fUSD | yes | 6238 | `0xf1780234a1e5815db43678010743601b1f268f84a32a31816ae1a124677d41f9` | +0.0274 QOREDW |
| 3 | buy BLUEDW 0.92 fUSD | yes | 9904 | `0x50e6963d075baf73dac05f3d50f167a1bd8b0a8098851ad628e497c5732f3fa6` | +0.0955 BLUEDW |
| 11 | buy DEGENDW 0.55 fUSD | yes | 9851 | `0x71c750ee1d4d1290e39a576932a4f5233a482924b3222d0da2b1c6a0a4fe7072` | +0.0527 DEGENDW |
| 2 | buy QOREDW 0.35 fUSD | yes | 8010 | `0x80e910b13e4cd288df300444ffb9f076052d1e0cf7113e21a829cf0f07e0f938` | +0.0352 QOREDW |
| 0 | buy BALDW 1.94 fUSD | yes | 6225 | `0x8d154d9aa309d4191c7f8e2b298b4c9bfe8b7d4fe10ef4b0292cbd61e6240617` | +0.1996 BALDW |
| 6 | buy BALDW 1.13 fUSD | yes | 6393 | `0xb128bc7a65161f7098084688677a3cd4d4168e8c34dc7e8eb413527c2192b862` | +0.1161 BALDW |
| 3 | sell DEGENDW 0.0076 | yes | 3364 | `0x2e7c05337e18d07a4ba4be4b8df6e34c0537ba4b45597c8d54ffd34056417fa6` | +0.0771 fUSD |
| 11 | sell DEGENDW 0.0558 | yes | 3414 | `0xc636decf1707c6b7f23e7e217d910e30cd8007f43704c77e75f3728f8a33c0d3` | +0.5682 fUSD |
| 4 | buy BALDW 1.14 fUSD | yes | 8094 | `0x10e494a1e8beb9781068213abaa80defb9f38803de491f8407001249b4429f49` | +0.1172 BALDW |
| 5 | sell BALDW 0.0681 | yes | 9469 | `0x4b43c2a65222782c886a58d87dbbce79528a4b0ede229cc50b13852437683ff2` | +0.6531 fUSD |
| 9 | sell BALDW 0.0370 | yes | 10487 | `0x0ad1d35e80188398326c25b539f6ee07dbd1dba8217aaff142361ff8ef0e05d4` | +0.3556 fUSD |
| 10 | buy BALDW 0.63 fUSD | yes | 6765 | `0x14236f97d1127d1020b00e09b931b18e7192df35829314646bab3e172167cca9` | +0.0643 BALDW |
| 8 | buy BALDW 0.95 fUSD | yes | 5820 | `0x5ce9e1f5f8080f67bc8d983ca3201643669ba0ec8b7c21bd1fd6e1497902aa08` | +0.0976 BALDW |
| 1 | buy DEGENDW 0.36 fUSD | yes | 10158 | `0xff748d55fc90312ed28675f59020657bb932b60e389efd4e9d4b8601da8b5bcf` | +0.0351 DEGENDW |
| 7 | buy BALDW 1.85 fUSD | yes | 11743 | `0xbc883a69c2eea747544329072d1740b1eefa56974bf0019705e4c88b86345c8b` | +0.1901 BALDW |
| 2 | buy QOREDW 0.36 fUSD | yes | 7489 | `0x9eced93cf6145ad39cee1bd0002993d2400d867c6b7d019418816c3a5948f943` | +0.0361 QOREDW |
| 0 | sell BALDW 0.0998 | yes | 8668 | `0xe3dbbf05f33589db4410b023c1c0e75575f107e29ac6cf73a4f83c5da71f03ac` | +0.9578 fUSD |
| 6 | buy BLUEDW 0.67 fUSD | yes | 9446 | `0x48d75eafb3e770b73d0ccfab822735aecbf2a7e8469897ee60bcb9e5bb802ea7` | +0.0696 BLUEDW |
| 11 | buy QOREDW 1.26 fUSD | yes | 7697 | `0x460dbead16c2e163ce34d0f3618378a54147456a3e0667551ae28a54d58a0f7e` | +0.1256 QOREDW |
| 9 | buy QOREDW 1.10 fUSD | yes | 6668 | `0x72bed26ef4c644a9c1a7adfd1830723a4f5d324aa6d3e5f77fc6f56c32b8d206` | +0.1099 QOREDW |
| 3 | buy QOREDW 0.89 fUSD | yes | 9038 | `0x0ed437ad040fea6c009970529452362132f5a2a2a84b5c5fc558a24442ddb902` | +0.0888 QOREDW |
| 4 | sell BALDW 0.0586 | yes | 9289 | `0x56e066eabfa9e172c23288773a45f21c6e630de4af316501c5d51d1c77c90cfc` | +0.5621 fUSD |
| 10 | deposit 2.48 fUSD | yes | 8586 | `DBADB91D011E1C4ABD2015D9AA9BD4778CE64FBFD44EB58B30FB61E3DC885B1A` | send 4C118D7A08… |
| 5 | buy DEGENDW 0.49 fUSD | yes | 12234 | `0xb3f01bad2ef8ad6c81c8820e33dc5caf80b3fdfd92a3bebeb5be7d26198c5b57` | +0.0477 DEGENDW |
| 11 | sell DEGENDW 0.0279 | yes | 4896 | `0x774ae1c02a5d0a36033e76c19592af292ff391f515271cc0cfee707d1df09016` | +0.2841 fUSD |
| 8 | buy QOREDW 1.35 fUSD | yes | 9590 | `0xb82e3269518bcce708120b5a6a03c7c288a29e26ecfa184519212162eab2b529` | +0.1349 QOREDW |
| 7 | buy QOREDW 1.23 fUSD | yes | 11634 | `0xa81c918400b59b86c07839352e3b5d76c9dceefe934f4439a91bebd3a57ebd33` | +0.1234 QOREDW |
| 6 | sell DEGENDW 0.0083 | yes | 8509 | `0x59f412c07e9a5a135cc7fcb021f2341614853aacf35b64fff7dd296bbb6717fd` | +0.0844 fUSD |
| 0 | sell BALDW 0.0499 | yes | 8403 | `0x3fedfcb4156c5a6477099629ff47d0f874a5b7109a8d45ffd5ef5eac1ac95f14` | +0.4789 fUSD |
| 1 | sell BALDW 0.0312 | yes | 13578 | `0xd72aa45adaa431c5cbf4853596c5394e976c7a72ecb8e2f8fc8870df2a62898a` | +0.2988 fUSD |
| 4 | buy QOREDW 1.30 fUSD | yes | 7826 | `0xb1b60eb1d6d9eb2e96f25fb5e24d2ff37b1e2964e29ef96952139348057b4307` | +0.1298 QOREDW |
| 9 | buy QOREDW 1.07 fUSD | yes | 9205 | `0x96da0cd20e74dff96d875caf4963de76bd1306139dd5fe2456b9647a562c4177` | +0.1075 QOREDW |
| 2 | buy BLUEDW 1.25 fUSD | yes | 11349 | `0x6cee3130c0e46b6bdd2f6c02ab0fd208934073dfc6afcb18c6d3a590c7f7c48c` | +0.1300 BLUEDW |
| 10 | buy BALDW 1.98 fUSD | yes | 6728 | `0x11cc951575896288cd7644e1d9b91bfc7cb428a377f0f91aa79c23cd8e33c459` | +0.2035 BALDW |
| 8 | sell BLUEDW 0.0300 | yes | 8392 | `0x011a311dbea0f6303ae0afb40ca476004cc8810d3a7463a780cb8c98fc5f32c4` | +0.2846 fUSD |
| 11 | buy BLUEDW 1.87 fUSD | yes | 8172 | `0xf9c66880619a409ab7bcc059fe5e2a6d3759a3196e2dbe05aaf264fda5a2b015` | +0.1945 BLUEDW |
| 3 | sell QOREDW 0.0444 | yes | 12058 | `0xa1f4f3c0ce7b85f825901198a971e4476ca1eb4e0c085699e63cfdf3bf278f1e` | +0.4373 fUSD |
| 6 | buy BALDW 0.98 fUSD | yes | 4668 | `0x4e9d105b89c9a7bc2b84cc698515b79d5bfc70fe56d13b69957ebb0e5150c8f4` | +0.1005 BALDW |
| 5 | buy QOREDW 0.41 fUSD | yes | 10267 | `0x352c3bedc5a70edf42ad4c6b8b7c8b0cc4b7134a5d1db8f002b8f46741ecde8f` | +0.0411 QOREDW |
| 4 | sell QOREDW 0.0649 | yes | 6572 | `0xa10731c868944a85bcabe0aaddd8887838ab03c172d6b24f67f1e66df393505e` | +0.6394 fUSD |
| 0 | sell BLUEDW 0.0842 | yes | 7514 | `0xce1d01605a23c27279432984466004ea62bae910c08143667ba4985d4d7d9c14` | +0.7984 fUSD |
| 10 | buy DEGENDW 0.50 fUSD | yes | 4946 | `0x09c61d702a4b2527c468859fb9a7286eed554946d5cec508f3058890cd7bd02b` | +0.0480 DEGENDW |
| 9 | buy DEGENDW 0.38 fUSD | yes | 6508 | `0x28ca2e137db3f16cc964a341f8b32a23ef4baaad0095241e0e8468ca2bb4c3db` | +0.0371 DEGENDW |
| 1 | buy QOREDW 0.57 fUSD | yes | 10437 | `0x3e02ff07bde7579a3a0cd8c5b1473abb46d7dafa67745efd10bfb7a1862f3e75` | +0.0566 QOREDW |
| 7 | deposit 2.01 fUSD | yes | 11440 | `D48B5426A3151FCAC2673C5F34C3009DDBDF252B733C007A9C40C2EC349394E3` | send D7C3BBF50E… |
| 2 | sell BLUEDW 0.0650 | yes | 10368 | `0x1ebebe21b8dccba5433ca8edf7a72ded3abb4e3b19d026253dcd5bceafefad96` | +0.6166 fUSD |
| 3 | sell BLUEDW 0.0478 | yes | 8229 | `0x4a2904233e505a457c7ec894cd7ab507d6893c2346293c12e88e553931d71f54` | +0.4528 fUSD |
| 8 | buy BALDW 1.17 fUSD | yes | 11534 | `0xd537a861f77630ac5620e3600d42a5ee951a1e6af8cc897cd7ac742d03ae1367` | +0.1200 BALDW |
| 5 | sell BALDW 0.0340 | yes | 9584 | `0x63f541f2cfbc6290c3165c75e05391783791e2a125d02814e8412992993f4e1b` | +0.3269 fUSD |
| 0 | sell BALDW 0.0250 | yes | 11291 | `0x7d744c20017b6ddf1ed8a6f28a33541df8890c13ca843417b9c613ff5e09bb84` | +0.2394 fUSD |
| 1 | buy QOREDW 1.14 fUSD | yes | 10712 | `0x132dcf58fdeb6e45683755c3fef4dd2f2451ba83ad3cb7a83b2d0c16c4a3b69c` | +0.1140 QOREDW |
| 9 | sell QOREDW 0.1087 | yes | 12339 | `0xb6c5007d60a953c3187e7c1a98d93a0a5e33f42ce0944eec76b25f80581fe98b` | +1.0704 fUSD |
| 7 | buy BLUEDW 1.87 fUSD | yes | 13409 | `0x6c6892cdd594423629ffb477dc364463421344c2db4ba6d9467a29d700e388c2` | +0.1942 BLUEDW |
| 2 | buy BLUEDW 1.30 fUSD | yes | 12798 | `0x2b3fb2fe3ef877afb12cafcc3c797e8102bb050e82efe1ac764ef7ccb4a8ebe5` | +0.1353 BLUEDW |
| 5 | buy DEGENDW 0.51 fUSD | yes | 8173 | `0x713e40087e632db255960d569ec2dcf9c85e320025d1bddb40a78eabbe4cbf37` | +0.0497 DEGENDW |
| 1 | sell DEGENDW 0.0176 | yes | 5833 | `0xe6984f4a868756898161679684a24676b2318868cabf9f67c94421e9f4fab697` | +0.1790 fUSD |
| 7 | buy BLUEDW 0.74 fUSD | yes | 2933 | `0xaffe0af4dc12e5ff11df13032e6ebe59d8a4dcad11877204294f70ee44e6e96a` | +0.0767 BLUEDW |
| 11 | exit: sell all QOREDW 0.1256 | yes | 3813 | `0x900feb1b529e2050000dcccc234687d8d0288db535265ed17e95d35c6fc0ba90` | +1.2374 fUSD |
| 10 | exit: sell all QOREDW 0.0883 | yes | 5267 | `0xe6737ca7560fe8c55f816c81ff26231e63c66b8d0dad02016a01b714805cf689` | +0.8698 fUSD |
| 3 | exit: sell all QOREDW 0.0444 | yes | 5658 | `0x4f91346b2a6b82e14728e90a928e76383ec50026b2bf1bc3deb6f3366f435f91` | +0.4373 fUSD |
| 8 | exit: sell all QOREDW 0.1349 | yes | 5711 | `0x2f1068ef3159fbaf3b25007384c38cd0d8a43ade55694b764a5d853d06e6056c` | +1.3288 fUSD |
| 2 | exit: sell all QOREDW 0.1614 | yes | 7242 | `0x3e489004c34c8b31e4c79f3940be472530e893bfb71da3ae078e22b3f07ddc0a` | +1.5900 fUSD |
| 4 | exit: sell all QOREDW 0.0649 | yes | 8072 | `0x93f4b1e6c98e519e920d4576ba26fc547635b8be46f25bc39112e8bf94cfac1f` | +0.6394 fUSD |
| 5 | exit: sell all QOREDW 0.0411 | yes | 8353 | `0xbd593dd289e7de5e1c4e18dce748fa40bffb120b33d547c6796b67b5b2223af6` | +0.4046 fUSD |
| 6 | exit: sell all QOREDW 0.0338 | yes | 8303 | `0xe780cc27a3d6c89ad2180b85c767b6bb81bbe0d3bb854ee3085604101406ff3a` | +0.3326 fUSD |
| 0 | withdraw 2.9209 fUSD | yes | 10161 | `0xb1db67adf8f198c9eef6b486a4107f915f5395b6279396bf6018983a4028f353` | returned D27A262E6E… |
| 1 | exit: sell all QOREDW 0.1707 | yes | 11106 | `0x503168dc1dc1022fd29751e1cd820eec53efcb19f8efd28acb70ed0b4f49abac` | +1.6812 fUSD |
| 11 | exit: sell all DEGENDW 0.0279 | yes | 6535 | `0x76bc50065376080b7f9ad9d1ccd310c00f0c16abd1cdb0cc95e5a7e441ad43d8` | +0.2841 fUSD |
| 3 | exit: sell all DEGENDW 0.0076 | yes | 5660 | `0x130414e34665190d6131c674b2d1916c3cd267788022ca5878c6fb4aee4489d9` | +0.0771 fUSD |
| 10 | exit: sell all DEGENDW 0.0480 | yes | 7178 | `0x1a986b31f58394b5dc8b40f5e48e5903a882bb7e6899cad6739ac48d546acf3a` | +0.4892 fUSD |
| 6 | exit: sell all DEGENDW 0.0083 | yes | 4709 | `0x5d93fb0a4a5ad66a41c867f379d3205b982833ff3506cca8b892107886279d7d` | +0.0844 fUSD |
| 2 | withdraw 2.0489 fUSD | yes | 13115 | `0xfd261efb6b3da8fb973cb0a6670c086b2dfee71e02dc8d4c027f98c07139b39d` | returned 0EDF1AAC66… |
| 4 | withdraw 3.0200 fUSD | yes | 10320 | `0x7625c294f48c9dfdec42733bd5840560199a3e82867ea026a065191f2ce97cfe` | returned 89CD18B977… |
| 5 | exit: sell all DEGENDW 0.0974 | yes | 15562 | `0x259636d9655cb900a64943b02b479b6d08a6acb5560e6d4bb6e249970596204e` | +0.9918 fUSD |
| 1 | exit: sell all DEGENDW 0.0176 | yes | 14961 | `0xb9d537a1cd60e29ce58e3181661405073ac30f0effc0adffab5209beb4ca5398` | +0.1790 fUSD |
| 6 | withdraw 1.2239 fUSD | yes | 15097 | `0x7953127891f35d8b3cef3455c4ce28bc8661825bf9d7fd99dc6656fb1d298fef` | returned 8548A4CF65… |
| 11 | withdraw 2.1035 fUSD | yes | 19166 | `0x0bb87a14fb7660469f023645f2bdd12a862cb10cc34fffc50b29e2871c75b067` | returned 3934EAC8EF… |
| 3 | withdraw 3.5226 fUSD | yes | 20451 | `0xc12b0c47e65d9467038acefc6bbab42fd0d99ea01762c8228114bd34b6c2c0da` | returned C0A55C32E9… |
| 10 | withdraw 1.8697 fUSD | yes | 23638 | `0xf30b82e1c3a090ccbce92bc2e22ec5acb0ae7a1ceb3354ea49f27a71ac72282f` | returned 32B93325E5… |
| 5 | withdraw 3.6423 fUSD | yes | 12572 | `0x4b467155984dce13bf38b878df4840f64556796a1a63b4840d6f75ad416ea256` | returned E2FDCA5E9F… |
| 1 | withdraw 3.6692 fUSD | yes | 14721 | `0x8af993a036894d5d4c01d29eade07168580a9ae318175c50b40c9f3f84adb667` | returned 117BE0A31A… |
| 7 | exit: sell all QOREDW 0.1234 | **NO** | 125780 |  | Timed out while waiting for transaction with hash "0x1381bc01da94e102dfec790454ea4aebd85f78717c047edab4cdbb9177f21d22" to be confirmed.

Version: viem@2.57.17 |
| 9 | exit: sell all QOREDW 0.1087 | **NO** | 126138 |  | HTTP 524: <!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US |
| 8 | withdraw 1.5737 fUSD | yes | 127557 | `0x7a918c3293db4665ce0479aa255f7cfb546378b3a24be5df1d35be22497896bf` | returned 8684E8C88D… |
| 7 | exit: sell all DEGENDW 0.0058 | yes | 8242 | `0x250e50de852735a071d16d0a56778b639a0bed5f3ed2b59bc0cfd4548aa2652c` | +0.0591 fUSD |
| 9 | exit: sell all DEGENDW 0.0371 | yes | 8869 | `0xc8e0c9e1fce48af2c5d5f17e6294312c5dbbc8744ab83ce3250c00f77bc26faa` | +1.4479 fUSD |
| 7 | withdraw 0.3280 fUSD | yes | 8258 | `0x0ec8f05dd423bc8e945ea414ec471ed2921695f49831d1c8781645711d9c1fbc` | returned 1794ECC7E2… |
| 9 | withdraw 3.6061 fUSD | yes | 11720 | `0xcdf04eee1300f0825f0fdf1033b77c262d5ec3a9a27d5d217b03949b7522ce12` | returned 33AA0E7001… |
