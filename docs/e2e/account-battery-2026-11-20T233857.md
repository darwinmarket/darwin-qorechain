# DarwinAccount battery, 2026-11-20T23:38:57.879Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 16 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: FAIL.**

- users 16, rounds 5, operations 177 (175 ok), trades 126, deposits 34, withdrawals 15
- attacks 32, refused 32
- calls cut before their answer and resolved from the account's nonce: 0
- 141/141 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 9.6 s, p90 34.6 s, max 46.4 s
- failures: 4
- duration 342 s, 18.53 QOR of leftover gas returned

## State after the run

- relayer: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 824 txs left
- relayer2: serves 1 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer2 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 924 txs left
- relayer3: serves 5 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer3 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 913 txs left
- relayer4: serves 7 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 4000000
- relayer4 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 867 txs left
- BLUEDW: supply 20.7454, NAV/share 9.5067
- BALDW: supply 19.9703, NAV/share 9.6212
- QOREDW: supply 7.0967, NAV/share 9.9239
- DEGENDW: supply 3.5214, NAV/share 10.2771
- Activity: 126/126 account trades listed
- user 0: deposited 6.55, withdrew 2.1021, wallet 7.5542 fUSD
- user 1: deposited 5.31, withdrew 1.9093, wallet 8.5962 fUSD
- user 2: deposited 4.15, withdrew 2.0629, wallet 5.9149 fUSD
- user 3: deposited 5.96, withdrew 2.1943, wallet 8.2368 fUSD
- user 4: deposited 5.46, withdrew 4.1729, wallet 10.7123 fUSD
- user 5: deposited 7.32, withdrew 2.2824, wallet 6.9620 fUSD
- user 6: deposited 6.40, withdrew 2.1287, wallet 7.7262 fUSD
- user 7: deposited 6.76, withdrew 0.0000, wallet 6.4193 fUSD
- user 8: deposited 4.00, withdrew 2.0407, wallet 10.0407 fUSD
- user 9: deposited 4.00, withdrew 3.0812, wallet 11.0812 fUSD
- user 10: deposited 6.94, withdrew 1.9242, wallet 6.9824 fUSD
- user 11: deposited 4.00, withdrew 1.5776, wallet 9.5776 fUSD
- user 12: deposited 7.93, withdrew 2.3476, wallet 6.4194 fUSD
- user 13: deposited 5.87, withdrew 3.1779, wallet 9.3095 fUSD
- user 14: deposited 5.29, withdrew 2.6813, wallet 9.3869 fUSD
- user 15: deposited 6.61, withdrew 3.5402, wallet 8.9289 fUSD

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
| 1 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | replay its own last executed message | yes | the classical signature does not verify |
| 1 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 1 | a buy that pays someone else | yes | a trade must pay the account itself |
| 1 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 1 | claim its own deposit twice | yes | refused: already credited |
| 1 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 2 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1n0jxmjw3fzmzn96kh7k5jrh8fgt099yqvr8sgk |
| 2 | replay its own last executed message | yes | the classical signature does not verify |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 3 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1ylfmqgx0cu7g7f4vhwlqtdehagnvemvg2mtveg |
| 3 | replay its own last executed message | yes | the classical signature does not verify |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |

## Failures

- user 2 deposit 4.00 fUSD: Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 105, got 104: incorrect account sequence
- user 7 withdraw 1.1758 fUSD: transaction failed in module "evm" with code 10: failed to execute message; message index: 0: execution reverted: evm transaction execution failed (tx A9913EFDA92B9AD25B0AF75F4256CB07A0E960F885723FAD831EE591B0B70121)
- relayer4 bank fUSD changed: 0 -> 4000000 (a deposit not credited?)
- user 7: account nonce 8, executed 7

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 10 | deposit 4.00 fUSD | yes | 8046 | `712ACBF0E7983AB270DD7986B74B1A5E6CC245B68EA7D7C662A2E8E8535A1747` | send DB794AB34D… |
| 13 | deposit 4.00 fUSD | yes | 7381 | `9D1DA44486694F29479CC1263CF6065B2D059CA1583CA40F7585C3C59293D87F` | send E282BB89C8… |
| 6 | deposit 4.00 fUSD | yes | 7632 | `CEB0FC6D47CB3ED6227A3F1A327E949747F9C2BAB4CB0A26FBF3C93C38559E28` | send FDBBA88AE5… |
| 11 | deposit 4.00 fUSD | yes | 8012 | `78399A05EC9F9B6691C0FC3DB74277729C5A12ABEF6CD8569EA917523CAC0B7A` | send 7FAC0CA77B… |
| 14 | deposit 4.00 fUSD | yes | 8296 | `67DB5EA8AB0BCAEAA1C070F33857AEB1F4DB238EBB4EE89C33FB70A5F93601D7` | send 0D1980C902… |
| 15 | deposit 4.00 fUSD | yes | 8533 | `A70B36291C2E3502AA20D82D202109A43DF3A8A36C53260A6BFACE81C8D5C3A6` | send 72D83CF16D… |
| 5 | deposit 4.00 fUSD | yes | 8701 | `2EFCD4BF905E5C2D8921748AE8EA84D0EE71833478428EACBE5AE9D1DC66F14C` | send 806A80F5B8… |
| 2 | deposit 4.00 fUSD | **NO** | 9027 |  | Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 105, got 104: incorrect account sequence |
| 7 | deposit 4.00 fUSD | yes | 9717 | `3DF43310288CA1FE0C10BC581772D6C17B237EA9C1D70EF13FC73A465DD31EFD` | send 73279DC692… |
| 9 | deposit 4.00 fUSD | yes | 9801 | `BA6592BFA36A95177597244EF0F95375E440682BBD966D468199957F2BE38953` | send 33F1FC9551… |
| 4 | deposit 4.00 fUSD | yes | 10954 | `1C93D4F4ADDF61627810EB8D635F40617A4B0CCA984BE6C3CE40DCE92A87BD26` | send 632800C264… |
| 1 | deposit 4.00 fUSD | yes | 11532 | `B8FC023D65DB83868DBBBBF07AB9D5DAD98F16ED200E6FB365CCDBBA4C4AD4C6` | send 892CC2BA75… |
| 11 | buy DEGENDW 0.16 fUSD | yes | 3137 | `0xcd9ceea6e6ee9802a7899c160bd172fc092a0b8fd9d2f781ccdb572d35a8b6a4` | +0.0151 DEGENDW |
| 0 | deposit 4.00 fUSD | yes | 11796 | `A650820EC2628DBF7E77C372CFBDC05305D3A6AD19D6C8108E71DE26069DF4BF` | send F2084EFF4F… |
| 3 | deposit 4.00 fUSD | yes | 12003 | `18DEFEF62E348B527D69DB8B65AD92ADA91767CAE853620EC552B5798B134798` | send 034DCF062E… |
| 6 | buy QOREDW 0.24 fUSD | yes | 4888 | `0x4ae6c33e057578749787b80a8916c1cb126723799ecb77d83735c38e1e21a2c4` | +0.0237 QOREDW |
| 12 | deposit 4.00 fUSD | yes | 13175 | `31546C8D9A5D6DB12012906C2AC88C78836A8CE7B905EA9F9088628D0A266F2F` | send A16433F990… |
| 4 | buy BLUEDW 2.47 fUSD | yes | 3143 | `0xd293002468fd297a73a3823c80d63228399588389315cb2ff52ff5866d9d1e86` | +0.2576 BLUEDW |
| 8 | deposit 4.00 fUSD | yes | 14898 | `C95191A635F313A12B274A7687AC7A0B5D8E9D9E04E92333BC7639E44DF1B024` | send 5ADC9CC595… |
| 11 | buy QOREDW 0.48 fUSD | yes | 6559 | `0xef76ed267d2b4a81cccae4e7b68bb6651b9e8d5d379c20edd19d03bf21780602` | +0.0479 QOREDW |
| 6 | buy DEGENDW 0.17 fUSD | yes | 4631 | `0xd8912decb0ac8fcbd580c68ba6627ae1f64d2d47826761dd1c5d2252ce91d27d` | +0.0165 DEGENDW |
| 3 | buy DEGENDW 0.26 fUSD | yes | 6908 | `0xe86ef1807f553c50e132980bcf5fe116d2578e3d9aa6ab923e72876b6388de27` | +0.0249 DEGENDW |
| 12 | buy BLUEDW 1.73 fUSD | yes | 9399 | `0xd080b00b04c1f86b2049896af156bddce7259c3e5ac8d7356c65af0c968eb197` | +0.1805 BLUEDW |
| 4 | buy QOREDW 0.67 fUSD | yes | 8515 | `0x39eac986605f8f6c693993d3aecbe321d5353568d88aa6d75dc4972e852b9a9a` | +0.0668 QOREDW |
| 11 | buy DEGENDW 0.55 fUSD | yes | 4718 | `0xe307a2f5e3920fdc6c1c2f8979e1664e341e791ff36ea6fc0409f2f453bba407` | +0.0526 DEGENDW |
| 6 | buy BLUEDW 2.00 fUSD | yes | 6903 | `0x02b46d665616424e325a098f144a386302113d8a5a1f2706b29d2f56ef5affe7` | +0.2083 BLUEDW |
| 11 | buy BALDW 1.05 fUSD | yes | 3970 | `0x382969b731cf3c7e58b4599aa60b8f40ee7b6aad211053ec8c5fe6209981b1fb` | +0.1080 BALDW |
| 3 | buy BLUEDW 1.89 fUSD | yes | 10928 | `0xb5c2036d3d3884d816cbe8f8bac7b422c4ba2ab35b628949c8612ac1c5b93da1` | +0.1965 BLUEDW |
| 4 | deposit 1.46 fUSD | yes | 10240 | `BAD2076925F004ADEDE2ED592153BAADB07FE06307E360DE228AB52E68C62B17` | send 316D35012D… |
| 11 | buy BALDW 1.37 fUSD | yes | 5502 | `0x6670517db953606683663f8f900f2b5c768d2b8161253d892ebd4fd23440cd59` | +0.1410 BALDW |
| 11 | sell DEGENDW 0.0338 | yes | 5045 | `0xca31cc8f30c8e74b8bfdc4155d3b4a2ff92aebf22eb2cc677f5cf901773b9f1f` | +0.3456 fUSD |
| 6 | buy DEGENDW 0.73 fUSD | yes | 13177 | `0x8f4ae843d42fb2f04ac244c67acfa3fb74b792c4963b1087be6af5cea17d231e` | +0.0705 DEGENDW |
| 15 | buy DEGENDW 0.33 fUSD | yes | 32977 | `0x9ff003e0a98bc904164c2bf411c36c3d388db0ffa7e13b3428a8ef859acf4da1` | +0.0318 DEGENDW |
| 10 | buy QOREDW 0.38 fUSD | yes | 35125 | `0xb4d0349ee43d0926c23933e0edd161ef688acccf45d275bb323a6b288ec86653` | +0.0376 QOREDW |
| 3 | buy QOREDW 1.08 fUSD | yes | 11932 | `0x91a156d8dc534a737542af6060bebc72357978daee7eec7946dc8c1e46f9e33c` | +0.1076 QOREDW |
| 9 | buy BALDW 0.61 fUSD | yes | 33421 | `0x6f2215eda19cf6e62f40642dec9803bbca97d86c639611f7419b3effd52ca917` | +0.0625 BALDW |
| 7 | buy DEGENDW 0.18 fUSD | yes | 33752 | `0xb4f410dcb95989ca9a944426d9b5ced8a0b3586945dae11880ca4a6e47ca2a6c` | +0.0171 DEGENDW |
| 13 | buy BALDW 0.71 fUSD | yes | 37066 | `0x31c6631fa2af392df2ed5ddd4bd787d73ab339737873a563a1acd970dbb6fc59` | +0.0734 BALDW |
| 0 | buy BLUEDW 2.00 fUSD | yes | 34590 | `0xb53e423451755e10d61a08fec222b354edac79e31873f012e6771b4013c820ef` | +0.2086 BLUEDW |
| 2 | deposit 1.61 fUSD | yes | 36834 | `2541EE7014A3BD8A61BCA1A77A501FA2FC5CAF8D90BD7486C055E793DD1C0105` | send E1A4A9F88D… |
| 14 | buy QOREDW 0.74 fUSD | yes | 38405 | `0x91492e743d3f53e7a054ab7c38203eb863a18bc83b4af8a3b9894f155b7c6bd2` | +0.0735 QOREDW |
| 12 | buy BALDW 1.41 fUSD | yes | 24537 | `0x3c9f680488994b3d07504d5ee44eac50ceaa65ce8604305cc352c4c50a4b2dcb` | +0.1458 BALDW |
| 5 | buy BALDW 1.95 fUSD | yes | 39372 | `0xf8babf2428d5839dd7bd5b22bc1f1af556ccf5940b50aa70f0edab6a67d5b276` | +0.2013 BALDW |
| 9 | buy QOREDW 0.36 fUSD | yes | 5395 | `0x2a45e2324a29c7e56ae2c51787ea6e3056bf98165375bdcf5159f8802c817afa` | +0.0361 QOREDW |
| 13 | buy BLUEDW 1.95 fUSD | yes | 7180 | `0x7e50ac4d86faddf39251878f4023a0629799b3a62a1dab6cd6f9544929c9cd78` | +0.2034 BLUEDW |
| 1 | buy BALDW 2.24 fUSD | yes | 41416 | `0x4cb8b47227a274c0db51d5e270efc68343c7318c5f56162b908321d53085107c` | +0.2314 BALDW |
| 14 | buy BALDW 1.29 fUSD | yes | 5315 | `0x0eeed5550aabd38a226e3f1a007d72e7d8d312ecc2349a3764fb83cac043d108` | +0.1331 BALDW |
| 4 | buy QOREDW 1.33 fUSD | yes | 19220 | `0x353aecf55c6139e80e45fe1baeb9bbd1d70ae23bf8b4de9c9dd1271663612061` | +0.1328 QOREDW |
| 6 | buy BALDW 0.50 fUSD | yes | 13799 | `0xeca8c28f782762fab356ebe126bdfc4ded62ea44425ecc8d2192deafd5cbc30c` | +0.0516 BALDW |
| 0 | buy BALDW 1.83 fUSD | yes | 5942 | `0xa6aa605213b39ea59d1903b280c95aba076254eb1304eceedf928dedbfa73f65` | +0.1888 BALDW |
| 2 | buy QOREDW 0.61 fUSD | yes | 7952 | `0x461b7dbf4e9b701ac41194cc82f9102958c62d2529f35ee4c4318d5cbdc10cc1` | +0.0608 QOREDW |
| 8 | buy BLUEDW 0.92 fUSD | yes | 39381 | `0x37f60336e0c847df1f627763d8d98b8497f8b879294175c37fece2cb061f1f70` | +0.0959 BLUEDW |
| 5 | buy BALDW 1.77 fUSD | yes | 5621 | `0xd683edd1dd90f84e2739c2f85d350e305f60bbac0a5796efb6ea7d6e9d4f5c0b` | +0.1819 BALDW |
| 15 | buy BLUEDW 0.96 fUSD | yes | 12166 | `0xe168d4d469900018ff1bf571afa07d283ef8e765bfef104dd86e4955541cb400` | +0.1004 BLUEDW |
| 3 | sell DEGENDW 0.0125 | yes | 13046 | `0x3b2559265e96495306846ca39b2e4f9d8b5d8af5f212e4f8a7941325c7ea4893` | +0.1272 fUSD |
| 9 | buy QOREDW 0.35 fUSD | yes | 6572 | `0xd709db46f3498104240b36a8da295eb58565f22c3fffcb289fb1e1725c848c94` | +0.0347 QOREDW |
| 1 | sell BALDW 0.1157 | yes | 5242 | `0x69556a0236a2660b047d14a6b74939cdcb30453294a2d5009d4fcead7ea6dbf8` | +1.1074 fUSD |
| 12 | buy QOREDW 0.82 fUSD | yes | 9563 | `0x9e2615a02c2dcba7bed0e352dbd513c13c4d4bf23b92e5a44739800060b89be5` | +0.0818 QOREDW |
| 7 | buy BALDW 0.81 fUSD | yes | 14319 | `0x724969d2c1ecec8c065c5488a6873bddd00a5f19e9099c435e6275cc6b3ac713` | +0.0838 BALDW |
| 10 | buy BLUEDW 2.26 fUSD | yes | 15488 | `0xb915ef298d2baa237120ca6c2b8b4ae5a2d977128976dd2b5af84a09d0f1f49c` | +0.2359 BLUEDW |
| 2 | buy DEGENDW 0.73 fUSD | yes | 5245 | `0xcbf6f6fe05315aec023e63c20d2f5c03614afbf41b6ca3a7795277071dfc2cd9` | +0.0707 DEGENDW |
| 4 | buy DEGENDW 0.25 fUSD | yes | 8576 | `0x39a071455813c0a4559a1ac78d550f2a63fd29b57cf11d85fade3a97064204e4` | +0.0243 DEGENDW |
| 8 | buy QOREDW 1.07 fUSD | yes | 7811 | `0xf353dccc2ce14f51663541476978341290959c4f36a062527a702cb51195501a` | +0.1073 QOREDW |
| 14 | buy DEGENDW 0.16 fUSD | yes | 8751 | `0x34aef4b8c9235bdac4523ccb880abfc157f734252681ce5a63abb22ae8d8d398` | +0.0157 DEGENDW |
| 1 | buy QOREDW 0.92 fUSD | yes | 4025 | `0x539a32fd820317823795af58de7cab10b248108906c31bb41c5a5f8dc02cb37c` | +0.0920 QOREDW |
| 10 | buy QOREDW 0.57 fUSD | yes | 3868 | `0x45684b2d78ee41c6874ca5f028360bf9123189d4746cf9ca675a11d3e4685f8c` | +0.0565 QOREDW |
| 13 | buy QOREDW 1.19 fUSD | yes | 11229 | `0xadbc9a5d326cc3e9ba0f689a7b4f78774afe3dcdc2237e6627be9c007d656cca` | +0.1184 QOREDW |
| 15 | buy QOREDW 0.41 fUSD | yes | 9280 | `0x04ab98ce1180778b6883a8aa27577a7fe18ed36c699cc47e4e46ae96d21c6669` | +0.0410 QOREDW |
| 14 | buy QOREDW 0.81 fUSD | yes | 4340 | `0x595094979750d44914863ef1f43b0600828b4e4f686c94cf8b8ee000d13a0cb5` | +0.0808 QOREDW |
| 6 | deposit 2.40 fUSD | yes | 13164 | `598ADF68F198E7197EBEC3ACFE911167CC1AA56F288973B9A7A85A312E2B673E` | send E4D6CA7C7F… |
| 0 | deposit 1.32 fUSD | yes | 12776 | `ABE861A7A2E14500B0422E45AEA1B8DB2B3D9A18B7B8310D3C3A86DFCCCE2EA4` | send 55620B1898… |
| 9 | buy BLUEDW 0.59 fUSD | yes | 12061 | `0x0646f9be98783b2016a4b1adc402ad564daf976d946e54d7ecae552b0205130b` | +0.0618 BLUEDW |
| 5 | deposit 2.00 fUSD | yes | 14787 | `1531F76B0F4C9B5547CCE2166F86790B03DD0087924296272CF6D44A04A06B17` | send 906868F6DA… |
| 2 | sell DEGENDW 0.0354 | yes | 10389 | `0x2ecdb17b8dc0ad60428ffa8e0c0ac127896a8d2848fbf293e6b19385e2872f25` | +0.3613 fUSD |
| 1 | deposit 1.31 fUSD | yes | 7467 | `E92680633E5A44F2C13C8AAE47CADE1D5B225FBFFEBE3F9F0D994640E91B6A96` | send E3D81F8F7F… |
| 7 | buy BLUEDW 2.46 fUSD | yes | 12998 | `0xeb11267e9f8ecd86f363e414cb5fb3fb439d19285c118558547f91a6e955a377` | +0.2566 BLUEDW |
| 15 | buy QOREDW 1.14 fUSD | yes | 7952 | `0x2cfe6415f1e9555a020aa83f05280946273c63dc9e85a4bb5346848e71e042b3` | +0.1138 QOREDW |
| 0 | buy DEGENDW 0.49 fUSD | yes | 5804 | `0x0618d1e5bf4750fa0238c88c8b72c98427cac8a87dd2772f214b16420f9acd56` | +0.0475 DEGENDW |
| 3 | deposit 1.96 fUSD | yes | 16001 | `44584111DF7C7C629C5C33C03B8FC39F3DB1DE82C99C95BE79F12A818444863B` | send 8E1B452FFE… |
| 6 | buy BALDW 1.77 fUSD | yes | 7657 | `0xe8fe435eeed6caf82fba324291d8009eaaa602e96c32dc9fd5c1b2f99fb73a80` | +0.1828 BALDW |
| 8 | buy BALDW 1.02 fUSD | yes | 12232 | `0x623b50f8ca1f3ab7847612e94a278f8be47fa907bad52d92671e03ae64c117b6` | +0.1057 BALDW |
| 10 | deposit 1.39 fUSD | yes | 11283 | `DBD438DF85BC1C556D6EFEE4C5652E32E9EB20D13C85103FD535E7B0387027ED` | send E0C2364E2A… |
| 1 | buy BALDW 2.26 fUSD | yes | 4306 | `0x992e67b1086c69f54e7f67ebc63f6ca5f78d5e2853fb94c4f291f12b45a39396` | +0.2334 BALDW |
| 12 | deposit 1.93 fUSD | yes | 18485 | `F8083756DBA8BC804C4949F2EC36876A44A676BE125CB348DA4622A4B19A8214` | send 5BF38AFBE8… |
| 13 | deposit 1.87 fUSD | yes | 12415 | `E1A84A4874E99E571E757DB2E4EC759F02659E8D222C1979F3D792F89C3E671A` | send 342148E8BE… |
| 14 | deposit 1.29 fUSD | yes | 9764 | `F94749996AFF1582E867AACCC66652DEF16FDE2E4FDCA14C2A93E942E3FD6AA5` | send D91E14D3DA… |
| 5 | buy QOREDW 1.30 fUSD | yes | 10216 | `0xf12dde5f0e8b6c5e8cf056407629a8f1f1deddc8876d60f63525ceec41814727` | +0.1296 QOREDW |
| 1 | sell QOREDW 0.0460 | yes | 5911 | `0x59b5cdccdae391f67eeb4d43d8b198a50ed66cdc5cc3e0be79ac868eddfcd797` | +0.4539 fUSD |
| 10 | buy BALDW 1.19 fUSD | yes | 7226 | `0xdc939cfe2f8354e498dd115f58ffe09379a5f6c886a94862590d12eafa60b305` | +0.1228 BALDW |
| 4 | sell BLUEDW 0.1288 | yes | 20103 | `0xcd6cc7b200b837967fa360230289e5f947a84c1dbecf8bce88f1767c21323bad` | +1.2173 fUSD |
| 7 | deposit 1.18 fUSD | yes | 11868 | `01ED6E4B00B4C126F57F5916F881D742767B84CF1DDF78B3C3240898F87F9823` | send D7EE069C3C… |
| 14 | buy BLUEDW 1.30 fUSD | yes | 6731 | `0xe2cd952a2cffd96554071957d32b10aabe203e3c1d34176a5027beccd49d122c` | +0.1360 BLUEDW |
| 8 | buy QOREDW 0.30 fUSD | yes | 12826 | `0x143b968d1d88570c94b391eb70bf57d601067756c642d67270543e5209ddc0a6` | +0.0297 QOREDW |
| 1 | buy DEGENDW 0.47 fUSD | yes | 6615 | `0xb70d11445a20a3b136a182a856dde9ac1f63a6988b861571d1d5cee76d2408e6` | +0.0454 DEGENDW |
| 0 | deposit 1.23 fUSD | yes | 16410 | `4148F093CF8F9B28E5FAD533BB0C5DC1A48B5383D2C441711D3DBA1D277A1219` | send 4C496F49EC… |
| 10 | deposit 1.55 fUSD | yes | 9381 | `116D5A4C33AD42D59548EACB3FA2B355398DD28E2CB4330075F94378E0755724` | send F3319FB145… |
| 14 | buy QOREDW 0.36 fUSD | yes | 10922 | `0x1ca85930d109f5166e0328b899f02f5f17ac99b2e2e790d6272207418d63b609` | +0.0359 QOREDW |
| 13 | buy QOREDW 1.03 fUSD | yes | 18746 | `0xf4af16a96c6cc430200a7488e4ed790134fdf02a8949068793b95fbfbd05a873` | +0.1029 QOREDW |
| 5 | deposit 1.32 fUSD | yes | 18340 | `84A6CC4955D14E8D29D0CC61C51CE7E3B464C9D911EC371AF19D73E6C2C2CBF3` | send 4B1AD5650B… |
| 10 | buy BALDW 1.56 fUSD | yes | 8111 | `0x7890a10c56d3a550d1f097eacaf720122960a3a689fcc23cc76798b2f13b611b` | +0.1607 BALDW |
| 10 | buy DEGENDW 0.67 fUSD | yes | 3494 | `0x88fefce3d869c0a24aefd8dd0552892e29a9f37f5432a5cd05991c9d2f6a43fa` | +0.0643 DEGENDW |
| 7 | buy BLUEDW 0.74 fUSD | yes | 19933 | `0x8dbbb0c2b127ad46f67a079f2fb5b3edcfe2562bad86eff2a664655cf3bb401f` | +0.0770 BLUEDW |
| 8 | buy DEGENDW 0.28 fUSD | yes | 18596 | `0x719e4244bbf67aec41d35f12516cb98f78482aa66f202da2afa62daebe00eb72` | +0.0271 DEGENDW |
| 9 | buy DEGENDW 0.51 fUSD | yes | 40610 | `0x504b023eb7c85227b15b89662961826b5dbce1eb639039c2940677a86093821c` | +0.0496 DEGENDW |
| 0 | buy QOREDW 1.23 fUSD | yes | 20353 | `0x77afdb3f460cb9c62a649bebe6322ba795be63a638cbd76d58dea951a592c96e` | +0.1232 QOREDW |
| 2 | sell DEGENDW 0.0177 | yes | 41778 | `0xee49ef493cc461280106580e3277764f7777634b98acf82a9133d5206af8b377` | +0.1806 fUSD |
| 13 | buy DEGENDW 0.18 fUSD | yes | 15105 | `0x815f670824300bbee3db49820afd1c3bb1a4d8741b72ca603af79eeaa3bccf8a` | +0.0171 DEGENDW |
| 5 | buy BALDW 1.32 fUSD | yes | 14595 | `0x41ab91127b34fa77ce11b8c9ed779be41c646f32b79c2ddd845d8d7a5258b5ec` | +0.1360 BALDW |
| 15 | buy QOREDW 0.69 fUSD | yes | 41689 | `0x18310b17e96b626152e4822f0efab6ddbca15c8af8aeb75b179aa8a6ebd40fb7` | +0.0692 QOREDW |
| 8 | sell QOREDW 0.0685 | yes | 8434 | `0x9fe2f0e1681d165c73533bd9d580ddbc430315eb054f32ab6ad603a5c36bd371` | +0.6757 fUSD |
| 7 | deposit 1.58 fUSD | yes | 12158 | `72FDB4F00C642E141A15B7E0064D814BCD6DCEDBC6CDF5A0A48DA1AEA703BA52` | send A71E8641BE… |
| 3 | buy BLUEDW 1.87 fUSD | yes | 46374 | `0x53b317bbb8df53b83c97b047a2c16e0d4baf8d38840c77432f51c93709a476bf` | +0.1953 BLUEDW |
| 13 | buy DEGENDW 0.51 fUSD | yes | 6877 | `0xd814dbcc342088e4e7764f8cfec5412928e58c74fa23c0e18883ddccc46301a8` | +0.0489 DEGENDW |
| 12 | buy BALDW 0.98 fUSD | yes | 44189 | `0xfe9ac298ce62004b98401208defed902bba9de9cf15481d64521d3de022fdda6` | +0.1008 BALDW |
| 5 | sell QOREDW 0.0648 | yes | 11078 | `0x22df79e7e9e6c5c16dac175b3c6071c7a112c0b3c04dd8866afb65cf2099b558` | +0.6394 fUSD |
| 4 | buy QOREDW 1.14 fUSD | yes | 43697 | `0xb43cc4e15b572d607b16616c49e145b0a7f988e9816212cf2116cd47c2c89806` | +0.1136 QOREDW |
| 9 | sell BLUEDW 0.0309 | yes | 16456 | `0x21856629f5181a9cd60b12ab84114188f4236a1b402bc07ba5865b90bf21e976` | +0.2917 fUSD |
| 0 | sell DEGENDW 0.0238 | yes | 13199 | `0x9147d2d3b990dc4abe1190ae5c5537275fe33eacb157f4bff1ead0862932284e` | +0.2428 fUSD |
| 7 | buy BALDW 1.58 fUSD | yes | 10541 | `0xa224682b4139c9a7817b27b0cb328e807ac5c59f3004d6d1f1d6c3979e7d1a91` | +0.1627 BALDW |
| 2 | buy QOREDW 0.28 fUSD | yes | 16240 | `0x8e919de796f33b8bbfbbeefe67eda1b84ac458168c7fe25823348ac5c41ac9f9` | +0.0281 QOREDW |
| 0 | buy BLUEDW 0.60 fUSD | yes | 4071 | `0xf65ddb5175898d2d61844540a767aa9977125c278536ec22a362252d2cbbbc31` | +0.0630 BLUEDW |
| 15 | deposit 2.61 fUSD | yes | 16136 | `4135D2A121FA42D3EB4ACC0BA3211EDA9024E68FDF3FF7136CFEB3FE36621553` | send EE7B98DC47… |
| 7 | buy DEGENDW 0.29 fUSD | yes | 3140 | `0x41c8a5c5d38e627209b705510550adcb4dc75f49fd3cd4fa21def3ad6e93a68f` | +0.0282 DEGENDW |
| 5 | sell QOREDW 0.0324 | yes | 8133 | `0x1aafbcd7389ff8d822534650d8b7a1b8586e705e0702965501dd16c125bd10af` | +0.3197 fUSD |
| 3 | sell DEGENDW 0.0062 | yes | 17863 | `0xd3e1224df393e2a5e0fba5128352f66de200597864128cb6f788b978b744d26a` | +0.0636 fUSD |
| 2 | deposit 2.54 fUSD | yes | 8244 | `AF7BB8EF1885ED5A3FA882E4B6B6592595CD9CE612F5EA1C0669A3D94DDB48F4` | send E21E459ED8… |
| 12 | buy DEGENDW 0.54 fUSD | yes | 16741 | `0x44bb2e92aab6816c689d1aa12962c7f81e17f3ede03b65bbcd9b5f095537e53f` | +0.0525 DEGENDW |
| 15 | buy BALDW 2.09 fUSD | yes | 8711 | `0xec8e0d112eb02d790bf905d4abd4388c9276c355d9a9df8d2bc7ca4f00a56565` | +0.2151 BALDW |
| 2 | buy BALDW 2.07 fUSD | yes | 3336 | `0xcf3634e46844b39d44f27cbf7b9cffcfc2f5f15f95bec17addc68e6d2bf4c64a` | +0.2136 BALDW |
| 12 | deposit 2.00 fUSD | yes | 7477 | `159F5DA5311F82B3CFE92066EE615A807D093C1BCFCCBB49DB37250383DCDDC7` | send 0E514DB01B… |
| 12 | buy BLUEDW 1.46 fUSD | yes | 2983 | `0x78ffc968d53b68ee5237c2084d1b40c17345145a225380ba61cc9e5b2e8eff9c` | +0.1518 BLUEDW |
| 15 | exit: sell all QOREDW 0.2239 | yes | 4001 | `0x75cd247b99f76621d22af8fc4474cfdc7ac9d309d313b591bda8bb43e12b0cdd` | +2.2091 fUSD |
| 0 | exit: sell all QOREDW 0.1232 | yes | 5087 | `0xaa7ff880609b4da75e99fae9532d77a014b44ed4e96b9023ee3fdeb85b6a73e9` | +1.2157 fUSD |
| 9 | exit: sell all QOREDW 0.0707 | yes | 5422 | `0xbf99bcc86880c4090ff6c0b23b83e919ecf9bf5d4697a4c7e0503d552a06343c` | +0.6979 fUSD |
| 4 | exit: sell all QOREDW 0.3132 | yes | 6407 | `0x4b4f204f4d3781f7ca2573c7f45f63762efda0b06b997298c91334fb811d70bf` | +3.0891 fUSD |
| 11 | exit: sell all QOREDW 0.0479 | yes | 6087 | `0x462dd267b10f7770a85abd6d614e2e8559a8eef11b730e94b4114ba2725a0346` | +0.4727 fUSD |
| 10 | exit: sell all QOREDW 0.0942 | yes | 6931 | `0x9702aa07b47e020917e8f1c607bb42c6558e6c978395e062af6a0a6fe4adbf85` | +0.9291 fUSD |
| 14 | exit: sell all QOREDW 0.1903 | yes | 8600 | `0x91bc7c445f2aec37d5a2dd50b440d0f2c62ba3fe4af202f7cc097637284f2679` | +1.8768 fUSD |
| 2 | exit: sell all QOREDW 0.0888 | yes | 8978 | `0xe16a9451f66032701a76fc27c8c3a482e8a081ffbc3c5bb56eec2313200702d5` | +0.8763 fUSD |
| 6 | exit: sell all QOREDW 0.0237 | yes | 9084 | `0x2eb47b12ab9d054681796f3ecc11e8eee23fba3726a4b6a99f3e9bd0bc57ebec` | +0.2336 fUSD |
| 13 | exit: sell all QOREDW 0.2213 | yes | 9603 | `0x55cb9c3dafa19583d78d4a0550b7267de83192bdc8d300e3d38ce6c5fdab63b4` | +2.1830 fUSD |
| 12 | exit: sell all QOREDW 0.0818 | yes | 9956 | `0xfa6279fe9702d935415f2866bb0632faefaee3b618ad48fcf933b14bc7727d76` | +0.8065 fUSD |
| 15 | exit: sell all DEGENDW 0.0318 | yes | 5798 | `0xd6a0ab890a83bd8252fc2a321f937fb1a66aeea0dd9c42c658a87f442bdc8d4e` | +0.3246 fUSD |
| 7 | exit: sell all DEGENDW 0.0453 | yes | 9537 | `0xb1479c8168953febf7d1f5b56db3f34cfaa755668f757c1c61c8b85d0f1aecef` | +0.4624 fUSD |
| 5 | exit: sell all QOREDW 0.0324 | yes | 10538 | `0xac80586fb9a0dc1dae2cea9e20a50fdac911ab7f3a6663114937fbc9dfd3e9ec` | +0.3197 fUSD |
| 8 | exit: sell all QOREDW 0.0685 | yes | 12005 | `0xa86dfefe9a4808cc6eb058de4203492f07ba602ef5745bc974c78036e2d5a326` | +0.6757 fUSD |
| 1 | exit: sell all QOREDW 0.0460 | yes | 13568 | `0x0c9855f05300decbae831d0a018b5ca9e4a7608db66e7718f4a4a09afbe7457a` | +0.4539 fUSD |
| 11 | exit: sell all DEGENDW 0.0338 | yes | 7011 | `0xa556fac472fe1ceecf8b02d9afd6aa727210645bbcac9ce96da4ac562b90dc01` | +0.3456 fUSD |
| 0 | exit: sell all DEGENDW 0.0238 | yes | 8498 | `0xa5d3f9e7b13843d888a61bf3d9a514e0a4cc21de32da0d26eef12c9621e7e456` | +0.2428 fUSD |
| 3 | exit: sell all QOREDW 0.1076 | yes | 13899 | `0xcdabc3c0fdf407be3b3d259377a604c7c287b74c8f528ab11223e7c2ab1fdf6c` | +1.0613 fUSD |
| 13 | exit: sell all DEGENDW 0.0659 | yes | 5943 | `0xaf67e9e0296dfa721cb2a380ad8434993e7e3b69d6263a554aad0c83f878b7a2` | +0.6734 fUSD |
| 9 | exit: sell all DEGENDW 0.0496 | yes | 10025 | `0x50786296ed11632876ea6f9572034ce7aeea1731d22ab0b44a83cb95daee60d4` | +0.5064 fUSD |
| 14 | exit: sell all DEGENDW 0.0157 | yes | 7397 | `0xbd66fd4624796538799147430a5c356d35fcc59acf9ade54a821a38798731ed3` | +0.1602 fUSD |
| 4 | exit: sell all DEGENDW 0.0243 | yes | 11926 | `0xf7cfa21a4837808e29b6d21481e1fda4ad2d2d7fd00e1e66ee8061158f3c355a` | +0.2483 fUSD |
| 1 | exit: sell all DEGENDW 0.0454 | yes | 5945 | `0xf5feb4df0c3d59443d8783dbb10a61f15982f2872fcc6af778922eaa3e942488` | +0.4640 fUSD |
| 2 | exit: sell all DEGENDW 0.0177 | yes | 11646 | `0x16944d95767c34cd7a1a1db3d3fe9e044df7ffe69f32736be44600b86e0a513b` | +0.1806 fUSD |
| 10 | exit: sell all DEGENDW 0.0643 | yes | 14037 | `0xa4361c503295d88ef4e2e30af43346b30b54c8e672ad2fd54e841a57f0c0253f` | +0.6564 fUSD |
| 6 | exit: sell all DEGENDW 0.0871 | yes | 12933 | `0xe1cd520fb3322b4e7875cc7543592b34411600a166cfa937b8f98845a45aae49` | +0.8894 fUSD |
| 7 | withdraw 1.1758 fUSD | **NO** | 13462 |  | transaction failed in module "evm" with code 10: failed to execute message; message index: 0: execution reverted: evm transaction execution failed (tx A9913EFDA |
| 11 | withdraw 1.5776 fUSD | yes | 10167 | `0x9cf27798ab927204092be4112a7a91ec26b64613328980e5f229d8cf2bbf112c` | returned 306659FAEA… |
| 12 | exit: sell all DEGENDW 0.0525 | yes | 14254 | `0x14c0990be2c957f46c4d47718a135e8b89776c070e3748232637f6aa3806da45` | +0.5368 fUSD |
| 1 | withdraw 1.9093 fUSD | yes | 9390 | `0xb46f6e158be403bf9eb3bb34d4a30312f2463f539d649879b2d8cf323b5a9abc` | returned 5B3CDDE3AD… |
| 5 | withdraw 2.2824 fUSD | yes | 19610 | `0xb791a1a845dfc7316ad9e8a7ceaaf4f22c12346743f0026be5616327de995bf6` | returned F09BDCFDEF… |
| 13 | withdraw 3.1779 fUSD | yes | 14178 | `0x9cb796b6ccac2226e327a3cbdd675fcfc94d733af0eb5a4a237aaf5892f10d53` | returned AB5CC18268… |
| 4 | withdraw 4.1729 fUSD | yes | 13649 | `0xbd2a23ac9dd110e962cb191fa72916d021a765bc5602d7efd0b5b04f3e02f31f` | returned C723796707… |
| 3 | exit: sell all DEGENDW 0.0062 | yes | 21083 | `0xa8c5c80043b952c00399b5043f3c36fe4fe3e7831657c741be5016331abc265f` | +0.0636 fUSD |
| 15 | withdraw 3.5402 fUSD | yes | 24801 | `0x4dcde9f912818674343f8c3a841b0cc2350bac9e7ae7a90c83ba088dfa2b7775` | returned 586BE3633B… |
| 0 | withdraw 2.1021 fUSD | yes | 21363 | `0x824b62940ca4b49f45777b146fe8916a5259d2c8386a2ad102472153d7301e0a` | returned 5A2C457D76… |
| 14 | withdraw 2.6813 fUSD | yes | 21831 | `0x7980eafcd22910601c287570f367ee55f1fcba767a362286272c88eeededdf1a` | returned 527CFA98BF… |
| 8 | exit: sell all DEGENDW 0.0271 | yes | 26637 | `0x6c206adcf94c0ccf030b9c24e46c25be90cf6622581c61ba1f268dd0e293a052` | +0.2772 fUSD |
| 9 | withdraw 3.0812 fUSD | yes | 27382 | `0x58960a8e620afad0e3804d35ee9b629ea0e2c7d2be86913541251ddeb67ea2d1` | returned 600B9AC898… |
| 10 | withdraw 1.9242 fUSD | yes | 24665 | `0x2d0d27b49337f85881ddc6ec9ea46c2118e9189700e4dda9a11cd1e66aec3bf0` | returned 97638722C7… |
| 8 | withdraw 2.0407 fUSD | yes | 15702 | `0x3387ad7939a34e553ca9890173712e215ec5dea25a7e8c90d8e3d294f26f8954` | returned 049C5C0049… |
| 2 | withdraw 2.0629 fUSD | yes | 45289 | `0x9065ae4dc8bc0bbab15bc07eaff55f76515e90f682ec79520d3dcc4acca3696e` | returned F78D5ADF14… |
| 12 | withdraw 2.3476 fUSD | yes | 50047 | `0xad85a8683021a9a909ca2b112638ad7cc1c53ec98c8200c8880c6b2671c6b164` | returned 3EF6163218… |
| 6 | withdraw 2.1287 fUSD | yes | 55740 | `0xeb603d3b406b58b7dd9bd8ee989e973fbb7353dbe72eaa4c6f49ad683b89b2ea` | returned 51A3A24D32… |
| 3 | withdraw 2.1943 fUSD | yes | 48559 | `0xe5578ae771f992cbf660cff411ae287e6787571663ea63a0f0e1aaa843fdc4e8` | returned 69A668BD32… |
