# DarwinAccount battery, 2026-11-20T23:32:04.053Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 12 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: FAIL.**

- users 12, rounds 5, operations 127 (126 ok), trades 93, deposits 21, withdrawals 12
- attacks 32, refused 32
- calls cut before their answer and resolved from the account's nonce: 0
- 105/105 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 6.9 s, p90 11.6 s, max 37.1 s
- failures: 1
- duration 244 s, 14.07 QOR of leftover gas returned

## State after the run

- relayer: serves 1 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 851 txs left
- relayer2: serves 4 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer2 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 933 txs left
- relayer3: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer3 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 956 txs left
- relayer4: serves 4 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer4 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 930 txs left
- BLUEDW: supply 18.2763, NAV/share 9.5065
- BALDW: supply 16.8497, NAV/share 9.6208
- QOREDW: supply 7.0967, NAV/share 9.9239
- DEGENDW: supply 3.5214, NAV/share 10.2771
- Activity: 93/93 account trades listed
- user 0: deposited 4.00, withdrew 1.9058, wallet 9.9058 fUSD
- user 1: deposited 5.67, withdrew 1.9360, wallet 8.2647 fUSD
- user 2: deposited 5.25, withdrew 2.1121, wallet 8.8658 fUSD
- user 3: deposited 4.00, withdrew 2.9280, wallet 10.9280 fUSD
- user 4: deposited 4.00, withdrew 2.7630, wallet 10.7630 fUSD
- user 5: deposited 6.18, withdrew 3.4530, wallet 9.2732 fUSD
- user 6: deposited 5.93, withdrew 1.3176, wallet 7.3909 fUSD
- user 7: deposited 4.00, withdrew 2.2306, wallet 10.2306 fUSD
- user 8: deposited 4.00, withdrew 3.7002, wallet 11.7002 fUSD
- user 9: deposited 5.27, withdrew 3.8239, wallet 10.5585 fUSD
- user 10: deposited 6.36, withdrew 1.3152, wallet 6.9506 fUSD
- user 11: deposited 5.17, withdrew 2.2711, wallet 9.1050 fUSD

## Attacks

| User | Attack | Refused | Answer |
|---|---|---|---|
| 0 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1mn58a5m4hnj2r9flx08gf5m24clccprcx8aj7t |
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
| 2 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | replay its own last executed message | yes | the classical signature does not verify |
| 2 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 2 | a buy that pays someone else | yes | a trade must pay the account itself |
| 2 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 2 | claim its own deposit twice | yes | refused: already credited |
| 2 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |
| 3 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1rv9tde9dawm2tyclteq79550l6e7queerl2mes |
| 3 | replay its own last executed message | yes | the classical signature does not verify |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |

## Failures

- user 10 buy QOREDW 0.38 fUSD: Missing or invalid parameters.
Double check you have provided the correct parameters.

URL: https://evm-testnet.qore.host
Request body: {"method":"eth_sendRawTransaction","params":["0x02f914b78226488202dc8502e90edd00853b5f2f360083041faf94abe07a51e1974d36970b40d3c1c84da37364685f80b9144498ca183d000000

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 10 | deposit 4.00 fUSD | yes | 8164 | `2E9F8C8AC804453F7228EE4DC4443E4A45958EF35CB184EEAAF38483B6CF4DFF` | send 5702C8E50B… |
| 4 | deposit 4.00 fUSD | yes | 7631 | `0870F525EEE51FF9851E491AE289C887B2CA41BD72DD6708522A2C38C1E83258` | send F92F3AF823… |
| 8 | deposit 4.00 fUSD | yes | 7863 | `B074C908E09C75891B18C82792AC9D0B6F7707829C70C2AE01C861FF393B4B38` | send 001969E84E… |
| 0 | deposit 4.00 fUSD | yes | 7938 | `05CFF3049C8BA4C4048D3448C719E4B75E2BA984F85DA50172CDC62D18DE5EAE` | send 5B86E892D0… |
| 9 | deposit 4.00 fUSD | yes | 8572 | `C2F5F0C2A552A6B79B22C636424B58E496E0D581A59B0504F961F7201B18F3E3` | send 17C61659EC… |
| 11 | deposit 4.00 fUSD | yes | 9014 | `B1455B82447333F39ADF8A70754263E12D81D4B4A215468C475B518ED973E7B9` | send DC85511ED0… |
| 7 | deposit 4.00 fUSD | yes | 9037 | `1F552DB69A8AED34E4387E086AC9139DAC0EA35BE116AA33ECDA7A1D4B05D447` | send 313922FE5E… |
| 2 | deposit 4.00 fUSD | yes | 9707 | `847FA07BF70DC89DCD4C8F4A7C21B98AD53FABDEFB93680289FBF58A7EAE5926` | send 50060E380F… |
| 5 | deposit 4.00 fUSD | yes | 10227 | `962D51B99FDD74EE55D4919CC04A42038B7AD0EE113DB764BB8D13F73F5027B0` | send 141496FFA3… |
| 1 | deposit 4.00 fUSD | yes | 10428 | `3CFCB7D5FD75790B42A64A8BBDBDBBEA57191F3910BF6E5837052DE37AFE22F7` | send F9E3BCE1A7… |
| 10 | buy QOREDW 0.38 fUSD | **NO** | 2774 |  | Missing or invalid parameters.
Double check you have provided the correct parameters.

URL: https://evm-testnet.qore.host
Request body: {"method":"eth_sendRawTr |
| 6 | deposit 4.00 fUSD | yes | 11094 | `0C231EA253837A0BFA7D70CBA99751FADFECBC120641884F5EFF73E2805BD08E` | send 8F5F350BAA… |
| 3 | deposit 4.00 fUSD | yes | 12209 | `9B6B42ED000FB03B4D0C6B60CCAD7CAD8C330058FB34172D5161BE22DFBC7F51` | send 3EA840C75B… |
| 8 | buy BLUEDW 0.56 fUSD | yes | 7841 | `0x4d5f13584d0aa09380cab961b0a01b0b4d075375c9a1bd02440582fe4f569461` | +0.0580 BLUEDW |
| 9 | buy BALDW 1.33 fUSD | yes | 8147 | `0x84e44301b565190260536ee5dc38954ec21e9a23828a7eca75240977112b552a` | +0.1366 BALDW |
| 11 | buy DEGENDW 0.33 fUSD | yes | 7876 | `0x1845429e9ab398615a048b33b6a326b8ad39f6a36369bc064e4155b112d6e1be` | +0.0318 DEGENDW |
| 6 | buy QOREDW 0.90 fUSD | yes | 6018 | `0x832d6266db563044465bc4ecd53d8ce39dc03dd8b64add8f1ff225a1c8d43115` | +0.0900 QOREDW |
| 1 | buy BALDW 0.61 fUSD | yes | 6722 | `0x2a81a73bbed7064f98feffe95b9328bcee5d0de4a0a0d9fde30ad6b3fc648894` | +0.0625 BALDW |
| 4 | buy BLUEDW 0.71 fUSD | yes | 9597 | `0x7127e7c593ad48756a3d7e722dac3cae973d082b5b329cc4ce855a1dce783d53` | +0.0742 BLUEDW |
| 10 | buy DEGENDW 0.32 fUSD | yes | 5889 | `0xb1859c79c93978ce112aa8d15dcf48ec8f38351fa0cdd03a130f578ede7ae81c` | +0.0312 DEGENDW |
| 7 | buy DEGENDW 0.61 fUSD | yes | 8697 | `0xbd5387e5da234338abf3a78201bf70aef97c5779ab22c9eb8d6db8fba8f605a2` | +0.0587 DEGENDW |
| 3 | buy DEGENDW 0.25 fUSD | yes | 6660 | `0xd7ff1fd6ae224f1ba9bf17d13b16bc45e03af989ff688767b74fd42961f0389e` | +0.0242 DEGENDW |
| 2 | buy QOREDW 0.61 fUSD | yes | 9345 | `0xc9bea58bb871c30fd707c02bd9a15549524c3ae03c6b141020bdcfdc93b70855` | +0.0608 QOREDW |
| 5 | buy BALDW 0.72 fUSD | yes | 9933 | `0x1e22bd361075c8361c693f7432d5d1a6e627bd530c7e17a1860617eb766f0b06` | +0.0743 BALDW |
| 0 | buy BLUEDW 0.66 fUSD | yes | 11788 | `0x608c5117a69f4a60b8ae406fa6b9cb12ea1d0ccedb38fcf49a96a9017e53ee9f` | +0.0689 BLUEDW |
| 4 | sell BLUEDW 0.0371 | yes | 2954 | `0xc4955287630af2805555613813051d974bb981422eb212f90272d72caf0265a1` | +0.3501 fUSD |
| 1 | buy BLUEDW 0.66 fUSD | yes | 5055 | `0xd52b161729f2c6a80746d9cc9f3672719c89a0db87dddb99f397ca0608cf6fad` | +0.0684 BLUEDW |
| 9 | buy DEGENDW 0.35 fUSD | yes | 5562 | `0x98f12c63aee4bab2ba0756819c3021e670d4375c16ba28403defe0be1f404bbc` | +0.0340 DEGENDW |
| 11 | buy BLUEDW 0.70 fUSD | yes | 5673 | `0x8d7633a27b5923fcfa95ba957039243bd2b760a00230abdaf4f4fda58136d049` | +0.0731 BLUEDW |
| 8 | buy DEGENDW 0.66 fUSD | yes | 7216 | `0xb109727dafe155d7515b20315ca60e1529e91f14b85c22db0f9ac4701b188f5b` | +0.0635 DEGENDW |
| 5 | buy DEGENDW 0.73 fUSD | yes | 5129 | `0x881855720ef6f31adbf8eedfdf27f3052a4be7f96dc3624a7524dc579bcdfded` | +0.0705 DEGENDW |
| 10 | buy BLUEDW 1.77 fUSD | yes | 6857 | `0xcc50b2ad2fccc54e9c2666309f04112d56ba9ef75d73b926a83a18a7c6729ae5` | +0.1848 BLUEDW |
| 7 | buy BALDW 1.41 fUSD | yes | 7036 | `0xb55cc43c7e096c3d64c5749ef32ea88c72146933364dd899a22f0c9ff3843259` | +0.1458 BALDW |
| 8 | sell DEGENDW 0.0317 | yes | 3187 | `0x76337284fddddd74078422bdc5f001c69166aeb1eabd420d08ee271f14a56cda` | +0.3242 fUSD |
| 3 | buy BALDW 1.05 fUSD | yes | 7958 | `0x5b1f44ced8bff2e5d7e196d80b06e3ed63947d310618f1dabca6ef27d52f943a` | +0.1080 BALDW |
| 4 | buy QOREDW 1.41 fUSD | yes | 5948 | `0xa3d7ef816158c3b0293197838ee8e61ff3c4e90af25ef47b58ef3cc08d4a10aa` | +0.1403 QOREDW |
| 0 | buy BALDW 1.76 fUSD | yes | 7954 | `0xfc8bf66fbd72952236558c7ff2a89c71b107e409d87203b5b694c0ecc044e86b` | +0.1814 BALDW |
| 9 | buy BLUEDW 1.50 fUSD | yes | 4530 | `0x0edd1d582bf3a3456c8889b707a5f0ea47c333eecbbe90b2e3f691d14b961017` | +0.1562 BLUEDW |
| 2 | buy BALDW 1.14 fUSD | yes | 8141 | `0x40e0a2f1935a68885aaddb5de4e805db89ca94cb77b189d0e645c6d7d6dec194` | +0.1176 BALDW |
| 11 | buy BLUEDW 2.19 fUSD | yes | 5867 | `0x775df7f3921641532065539bece2a875a5310496376aeb2aa9270947d9bb2e56` | +0.2280 BLUEDW |
| 6 | buy BLUEDW 2.00 fUSD | yes | 11631 | `0xa54691589bb31e7ea4792498f8fa2d174819dc896a05d59d034dbcb53edb53e4` | +0.2083 BLUEDW |
| 5 | buy DEGENDW 0.36 fUSD | yes | 5656 | `0x83d93ba53adb2148caf487b8c8f5bfc1249069dc573fe17861a8913679f998a1` | +0.0351 DEGENDW |
| 1 | buy DEGENDW 0.35 fUSD | yes | 7404 | `0x87bc56fadc7c747013ac86794c238de7630c6cbf3ace871ecef9e4898314c496` | +0.0334 DEGENDW |
| 8 | buy QOREDW 0.89 fUSD | yes | 5616 | `0x38ec6369dd86e74258358ae2b11080c212accec8378a17e1052064a42cc49f37` | +0.0887 QOREDW |
| 2 | buy BALDW 1.98 fUSD | yes | 3961 | `0x17ab74daaae23ac670f36b078176591e18577e44640cde50e50bfa5e75001336` | +0.2041 BALDW |
| 7 | buy BLUEDW 0.67 fUSD | yes | 9811 | `0x43ae2c6dca16c226d4cf4781638d6aebe52b5c44e70cf933ed567124afc7d0c4` | +0.0699 BLUEDW |
| 3 | buy QOREDW 1.26 fUSD | yes | 6482 | `0x33e3aa5c6d95fba3fdcce99c11dfc6a2f7575928eaafd2dbb8ccaf357e977d02` | +0.1254 QOREDW |
| 10 | deposit 1.07 fUSD | yes | 8046 | `8BC508D84DB3F461B5C1605948818DA4739B277C816B6F346FD483ED35D23A1E` | send B8692D9DDF… |
| 1 | buy BALDW 1.77 fUSD | yes | 4490 | `0x67180a809dddad73037e1aa0a4062149594719642d57b531b5b183df9d7b7042` | +0.1828 BALDW |
| 4 | buy BALDW 1.70 fUSD | yes | 7862 | `0x1825d630a70a1a9a313f1cdee91a3e1d4aada1fcdce1b8ecc28a18c9986fef84` | +0.1751 BALDW |
| 6 | buy DEGENDW 0.16 fUSD | yes | 5523 | `0xe53e1c30cef3c30a7596a1d286c0468298ce537c3a3fdcb1a480b5f3b8294078` | +0.0157 DEGENDW |
| 0 | buy DEGENDW 0.49 fUSD | yes | 8367 | `0xe0654a5bde2c4cd7bb38691bbb17cc51bde7204be8a3b196fb9db0af24c657be` | +0.0475 DEGENDW |
| 8 | sell DEGENDW 0.0159 | yes | 4206 | `0x9ffb59e2b6438b3027474d51cd7d1d59de63fa0c15eb1dffdf2a3743a0924752` | +0.1621 fUSD |
| 11 | buy DEGENDW 0.57 fUSD | yes | 8378 | `0x0ac52c2b063ccd5d2a94d86f2cf2a83c7bef5d071cbdcf18f17a64b3b433d6eb` | +0.0545 DEGENDW |
| 9 | deposit 1.27 fUSD | yes | 9544 | `F32A07872D864ED188AD78FD552A4D33C9AFD36FEE7EF4BB2450C95BCCB7DB5A` | send 5AC3A5BF2C… |
| 5 | buy DEGENDW 0.25 fUSD | yes | 8477 | `0xf29460f196e23c2cbf2ef3e7925fac84e3716299f9f6d9fd65b9b7e65e6810c6` | +0.0243 DEGENDW |
| 7 | sell BLUEDW 0.0350 | yes | 4541 | `0xfe489977c59d514a9d7bfcf49ea49f4476b5d723e260aff10f9bd40f6a965556` | +0.3301 fUSD |
| 2 | deposit 1.25 fUSD | yes | 8726 | `009090B749E02490BF914FD372D0BA4D7A551C446ADE9F64C22EE77E32CAB8B5` | send E7764AE736… |
| 8 | sell BLUEDW 0.0290 | yes | 4510 | `0x64fb6a3891e85ec348c93be86cbcbb52664e262d03f43a0794d6db8d6033e760` | +0.2741 fUSD |
| 3 | sell QOREDW 0.0627 | yes | 7571 | `0x7e0525056b4883c7f116ffc83ef10fdd103851a4bfd75c53734a099453a0c328` | +0.6187 fUSD |
| 0 | sell BLUEDW 0.0345 | yes | 6414 | `0x475c925d2825eaf4812c9f3e3b0b943e913f01c0f0f8f6f30ffc67b82efe8b6b` | +0.3252 fUSD |
| 9 | buy QOREDW 1.10 fUSD | yes | 6062 | `0xa36f20e618cd2e89f27cdb73f3aa1322edb9e499148cdfa4e9b03bb4d7069200` | +0.1097 QOREDW |
| 4 | buy QOREDW 0.41 fUSD | yes | 7821 | `0x04fd1545c4753a8d61cfb57f7eaedc349457e74673175ed8a27a058e5ccdfe71` | +0.0410 QOREDW |
| 1 | deposit 1.67 fUSD | yes | 8376 | `46C75BDB35C666FB6F131B2FE7120CFDB7EBF3F7AFA7EBC62DF2E92105D892E7` | send 8EB490ECFF… |
| 11 | deposit 1.17 fUSD | yes | 7611 | `AF89B27FB61E992CA9FF15A4F6C3C6656722FD87457FE6F4C1008B9DA1FF2FF9` | send F9A9F16139… |
| 5 | deposit 1.05 fUSD | yes | 8949 | `B042D279EBD47F67C1526DCB391BEECF1F799033C95C2651DE00AB96EAFE3675` | send 4181082BFF… |
| 2 | buy DEGENDW 0.53 fUSD | yes | 7747 | `0x7866195af12985ef54d2734fc7e9da8d7998afff0850e78cfe33caf4eb9316c7` | +0.0510 DEGENDW |
| 1 | buy QOREDW 1.30 fUSD | yes | 4339 | `0x2229fdf70258efdffb8f2a38dc7f889b76bf00c2921e43dfebb237cc86bd3762` | +0.1296 QOREDW |
| 3 | sell QOREDW 0.0314 | yes | 7985 | `0x14a0394e586b6f642ee69c35bc0a71a10a44d6e17ac013bc6c2641b9e2e02385` | +0.3094 fUSD |
| 1 | buy BALDW 0.69 fUSD | yes | 4077 | `0x0e389fabe4132935dfb9b80cfc9dad1f538ce1ba684ab43ea94ff179afe19ee6` | +0.0711 BALDW |
| 9 | sell BLUEDW 0.0781 | yes | 9791 | `0xa148a3e9c9390e86bd41d092af814c75b602d3eaa2716c369d2a039d70909f9f` | +0.7376 fUSD |
| 4 | sell BALDW 0.0875 | yes | 10203 | `0xf5f157e3044c369ea1d06aca0396a907e4218a38f64355f2118a62dc7078fdab` | +0.8374 fUSD |
| 2 | buy QOREDW 0.81 fUSD | yes | 8952 | `0xb182c9882ba0d1338af6f036b8f9f98771c936178c788d0bf9bf74ee9334b090` | +0.0808 QOREDW |
| 5 | buy BLUEDW 1.98 fUSD | yes | 10120 | `0x058f649bec3d6298af54227605b2b5b5afc2ff5c5b0d0eddc56fb5fea4ad1d11` | +0.2068 BLUEDW |
| 9 | sell BALDW 0.0683 | yes | 6937 | `0x0a24c398805a2d4fcff2d29ffc7c3c79ea46c94fa68abcfb9d7f4e763f9f0146` | +0.6537 fUSD |
| 2 | sell QOREDW 0.0708 | yes | 6103 | `0xd2e38ea9f0315dc6c2840ca3d72fffb1aaa7b8983c4267c532a8f4940bf89e89` | +0.6983 fUSD |
| 5 | deposit 1.13 fUSD | yes | 7936 | `4B8777CAA048B60D80472DA92269C24E2B6099F0E0457869B254FBB361CC5156` | send 6CF3B6D062… |
| 10 | buy BLUEDW 1.98 fUSD | yes | 36237 | `0x5f59a6075bbe1203ed3c0672485dd0f4173e3af604e788ab57280b251f5eb4e1` | +0.2060 BLUEDW |
| 7 | buy QOREDW 0.57 fUSD | yes | 34078 | `0x13d86ca2aee3bffb9d256839492efa955f8dcbe6bbea4e3f38826aed9d1d48bd` | +0.0565 QOREDW |
| 6 | deposit 1.93 fUSD | yes | 40091 | `4CE0929BF57733E058D3BA9DBF9C818BB3A665F6CD5EAF0D5C3CB0E4130C002A` | send B71E75D0C4… |
| 0 | sell DEGENDW 0.0238 | yes | 35145 | `0x9e0709128f848085f6537030b82f665bf934ef9a2b985377a52ba3b40af0402c` | +0.2427 fUSD |
| 7 | buy DEGENDW 0.51 fUSD | yes | 3966 | `0xd8135ade4a35a779efa58fad53644bc7d73812dee6a780939e5f49c306edd39f` | +0.0496 DEGENDW |
| 10 | deposit 1.30 fUSD | yes | 7630 | `8B3E17B37B018951B1AB2545865D830730521916FAE0204D286A2D8AE0ED68E1` | send CF8C7D9B5E… |
| 6 | buy BLUEDW 1.87 fUSD | yes | 4899 | `0xfc2e7c2783d4023029a7a55d6930bfa62874655b383f5e2228ddd483331baa14` | +0.1953 BLUEDW |
| 10 | buy BLUEDW 1.30 fUSD | yes | 3323 | `0x76ee4235fc69181baf595217c828b01c8b809c1180b767cb748c414f59bec536` | +0.1359 BLUEDW |
| 11 | buy QOREDW 0.39 fUSD | yes | 37077 | `0x87993dea2ea380070a674708c19c56b6f443d90d449113a075a41b20a8dd1480` | +0.0394 QOREDW |
| 3 | buy DEGENDW 0.77 fUSD | yes | 32916 | `0xd61927ca2ca8d6fd929611d97a569b5daf60f878d893054d7352458865df050b` | +0.0741 DEGENDW |
| 0 | sell DEGENDW 0.0119 | yes | 5860 | `0x3de3a65509c8791f3b1c7747e235ac990452570bb6df5be86ecc40b5380f5ccb` | +0.1213 fUSD |
| 5 | buy QOREDW 1.14 fUSD | yes | 17320 | `0x7b844ef078991ac6f41120f56de277ecc3ef92411ce246ce8898c7c94e2848db` | +0.1138 QOREDW |
| 11 | sell QOREDW 0.0197 | yes | 3850 | `0x7ac6be4b5e20aed70f469f070da387cba9538f96008dc30b3ae8de1d7a973074` | +0.1943 fUSD |
| 10 | buy QOREDW 0.69 fUSD | yes | 3652 | `0xc61478a4b8924ff83d34ded4deffc3bb0f0b7fc3232f25da54a998f55de4b139` | +0.0692 QOREDW |
| 6 | buy BLUEDW 0.74 fUSD | yes | 4715 | `0xcaeb943ff8c15e85f39739cfc62ef16d1c142022f6a71b1b5ef97c8acbdfa76c` | +0.0770 BLUEDW |
| 6 | sell DEGENDW 0.0078 | yes | 3542 | `0x3a9cb8520c50aa9f4cdf328c9892d331a6597d436d48f1e4752b9c04345c95bd` | +0.0801 fUSD |
| 4 | exit: sell all QOREDW 0.1813 | yes | 5516 | `0x3c56b16af3d435bc50962a03e1e8117798b216b28ede9a4f63b9e700b10f39ee` | +1.7886 fUSD |
| 9 | exit: sell all QOREDW 0.1097 | yes | 5781 | `0xa3557b43f18ffdc374fa26b4534237859365c024653e169f6a7216061a5ea278` | +1.0823 fUSD |
| 8 | exit: sell all QOREDW 0.0887 | yes | 5745 | `0xccdd0d128b73c7fdd251f96e1b62ca0bc28309e87a418a0f79c124d29168776e` | +0.8747 fUSD |
| 0 | exit: sell all DEGENDW 0.0119 | yes | 5733 | `0xc9a3e1c57e29d4cdbf8e40de9b60605a5ddb01c37f7feb885cb50c307df82142` | +0.1213 fUSD |
| 3 | exit: sell all QOREDW 0.0314 | yes | 5931 | `0xf7fa8546eb2d5c877ad7eb1cb3f890174a52cb3455117427d41043cd6dc26dd0` | +0.3094 fUSD |
| 7 | exit: sell all QOREDW 0.0565 | yes | 7301 | `0x4f4dbfc40a89c5e1c0bd5517dcbc49c1a59b60484651ee94999a8091ce8a72b1` | +0.5578 fUSD |
| 11 | exit: sell all QOREDW 0.0197 | yes | 7440 | `0xf0dc9e03bab17f328d7a174b9cc907f7f5b9a76b851acbc67e2058826c4f468d` | +0.1943 fUSD |
| 2 | exit: sell all QOREDW 0.0708 | yes | 7773 | `0x1205617c9f54542fe2ea7cd9af179839c45aa906a613f98d19020d256fcfd867` | +0.6983 fUSD |
| 6 | exit: sell all QOREDW 0.0900 | yes | 7831 | `0x43a6025c4bacd80f25ef7eb60728acc5e2d507b3b9dc3a2daa339778f9be2b66` | +0.8877 fUSD |
| 1 | exit: sell all QOREDW 0.1296 | yes | 9582 | `0x618c712e92d2797b5b7315499a226920a88a2a460382e389ee666add18e566e8` | +1.2789 fUSD |
| 5 | exit: sell all QOREDW 0.1138 | yes | 9641 | `0xdb9a4c1c4738aef58738f19b2231473b7e35ac6569cab97d7db2b413856e4955` | +1.1223 fUSD |
| 10 | exit: sell all QOREDW 0.0692 | yes | 10473 | `0xba7f83aef9a3e87338455c1dec41ed54530344339f0fe32243df212021f676b4` | +0.6822 fUSD |
| 3 | exit: sell all DEGENDW 0.0983 | yes | 4347 | `0x78dce1ca8a79b3c478d5a4204a3e5c5cced9f6052ab9b7fd267b65affc63f1a7` | +1.0043 fUSD |
| 8 | exit: sell all DEGENDW 0.0159 | yes | 4770 | `0xcff0ccf737024365614e078abaeef5a760425adedcf071c995259704b21be98b` | +0.1621 fUSD |
| 6 | exit: sell all DEGENDW 0.0078 | yes | 3461 | `0x6d539db74521ccbc8d202e370b2a61225481940034b2ffa548077ba0b21ed1f0` | +0.0801 fUSD |
| 9 | exit: sell all DEGENDW 0.0340 | yes | 6711 | `0xbc6fea0b2fd04bc5f2a0c302eb3b999a36a7ca7038ffff3cac68d309d7953753` | +0.3471 fUSD |
| 2 | exit: sell all DEGENDW 0.0510 | yes | 6370 | `0x94bd18bfafeda65548f978e506a2d80487208b88629f749279f737d651d8c61c` | +0.5207 fUSD |
| 0 | withdraw 1.9058 fUSD | yes | 10658 | `0xa74e11e69a9cad71ce59c0eaba70819a42696bf42d6cf09908c346b530714ce8` | returned 9BDEA08AE5… |
| 4 | withdraw 2.7630 fUSD | yes | 11689 | `0xf9fae9bbec684f01dbdb7cdeee67ef3ba1cc4a13f6f856e5329f00c263a69e88` | returned 66DBD4533F… |
| 11 | exit: sell all DEGENDW 0.0863 | yes | 11010 | `0x29e44c51867a46ec0f1e53f707929cbad06ad9e62dbe20a774308666345a755b` | +0.8814 fUSD |
| 10 | exit: sell all DEGENDW 0.0312 | yes | 8074 | `0x38e9703dba5c6c748abd36ba4c46eeb9da3324c61e8c30341064db34d86f8226` | +0.3191 fUSD |
| 5 | exit: sell all DEGENDW 0.1299 | yes | 9163 | `0xd393ffeb7dd103dbb69ebeff7d72788c3cd855a2d8f6b210427694513f27e7bc` | +1.3272 fUSD |
| 3 | withdraw 2.9280 fUSD | yes | 14460 | `0x5e405dd569e59c6b5489f6c78c0ccb475fc0d8d54e9c796948f55687c961f39c` | returned 75AADD988A… |
| 9 | withdraw 3.8239 fUSD | yes | 12915 | `0xef51164a33400db7a56cddf6954ffcf20b08c9495382b56d9323837b70e74fa2` | returned 9B7A629359… |
| 8 | withdraw 3.7002 fUSD | yes | 14980 | `0xdd09370a82b5d7bdeb0a01ffdeb6e9649002e84c5fb6f1d0696554861989afb7` | returned 08C0551A46… |
| 11 | withdraw 2.2711 fUSD | yes | 12003 | `0xf882a697b5061d3ec6cd9e59a29ef026b40803a69696ef2e78fb5410d77b92fa` | returned E33A4E87C4… |
| 2 | withdraw 2.1121 fUSD | yes | 20442 | `0x5140113d483906ac1f4883816ce88d6cd3d083f54f5fe8c1d21d225d94143b19` | returned 4FCF6650E2… |
| 5 | withdraw 3.4530 fUSD | yes | 19168 | `0x2e0614d7915c43bf165fe1317cf7215c4a6c07f0bcbb67cdab2bb63bfd294c86` | returned EB13B69829… |
| 10 | withdraw 1.3152 fUSD | yes | 23471 | `0x7f6b8edc9d05ea3a9f19429991f88f08dc7118dbf5bf1ce4dbcdb811e8eb02a5` | returned 1D24BD6F1D… |
| 7 | exit: sell all DEGENDW 0.1082 | yes | 35822 | `0x5d1fa36276768fe73b0a19f8b89bf2500cbbc7542eb828f933cfe64aa3b71b8d` | +1.1058 fUSD |
| 1 | exit: sell all DEGENDW 0.0334 | yes | 35957 | `0x9630f3c86f97bad96158e1f784717c7e64d9dc0d2bc9899cfc65fa2c80ba48cf` | +0.3411 fUSD |
| 6 | withdraw 1.3176 fUSD | yes | 38394 | `0xb0cb7baf27e1ed692d9ff6870c8affee9360cb87b553226fb7d6077508ddf49e` | returned B69E2F6A54… |
| 7 | withdraw 2.2306 fUSD | yes | 11606 | `0x2df55e812f3a04a9be069c557ebe26b37189be0f7b57a885f8786b18d29000c7` | returned D791603766… |
| 1 | withdraw 1.9360 fUSD | yes | 13404 | `0x342e2097946219f5a163e8b8caac9b2e80e671db7c5a1f938c5f531c3a6ba701` | returned 22DEA0CD42… |
