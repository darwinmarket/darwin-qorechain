# DarwinAccount battery, 2026-11-20T23:46:36.416Z

Suite `ops/src/account-battery.ts` against https://darwin.market/qorechain on qorechain-diana: 16 fresh QoreX-style users (coin 118, hybrid ML-DSA-87 + secp256k1) with no EVM window and no grant, trading in parallel through their DarwinAccounts.

**Result: PASS.**

- users 16, rounds 5, operations 163 (163 ok), trades 122, deposits 25, withdrawals 16
- attacks 32, refused 32
- calls cut before their answer and resolved from the account's nonce: 0
- 138/138 account transactions: the owner's ML-DSA-87 signature verifies over the rebuilt text and fails for nonce + 1
- trade latency (sign -> confirmed on chain, through the API): p50 8.4 s, p90 24.4 s, max 41.1 s
- failures: 0
- duration 319 s, 18.86 QOR of leftover gas returned

## State after the run

- relayer: serves 6 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 773 txs left
- relayer2: serves 3 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer2 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 898 txs left
- relayer3: serves 5 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer3 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 870 txs left
- relayer4: serves 2 users; EVM fUSD 0 -> 0, bank fUSD 0 -> 0
- relayer4 window: scoped to [0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12], 849 txs left
- BLUEDW: supply 22.4342, NAV/share 9.5070
- BALDW: supply 22.3453, NAV/share 9.6215
- QOREDW: supply 7.0967, NAV/share 9.9239
- DEGENDW: supply 3.5214, NAV/share 10.2771
- Activity: 122/122 account trades listed
- user 0: deposited 4.00, withdrew 2.5006, wallet 10.5006 fUSD
- user 1: deposited 4.00, withdrew 2.3452, wallet 10.3452 fUSD
- user 2: deposited 4.00, withdrew 1.8675, wallet 9.8675 fUSD
- user 3: deposited 4.00, withdrew 3.9803, wallet 11.9803 fUSD
- user 4: deposited 5.22, withdrew 3.1476, wallet 9.9319 fUSD
- user 5: deposited 7.29, withdrew 2.3923, wallet 7.1000 fUSD
- user 6: deposited 4.00, withdrew 2.3364, wallet 10.3364 fUSD
- user 7: deposited 4.00, withdrew 1.5110, wallet 9.5110 fUSD
- user 8: deposited 5.39, withdrew 2.2830, wallet 8.8922 fUSD
- user 9: deposited 4.00, withdrew 2.6189, wallet 10.6189 fUSD
- user 10: deposited 8.66, withdrew 0.7427, wallet 4.0831 fUSD
- user 11: deposited 4.00, withdrew 1.7698, wallet 9.7698 fUSD
- user 12: deposited 6.22, withdrew 2.5633, wallet 8.3440 fUSD
- user 13: deposited 5.21, withdrew 3.7279, wallet 10.5221 fUSD
- user 14: deposited 6.20, withdrew 2.9113, wallet 8.7070 fUSD
- user 15: deposited 4.00, withdrew 3.9635, wallet 11.9635 fUSD

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
| 1 | sign for another user's account (owner = victim) | yes | the classical key does not control qor1qqjyrhf8uwsuf8smy8ujjg4w7vpzx9zpfxtlks |
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
| 3 | sign for another user's account (owner = victim) | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | replay its own last executed message | yes | the classical signature does not verify |
| 3 | a message that already expired | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a message valid for more than 15 minutes | yes | the message expired, or expires more than 15 minutes ahead |
| 3 | a buy that pays someone else | yes | a trade must pay the account itself |
| 3 | a transfer of fUSD to an address of its choosing | yes | Darwin relays trades and fUSD withdrawals only |
| 3 | claim its own deposit twice | yes | refused: already credited |
| 3 | claim another user's deposit as its own | yes | no fUSD sent from this account to Darwin's relayers in that transaction |

## Operations

| User | Action | OK | ms | Tx | Detail |
|---|---|---|---|---|---|
| 2 | deposit 4.00 fUSD | yes | 8761 | `E580E2337FB9DFDEDD878AE02F00A38FCE41495F9C0DBA0069C614977A95662B` | send 360D09A4BD… |
| 9 | deposit 4.00 fUSD | yes | 8933 | `74EAA12AEE779832A045CC8A4F51E45D244998E21ED14BDF98FAC83EE97C384C` | send 68DC5DA4EE… |
| 6 | deposit 4.00 fUSD | yes | 7769 | `7B377D531DB4F10D19DA6E82AE04D9B4BD70BA7E9063936AAFF24F164A2D9232` | send A27CC6281B… |
| 14 | deposit 4.00 fUSD | yes | 8303 | `F4B1D30854463FE3A9DA4CA6AA3B49DE6A46E9511CAC0065C10512ABDD245023` | send 7B7AEC6BCB… |
| 5 | deposit 4.00 fUSD | yes | 11102 | `A59633F257B076B0DED9D96E5FEBC3F40199124E75D1D408DC4A31B31E32F7F5` | send 9BD165FD2D… |
| 1 | deposit 4.00 fUSD | yes | 10966 | `64E06401589508698636900C24285D01579D97D397A7E314EE46499DC39753A0` | send 745C7F94FD… |
| 11 | deposit 4.00 fUSD | yes | 11941 | `4DD5DE638434209EE72B208CEC2142FB6075B146691BB79CAE5B94BF55A51189` | send B350DA9497… |
| 4 | deposit 4.00 fUSD | yes | 11800 | `A6703226A3896BA30E275558E715E003CCD5E93EA7BB21BC5BCECAEA8DFF7EFE` | send 254A271DD1… |
| 10 | deposit 4.00 fUSD | yes | 12158 | `4BBA78DB838F2FC9563BA033C252063DDF15C7C80303DD178B375042B1A3C9CD` | send 785989C214… |
| 6 | buy QOREDW 0.24 fUSD | yes | 4598 | `0x3bdfac9c48ef5b770d6d4600945cff3cbef9671eda330c16ff5a3f6fc50cbdfa` | +0.0237 QOREDW |
| 13 | deposit 4.00 fUSD | yes | 13521 | `4CEBC9A6A8A5D17B02B78D51BD34A34DDA8DDE1696C859526714941B870123B0` | send 4BB332F6F6… |
| 7 | deposit 4.00 fUSD | yes | 15591 | `67874E69103A8E1BFA93A0FD19780F8C932C17A53662E31272470F0340B26DF3` | send 9C462175F5… |
| 2 | buy QOREDW 0.38 fUSD | yes | 7984 | `0x2138532b4858bb59101ffcf4e6ff42ece149d98f7a24a2cc2c5ae5f70ad53db5` | +0.0376 QOREDW |
| 14 | buy QOREDW 0.30 fUSD | yes | 7672 | `0x998a9aedd3430ae74acbcc171ee00fbcb58a63c5b54194efeeea4efeb057a809` | +0.0305 QOREDW |
| 8 | deposit 4.00 fUSD | yes | 17564 | `A894E9CECDA05E0E068F82CAA54FC5EBC3603CCEEEF717B05AEE904811988B2F` | send 3D279DA268… |
| 15 | deposit 4.00 fUSD | yes | 19112 | `930D0CA4BC5C144CE6D12D8E56C4233422A68A0323444CCAFC3961A6AA8EC369` | send 73E5C72B2F… |
| 4 | buy BLUEDW 1.13 fUSD | yes | 7946 | `0x0f653f1a1f679959860cf821eaa55f43246833ef06c62a1db07f452893f98ef2` | +0.1176 BLUEDW |
| 1 | buy BALDW 1.16 fUSD | yes | 8962 | `0x8e05c9f86ace68520bee2a3a212fed9e8f742ffa44cddd327e9c007b486df0a7` | +0.1191 BALDW |
| 9 | buy BALDW 0.71 fUSD | yes | 12290 | `0xeff170b989900c3897478e1dce84e795b3c26ba1363aca2f69ab67b945497e71` | +0.0734 BALDW |
| 3 | deposit 4.00 fUSD | yes | 21654 | `BCE9E76B65C8601FE64D1B7DC02028096875CA7CD13561C0964646026582F6FC` | send 8C3BF3D96E… |
| 6 | buy BLUEDW 2.24 fUSD | yes | 7983 | `0xb9c19065114c8de4ad62146f295448c26e5e0f23463f7b7d207322546a4913be` | +0.2340 BLUEDW |
| 11 | buy DEGENDW 0.61 fUSD | yes | 9682 | `0x06ddb21227244427d785508877cf05bfc83727f5f1f63fcf53143095cf56807e` | +0.0587 DEGENDW |
| 13 | buy BALDW 1.58 fUSD | yes | 8922 | `0x344ae308cf890da646add236b730fe23a23fcbaec9e6e4636621b93d96bd1fc3` | +0.1627 BALDW |
| 10 | buy QOREDW 0.34 fUSD | yes | 10371 | `0xeeb8ca9c614fdeca59fa4ccf1131f03df24a9da2bf827cc76a2060d3ee7b8105` | +0.0343 QOREDW |
| 2 | buy BLUEDW 0.95 fUSD | yes | 5818 | `0x5c294e69379047e512d852f82d3333bb62a2d7dbfdbaeef55c8ec92f7993a4ab` | +0.0992 BLUEDW |
| 12 | deposit 4.00 fUSD | yes | 24193 | `83241800E0DAC9266ED059D2EA65F25AA74C4A99B429E622525D990C7D4EB48F` | send EE37D8695C… |
| 5 | buy BALDW 1.33 fUSD | yes | 15884 | `0x8f7ffde7ef0a2bb6b143683cfc01e9512e6ae1fb5e6efaf834dad78d181b3ae6` | +0.1366 BALDW |
| 8 | buy BLUEDW 0.70 fUSD | yes | 8420 | `0xf33effcd51d939b616360b0281a4f2873fcd2a3ae254b12a0f5ac0c203aebd2c` | +0.0733 BLUEDW |
| 4 | buy BLUEDW 0.92 fUSD | yes | 4879 | `0xe7ca2758399201e42ddc97908e1c33a7cb815082fe73d51efc64a10cf4622a9e` | +0.0959 BLUEDW |
| 1 | buy DEGENDW 0.55 fUSD | yes | 5699 | `0x36364ef3fa9f3111f73242ebd009db3460715d9288dfe929a08edc84c5311aac` | +0.0526 DEGENDW |
| 7 | buy DEGENDW 0.32 fUSD | yes | 11783 | `0x800d8f783083e8d10a84dcb9320bf8d4daff189326f823a506828bd1b65059a8` | +0.0312 DEGENDW |
| 0 | deposit 4.00 fUSD | yes | 29126 | `6748B4B061F838A8238B0FF3284E1418A34404863D8E725F617F9E03D8BB28F0` | send 9E9D17A40F… |
| 2 | buy BALDW 2.30 fUSD | yes | 5847 | `0x370522a32c65d5a5e59cdf809606d11b56c7079854abd8572ad083ba1a33895c` | +0.2375 BALDW |
| 3 | buy DEGENDW 0.62 fUSD | yes | 9177 | `0x416c3bd6b158fc11115071f5bb16712a4d803d9657cf52d022562ad18526d60b` | +0.0602 DEGENDW |
| 6 | sell BLUEDW 0.1170 | yes | 7975 | `0xc34d7c00b0573f116ac345caf1ccbe4cf129d75d77e56e45c3f5bc1726eba506` | +1.1056 fUSD |
| 13 | buy QOREDW 1.33 fUSD | yes | 7048 | `0x1f5612f72ae14a01272268effdc0debf762c8f257d85f2dab6656772676452bc` | +0.1328 QOREDW |
| 15 | buy DEGENDW 0.49 fUSD | yes | 12745 | `0xffcd92c37b4b6f3ff7ca4250b47950e2abaa4bf30322395bcbb3514e06b25f35` | +0.0475 DEGENDW |
| 1 | buy BALDW 0.50 fUSD | yes | 5778 | `0x4817fcc7ff8a6061e25a8a66cc0467aeb38d1fba7da73eb769fbe7bb349708b0` | +0.0516 BALDW |
| 9 | buy BLUEDW 0.66 fUSD | yes | 11412 | `0xc9ee3b3276fbf1ef9b0f6f08aef1e3471c5b928954be41eb63fbc53d9f153266` | +0.0684 BLUEDW |
| 14 | buy DEGENDW 0.53 fUSD | yes | 16562 | `0xf0c7dfa4f6d4eabe4f428bd726779614f826855d572ced1a0706bb2228faa1cd` | +0.0512 DEGENDW |
| 10 | buy BALDW 1.06 fUSD | yes | 10431 | `0x190bf789f58cc555165cc45e29befcb8e9d60f2799b38bab12d854b61c55cabe` | +0.1097 BALDW |
| 4 | buy DEGENDW 0.45 fUSD | yes | 6960 | `0x1b8585e887dc6e1968d8594452fcb9cdeab4d65c5e034580ba923ed489c0d03b` | +0.0434 DEGENDW |
| 2 | buy DEGENDW 0.32 fUSD | yes | 3956 | `0x9bd2f9e565dcec24a466c419ed1032cf1cdea0e71dc5f2181dd190543a46c907` | +0.0305 DEGENDW |
| 5 | buy BALDW 1.76 fUSD | yes | 8518 | `0xa79959152fedc9499fe4b5a8f3277499b8f222eaef024bb7917bcefa0d4d0766` | +0.1814 BALDW |
| 7 | buy BLUEDW 2.19 fUSD | yes | 9311 | `0xe8ab841a4e88819a08708cb9f7d816c1037ff09b6374fb0061759f3b79213396` | +0.2280 BLUEDW |
| 1 | buy DEGENDW 0.55 fUSD | yes | 4216 | `0x02e01205333bd72015a792dab17c37a68e6bd05c5bea5bb2ce3b6346575a8bde` | +0.0527 DEGENDW |
| 3 | buy QOREDW 0.36 fUSD | yes | 7799 | `0xcbc28ef4331ec6d4d10557242ffad5524f7909f55d8a37972b26d49ab64e05cf` | +0.0361 QOREDW |
| 6 | buy QOREDW 0.28 fUSD | yes | 7937 | `0x34bfac1eb2ddbfe671cdf52dd3923f677c34baa3b5d1b566613376ef1c4276d5` | +0.0277 QOREDW |
| 12 | buy BLUEDW 1.14 fUSD | yes | 13052 | `0x5c4928d0e870cd012964195cf1074f55b3f89821b4596e608f2a60d1666493af` | +0.1189 BLUEDW |
| 4 | buy QOREDW 1.35 fUSD | yes | 5407 | `0xc5605e234b426fd1327f52891cfe56f5d2572c2bfe03e28ff669ef2aee5fa467` | +0.1346 QOREDW |
| 13 | deposit 1.21 fUSD | yes | 9061 | `CE0AE7E388E9FF9E92B86DD40B6948BD41592309EEFF553532BA6610A7D8FF09` | send 9E661AA802… |
| 15 | buy QOREDW 0.80 fUSD | yes | 10055 | `0xc8431f0701ee5b84054cdcebd025a398f91402355a35c7138245ae723a821b07` | +0.0803 QOREDW |
| 1 | sell BALDW 0.0854 | yes | 5194 | `0x2d3e800f075fd117afe4841f4b413666364f947d315e5e85dbc2ea0849242429` | +0.8169 fUSD |
| 6 | buy DEGENDW 0.49 fUSD | yes | 7546 | `0xebf26d3d759808c0b59555fa06d945cb1afc3d3926402cc024d1628c80fc4556` | +0.0475 DEGENDW |
| 9 | buy DEGENDW 0.49 fUSD | yes | 14191 | `0x78877be451c56e507652e2980812d6b7514b161e8cd7e090abcdb108fe8f2af0` | +0.0475 DEGENDW |
| 15 | sell DEGENDW 0.0238 | yes | 5037 | `0xf9a9c78d1501f85379267f049b58838336224ba9f9e853e9699bf6802d92e744` | +0.2428 fUSD |
| 4 | deposit 1.22 fUSD | yes | 8888 | `6B64363C89ACE1DB1A1A42B1E4BB6ECC983F2C4A663A0F910CD7C895AFDCF9DC` | send 1CB5E38E54… |
| 10 | buy BALDW 1.98 fUSD | yes | 16577 | `0x38d5ad38942f7001eefb7c69e2d40523979910c7ccc2ef843bf39802801cad24` | +0.2041 BALDW |
| 1 | buy BLUEDW 0.81 fUSD | yes | 9221 | `0x3c4f26ed40f423558f35b7629c17804aeee3541dbaf72321e051dca64ea1ac99` | +0.0844 BLUEDW |
| 6 | buy BALDW 0.52 fUSD | yes | 4991 | `0x862ad025ea99c102a5a1533b581c9da822301775b4db6de9ccf29c482718ed70` | +0.0536 BALDW |
| 15 | buy QOREDW 0.39 fUSD | yes | 4403 | `0x1ccf467a95c124d23638f02d6e467e15d5432ba70666be336794503a4bdf742a` | +0.0394 QOREDW |
| 4 | buy DEGENDW 0.38 fUSD | yes | 4268 | `0xea91e1aadeef6713ce4748c3d7eedf359625449da575a13fd85c311b7b727400` | +0.0368 DEGENDW |
| 9 | buy DEGENDW 0.58 fUSD | yes | 6112 | `0x2fabf97de18f089a708b0ab834dc4e8d612a0114c21112096423f75ab9b48a45` | +0.0557 DEGENDW |
| 7 | buy BLUEDW 1.25 fUSD | yes | 17164 | `0x33a2bb1b5378d8a99166bb685ed69865ddf2f71f5751364a5930d8fa6fe76780` | +0.1305 BLUEDW |
| 11 | buy BALDW 1.41 fUSD | yes | 35686 | `0x917f08c016c1d16cb692e8157fb0c4c90e9900ebf529052233d8f2e5728f36a2` | +0.1458 BALDW |
| 5 | deposit 1.31 fUSD | yes | 21811 | `4BE3916C437A10FFF50560CDBB2A6954DC7B61A95C21DC2187CB19FD5AB0E85C` | send C39F1D3C0F… |
| 8 | buy QOREDW 0.49 fUSD | yes | 32174 | `0x0d44357915fa4d893f62ad6f4f090b3cd2c320796327aaf23c0b310a5ee86f5f` | +0.0491 QOREDW |
| 4 | sell QOREDW 0.0673 | yes | 4247 | `0x44d53f12c91dac15abb3245d88f7e292182ac0ec078dc4e8cb9ceef1790e1c1e` | +0.6637 fUSD |
| 0 | buy BLUEDW 2.26 fUSD | yes | 32505 | `0x948e1d3ed70cb2ea993c52f13669a90a0bc64471d840bf1a72fdb8142731163b` | +0.2359 BLUEDW |
| 11 | sell BALDW 0.0729 | yes | 4246 | `0x926f6105a9aece16c1c92cc4c1306b993786bbe50c3da78dc8115db66d2d706e` | +0.6976 fUSD |
| 14 | buy QOREDW 1.10 fUSD | yes | 27915 | `0x1d17d48a92fd9e4b980ced9e682e81f65cc008e401e5cd7cfcea5709ff0f1e68` | +0.1097 QOREDW |
| 3 | sell DEGENDW 0.0301 | yes | 24373 | `0xe13bf732195b895e5852b0d487b938524070bfd2d64d140dafca382bb64cabd7` | +0.3076 fUSD |
| 12 | buy QOREDW 1.07 fUSD | yes | 24924 | `0x72be8603475b1f7dd606a88570daa8e09e05ab25af49a1f288d0f1ac615a5c09` | +0.1073 QOREDW |
| 8 | buy QOREDW 0.81 fUSD | yes | 6940 | `0x8c732b3c78a992931cd00fcb243f51b2ffae884fba97ba355af3086f62b18d58` | +0.0808 QOREDW |
| 2 | sell BALDW 0.1188 | yes | 34382 | `0x43381094355c1790a6de28bdb1ba9dc072244cc6fcbc1140c85cc8f9c5fd8396` | +1.1364 fUSD |
| 0 | buy BALDW 0.69 fUSD | yes | 7983 | `0xd63fa5c615a4c83442541571d08365830a59964e6ff0ebed5eb000175cc8897a` | +0.0711 BALDW |
| 13 | buy BLUEDW 1.31 fUSD | yes | 30015 | `0xbabda052b6e6f1de4f529eae224595e92f0367b4728b97099d9bc1df5af44d88` | +0.1361 BLUEDW |
| 11 | buy DEGENDW 0.77 fUSD | yes | 11282 | `0x2077e07f13afbbc5b97b4ab2237b787ae3ba70c8d1679fb7f398576082709a36` | +0.0741 DEGENDW |
| 2 | buy QOREDW 1.19 fUSD | yes | 4168 | `0xd699e2f4beffe807563c8ccc8a5bc2914d5b0e0c3cbbfd24450cc9b12b52b5e0` | +0.1188 QOREDW |
| 13 | sell BLUEDW 0.0681 | yes | 6970 | `0x28be6b96be32a462fe2d8b21455a528d39cba5d77c6d8e1f3156f8d75d3ada80` | +0.6432 fUSD |
| 14 | buy BALDW 1.55 fUSD | yes | 15736 | `0xe5a68007650675d85b6b55f5a6e651b693cfe8bc5bbf44a86cc818af3463406e` | +0.1600 BALDW |
| 12 | buy BALDW 0.93 fUSD | yes | 17225 | `0x986d4c8c2ed96e83a1f780cc440c79170b6f0f4cefd0653e00e7a4a80f9137b7` | +0.0957 BALDW |
| 13 | buy DEGENDW 0.60 fUSD | yes | 3434 | `0x15df782dc59c313f15d2b74a5f36707bff73f3bf313fee5f775688215a7dd09f` | +0.0583 DEGENDW |
| 8 | deposit 1.39 fUSD | yes | 17876 | `AF15FF6574F37DCB5C0D69692A92B81C8E661589B2536E61624EDF2400781BF6` | send 3F070618C8… |
| 13 | sell BALDW 0.0814 | yes | 3881 | `0x65b42ae654521500c2533f40cac95c132ba39a705524341c7e07ac7e980cfb3e` | +0.7784 fUSD |
| 15 | buy QOREDW 0.57 fUSD | yes | 34518 | `0x7383da121a76ac4bd6cce2780c5ee3f14dbda551467f6efd31ede72ac98d5cb0` | +0.0565 QOREDW |
| 7 | sell BLUEDW 0.1792 | yes | 34603 | `0x315c0021a2e93b54d42145d077f2c4f5f7d63e204a4158bf761d734bf8e966ad` | +1.6938 fUSD |
| 0 | buy DEGENDW 0.21 fUSD | yes | 20490 | `0xf88e3605da452ae50574656fe412abb48ec63c61b4f0d27d0ec5a7a6dbd18c70` | +0.0199 DEGENDW |
| 10 | deposit 2.36 fUSD | yes | 40582 | `1E246C3832EF2EA5041D32FD042F736C362A6C5E605F9382A8A3E7370DA366F3` | send 6D70315C1C… |
| 11 | buy BALDW 1.50 fUSD | yes | 21608 | `0xa573d1fb1b67e1b7044617ae23284176e60e3ea4eb8709f2e8f8f6339f5098c9` | +0.1547 BALDW |
| 9 | sell DEGENDW 0.0516 | yes | 41089 | `0xb0ad98f6de1577370f6eee1bace5534b743a1ca82d51f1c443dd3c2e8803ac68` | +0.5273 fUSD |
| 5 | buy QOREDW 1.23 fUSD | yes | 38762 | `0x17e9bf18d5ced461e5c783fac6a9f9e00bbd7fa7aa9ae95fb52569f23cff10b6` | +0.1233 QOREDW |
| 3 | sell QOREDW 0.0180 | yes | 34415 | `0x3bb9e85ef42ff22a08cf478f66e455d99e802d9dcda4a6593111c00c9004c170` | +0.1778 fUSD |
| 15 | buy QOREDW 0.81 fUSD | yes | 10239 | `0x5f63a89a5851a761980857873bb5fc9df11f3206e2c95d1fb980393128c97513` | +0.0804 QOREDW |
| 14 | deposit 2.20 fUSD | yes | 20051 | `9D20D27C7EAE79EBA6ECE2E62B11367536AB729FAB6AFAA4711267223F897428` | send DA32A06B2B… |
| 12 | buy QOREDW 0.51 fUSD | yes | 18204 | `0x054e047beb7a73b6e3e496f506f0bd3c3e93b23b5faa33c79782d460788310da` | +0.0507 QOREDW |
| 14 | buy BLUEDW 1.73 fUSD | yes | 4076 | `0xf6819ffc1af77a4f21ce07c4d2655a64ce81de00f43ccb612506781536b40585` | +0.1800 BLUEDW |
| 7 | buy BALDW 1.60 fUSD | yes | 13765 | `0x83a3ea7db0b930ec15caf22d78a7ae6b180e68d61b182617c5470eb566429213` | +0.1651 BALDW |
| 8 | buy BALDW 2.39 fUSD | yes | 20421 | `0x3b6c7e4d7be3762c9555d8c7784f0135affb5480e7319d66c0816f17056fd40c` | +0.2466 BALDW |
| 9 | buy DEGENDW 0.28 fUSD | yes | 9616 | `0xc6c2dd5a443db211d1d0d40dfad25faac51247e9dfe06c2c009df4c6395d5d5c` | +0.0271 DEGENDW |
| 10 | buy BLUEDW 1.98 fUSD | yes | 13310 | `0xe0a3b78f19fa863d038e1195981b0b3adad23ecf072f28ec193ab6dec7142cf7` | +0.2068 BLUEDW |
| 5 | buy DEGENDW 0.18 fUSD | yes | 7222 | `0x082c2a7f9add79f98b48938b0d4069462e5e11ab1585fd30bec4ebd387986039` | +0.0171 DEGENDW |
| 0 | sell BLUEDW 0.1180 | yes | 16480 | `0xe90ddfdb6118ec0bb9be62584647baaeb438c41527402a10300e0d03b8ed5e73` | +1.1142 fUSD |
| 3 | buy DEGENDW 0.67 fUSD | yes | 9564 | `0xdecf94df19b428cc8678ec89139644a3ceeb95b8b850d90737e8075db0b88af0` | +0.0643 DEGENDW |
| 11 | buy QOREDW 0.36 fUSD | yes | 11974 | `0x17a9e80fdbf5d1e4149fbac6c4cc816f2d17dbdc1daa05b087f4f73a76b9ac40` | +0.0359 QOREDW |
| 14 | sell QOREDW 0.0701 | yes | 5610 | `0x17371f872c374505d9845ff56780d6328fc999bf6b3ebd6ffbad97a5feba405f` | +0.6913 fUSD |
| 7 | sell BLUEDW 0.0896 | yes | 9163 | `0x143746cb8e033234654ea66684b106c8ce522b0bde0b4b7ac4f5e67483e2dd61` | +0.8466 fUSD |
| 12 | deposit 2.22 fUSD | yes | 11805 | `DAFD264231223501208A1CA5B3B91C75CD0DCB1BF66403223D319A9A55FCDC62` | send 8FC71CB4AB… |
| 8 | buy DEGENDW 0.49 fUSD | yes | 9545 | `0x705461c44e8acda02b958479583b8ea012588768bd6869b3ffbf7fff4f0c4bb6` | +0.0476 DEGENDW |
| 0 | buy DEGENDW 0.56 fUSD | yes | 8503 | `0x4abfb9c233dc17dab49492b4709e4d3c7adedd26788cfba1ee2fad44ccbcda51` | +0.0537 DEGENDW |
| 3 | sell DEGENDW 0.0472 | yes | 9965 | `0xead80d63e849f6e56091331b7bad662e51649dd466d3203f48f1e120fd6d0c74` | +0.4820 fUSD |
| 12 | buy BALDW 1.58 fUSD | yes | 4635 | `0x06717cacea121d0947244a4332c7e067c68a5c52ad3bcfdf8117813119ca2adb` | +0.1627 BALDW |
| 10 | deposit 2.30 fUSD | yes | 13855 | `616DFDA38DD61D132ABCA925A9D15F00E9FA4A02F8107A6C815AFCEE18254F45` | send EF6BBDF53C… |
| 8 | sell DEGENDW 0.0238 | yes | 4585 | `0x08d0c906e5c18f59ba9b12000dd132e4856ef3a0054ee04db0f9ae8f877378c2` | +0.2432 fUSD |
| 0 | sell BALDW 0.0355 | yes | 4620 | `0x66ee9812d6b21d2be1ccb8ff74d3a8f79c67d2bb65b7285ef16b4f65cc79a975` | +0.3399 fUSD |
| 12 | sell QOREDW 0.0790 | yes | 5204 | `0xce3bd34057ec59031a41c5ab8ba2e244173451b3ad9d22c69c2c0b7ea182ad29` | +0.7793 fUSD |
| 5 | deposit 1.98 fUSD | yes | 16993 | `0E80931C7B685E88096E6A7198BA4D7283C242DEB9F9368FF61C57C22424739F` | send 19D8903EEA… |
| 10 | buy BALDW 2.30 fUSD | yes | 5214 | `0x5de210f12d39a2db70da024440c2a7297ac327541f8093d95df9241c56aa7a61` | +0.2375 BALDW |
| 5 | buy BLUEDW 1.81 fUSD | yes | 9983 | `0xd6ba9f8f286fb287577fe9feb5e53d23c7c3378dbeaeb4f464ba8e882afd5b17` | +0.1886 BLUEDW |
| 10 | buy BLUEDW 0.60 fUSD | yes | 8170 | `0x95fb795fd54a26c75fc57cb0d74cfad628b0b23c99d8a7268347a33eb57c9286` | +0.0630 BLUEDW |
| 5 | buy DEGENDW 0.29 fUSD | yes | 3159 | `0x3a878157cbb54f8a4f6ee0cfe92c12cc6380617df99396b3e60d344557f6ffb6` | +0.0282 DEGENDW |
| 12 | exit: sell all QOREDW 0.0790 | yes | 3666 | `0x4b9f9ddc0cd97f4724fc460222ca18bbfbce2ab64e3ecdfb6d0e722ebf695111` | +0.7793 fUSD |
| 5 | exit: sell all QOREDW 0.1233 | yes | 4544 | `0x03913fbed97ff6281589f93b1ba9b450b699bf808f53ede2ea76c3f989b7e651` | +1.2160 fUSD |
| 2 | exit: sell all QOREDW 0.1565 | yes | 4632 | `0xdd4508518e031da225c10118c85a07b12c17e852707c05bc5a8d5687a2f67a05` | +1.5433 fUSD |
| 0 | exit: sell all DEGENDW 0.0736 | yes | 5134 | `0x452adbbea7e5a5d0f72e36752b994e12f1d8c16f748e7b1fab9159f7844af656` | +0.7522 fUSD |
| 1 | exit: sell all DEGENDW 0.1053 | yes | 6933 | `0xc62ab487bb313fc0e5b4f2223cbdafbdb541f8e7e8b87ad5859188f32940c82f` | +1.0754 fUSD |
| 3 | exit: sell all QOREDW 0.0180 | yes | 7693 | `0x55354324202fcffa0dd32d78cdfd49f1818ca80310cbbfbc91567c5240de3f8c` | +0.1778 fUSD |
| 8 | exit: sell all QOREDW 0.1300 | yes | 7715 | `0xa9f30a339c17561f65db1e2fc63cda1cef5928c438d0461e5a19830f6d248302` | +1.2820 fUSD |
| 13 | exit: sell all QOREDW 0.1328 | yes | 7767 | `0x0c8e36fb288682fdc1f392e04f728226049951d7f4e7078c91014d21e01fcf7a` | +1.3097 fUSD |
| 2 | exit: sell all DEGENDW 0.0305 | yes | 3242 | `0x91310cdcfb96835f3c19666a6269f4bb8470453e8288aa1b061651681ce61804` | +0.3117 fUSD |
| 6 | exit: sell all QOREDW 0.0514 | yes | 8378 | `0x85d2ebc403185b847def92a90a55487f1ab5c5c1d2782dfb786dffe9b0878eda` | +0.5070 fUSD |
| 14 | exit: sell all QOREDW 0.0701 | yes | 8361 | `0x129a2c55a1e1f0f47e969de2d876a105424e8b6a96ab4b05e8a7f94e339c7266` | +0.6913 fUSD |
| 11 | exit: sell all QOREDW 0.0359 | yes | 8426 | `0xfc35bf9e3a0d3349db8b839912711e71d28b8f502459ed1b75b5e04b90bc7fd6` | +0.3541 fUSD |
| 7 | exit: sell all DEGENDW 0.0312 | yes | 7958 | `0x9e0aca7c7d83e34e0add5975961aef774e2c5cb7268c979bc20621f9c439d91b` | +0.3191 fUSD |
| 10 | exit: sell all QOREDW 0.0343 | yes | 8841 | `0x72ec5de1071da7fdccc43d9c8ac16bfac1c49061fd76903de72720f5f451060c` | +0.3384 fUSD |
| 4 | exit: sell all QOREDW 0.0673 | yes | 8727 | `0x7495795f97c4e9ea6c9f6e011396c221a67e41fd299d230b8cc778ac3536113b` | +0.6637 fUSD |
| 15 | exit: sell all QOREDW 0.2567 | yes | 9149 | `0x88bda7b909f2ea17f041992ac3b37fc21ebd89e200573b7fbb5091005ff493a1` | +2.5319 fUSD |
| 9 | exit: sell all DEGENDW 0.0788 | yes | 9127 | `0x249d1561d919761211acebf313077ef8f45cc52fd4e31855a24aee099dffedbe` | +0.8045 fUSD |
| 5 | exit: sell all DEGENDW 0.0452 | yes | 7681 | `0xa88043495e3b1a71ef776a259e4e20a14184fdd67269c76ca1bd729c97eaf6a1` | +0.4620 fUSD |
| 6 | exit: sell all DEGENDW 0.0475 | yes | 4035 | `0xce67a67aa25ae2b72fe28b2f1a9b690c16204d1dfd195dc424e89ee7c812e4f0` | +0.4855 fUSD |
| 4 | exit: sell all DEGENDW 0.0802 | yes | 5522 | `0x54ed9109812cbcc7331fcd9985c3cdcdad1c9180669bc62f96349aa6d8281639` | +0.8190 fUSD |
| 14 | exit: sell all DEGENDW 0.0512 | yes | 6615 | `0xf68a24da2b1f5785f149114f5891888eeae53a9351d303dd97154aa0d11d4d00` | +0.5232 fUSD |
| 13 | exit: sell all DEGENDW 0.0583 | yes | 7152 | `0x5fcd9a776e7c432bfa742093e5aef48d0a369b2dd9571de9b252f33fbe35b9ba` | +0.5957 fUSD |
| 0 | withdraw 2.5006 fUSD | yes | 10294 | `0x368f2e79ee24f41cec83c3c5e5dd43c34effdb8487d3b3d4a98506946aec6e60` | returned B62F3AFEA6… |
| 15 | exit: sell all DEGENDW 0.0238 | yes | 6754 | `0xfe65751285c9375237f26d8b432b253a5f7347b7f1b05fab0166e787bb4a5b7a` | +0.2428 fUSD |
| 12 | withdraw 2.5633 fUSD | yes | 12824 | `0x5636d4edcfe69bae3a08a2ec9995607df8581445feb65a15fcff628412133882` | returned 616B25BB7B… |
| 3 | exit: sell all DEGENDW 0.0472 | yes | 9597 | `0xd648dfbd3cfc16e1eb3857f389b835d30db801f19a22b2416210ebde59659a38` | +0.4820 fUSD |
| 2 | withdraw 1.8675 fUSD | yes | 10901 | `0x0c985d2aed053bcceec7365118bf3cae419c5a9447e02ac9d21f56af23ab2e4d` | returned B4C1FDC754… |
| 8 | exit: sell all DEGENDW 0.0238 | yes | 12866 | `0xbdf5338886e0b415e6b7a4cb4dcfcbeff2fc190562fab9fdb8bd865e48b50695` | +0.2432 fUSD |
| 11 | exit: sell all DEGENDW 0.1328 | yes | 12660 | `0x8e8ce247de9301e7bdc8a8512e685f8a20c4db571bfde390b4c6bd50474608d4` | +1.3567 fUSD |
| 1 | withdraw 2.3452 fUSD | yes | 13829 | `0x80a31b6984739ce55f6d11020db1a50f6e33cff1ab3f61a5a56b01181207a101` | returned 1F94512B69… |
| 9 | withdraw 2.6189 fUSD | yes | 12031 | `0x59c0b055016913fcfa835c25d865a26fc523daf93eb2c310b20fbc75875855d0` | returned A809FF362E… |
| 6 | withdraw 2.3364 fUSD | yes | 9817 | `0x0a033217f73abb578faa79307e3a5c3a74d5e55c8cda4e92b5433d3aec33dcb6` | returned AE929C502A… |
| 10 | withdraw 0.7427 fUSD | yes | 21119 | `0xa4950d9af9dfe7ab52eb64f04475eb2aa6ce5ba9d892a2f3573fdee53fefbd11` | returned 125D8BB937… |
| 4 | withdraw 3.1476 fUSD | yes | 15262 | `0xffc2c907e7d1746b4e604effb9ab20ac902939d8456ce0467ddaff253761d8ce` | returned 6A07B0646E… |
| 13 | withdraw 3.7279 fUSD | yes | 14695 | `0x1139ecaf8cb973e4da69a1e9e59d9743957e203ef88a32c7d6902afeb7b43c19` | returned B3B755D70C… |
| 14 | withdraw 2.9113 fUSD | yes | 15149 | `0x4d1bfedba5accd4e2d4b13321510c93a4f84b942a70388d4f3f9fa08f51e7e91` | returned 1C8F065C95… |
| 5 | withdraw 2.3923 fUSD | yes | 22071 | `0xb5d1a185a2aa4ede75047eacf7e2995cd4da1523446bffaed3e861f8860b1fa1` | returned 63D00FAADC… |
| 15 | withdraw 3.9635 fUSD | yes | 22132 | `0x489025ec8c43d6c745ca71c83b9d80adc6c4103f59c898fd5b21e1de761f80e4` | returned 1CDA1D3C92… |
| 3 | withdraw 3.9803 fUSD | yes | 25278 | `0x7f5436e4f4e2cba9f006affaf2c872354689c1bbaafef88850b62dd4855118bc` | returned 7BE7368E5A… |
| 7 | withdraw 1.5110 fUSD | yes | 46781 | `0x7141bf650eda09ce8739088ab8062af76585a7e70f008076e726d5f9a17d7bd5` | returned 6C023CD82D… |
| 8 | withdraw 2.2830 fUSD | yes | 42260 | `0xf47251c63b7d422724f3f4b8efad8d3310319dd4adafb6ed0f04457ba55f7772` | returned 3639F51E66… |
| 11 | withdraw 1.7698 fUSD | yes | 46400 | `0x8e706cf3d8bd1402efac1aebeeb65f5a5ac381cb632f1489ba3af1dd7263b3d3` | returned B978395353… |
