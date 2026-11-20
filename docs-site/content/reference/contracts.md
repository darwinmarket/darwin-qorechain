# Deployed Contracts

Network: QoreChain testnet `qorechain-diana`, EVM chain id 9800. Source of truth: `deployments/diana.json`.

## Core (v2 stack)

| Contract | Address |
|---|---|
| DarwinOracle | `0xabe07a51e1974d36970b40d3c1c84da37364685f` |
| DarwinReserve | `0x3a87144e2193db059228f5b982ffb2bdf65bc264` |
| DarwinRouter | `0xf402f3ce6505be9ba382ddf0bc53c27c1bd1d018` |

## Baskets

| Basket | Address |
|---|---|
| BLUEDW | `0xc35a0eb298693a011d26132eb7f4b8aca8112f92` |
| BALDW | `0xfe862c4947626bc9c86bcee12d82153f8286df9a` |
| QOREDW | `0x86514e17c50265c9ea90d2001bd879b6b724e575` |
| DEGENDW | `0x112d76f9bd9e421228f4b326d13e2ea160e92b74` |

## Tokens

| Token | Address | Decimals |
|---|---|---|
| fUSD (fest) | `0x97143B771D34ddb9130b807b135Ae675A5a963CA` | 6 |
| fETH (fest) | `0x02292293c13880a26242690eb70a0e42B8E91c28` | 18 |
| fBTC (fest) | `0x4604e7E45b2ecdbfbDc157103f5B2b62cb16451A` | 8 |
| fQOR (Darwin) | `0x3042be6c87cd1e1b170cfcc44620a84f16a3416d` | 18 |
| fQWAKK (Darwin) | `0xc558289c8c24a9171a549bf329724ad718d61aca` | 6 |
| WQOR | `0xa140f05ff3fec2d757ae758cddc064e2e386b749` | 18 |
| QWAKK (community) | `0xa5b3c3Fb92E2E89555F9909b9004C65F3542eE23` | 6 |

## Testnet accounts

| Address | Role |
|---|---|
| `qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5` | treasury and QoreX test trader |
| `qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p` | deployer, admin, guardian, fee recipient (`0x20807acc...`) |
| `qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs` | oracle reporter (`0x6A286f3D...`) |
| `qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u` | curator (`0xe0BBCcb7...`) |
| `qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf` | trade relayer (`0x08Ac091C...`) |

## Precompiles

| Name | Address |
|---|---|
| `pqcVerify` | `0x0000000000000000000000000000000000000a01` |
| `pqcKeyStatus` | `0x0000000000000000000000000000000000000a02` |
