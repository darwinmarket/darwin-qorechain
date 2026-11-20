# Darwin on QoreChain

**Crypto baskets that survive Q-Day.** Buy a whole portfolio as one token. Every price that values
it is signed with ML-DSA-87 and checked on chain by `pqcVerify`, every rebalance needs the curator's
post-quantum signature, and every trade you make from QoreX is hybrid-signed (secp256k1 +
ML-DSA-87). No ECDSA key alone can change a price, a weight, a trade or a parameter, or move
the reserve's funds (what one still can do is listed under [Known limitations](#known-limitations)).

Built for **Build Before Q-Day**, the QoreChain Developer Fest, on the `qorechain-diana` testnet.
Category: **Post-Quantum dApp**. Darwin is already live on Miden mainnet at
[app.darwin.market](https://app.darwin.market); this is its post-quantum port, written during the
fest.

| Basket | Ticker | Composition | Address (EVM 9800) |
|---|---|---|---|
| Darwin Blue Chip | BLUEdw (`BLUEDW`) | 70% BTC, 30% ETH | `0xc35a0eb298693a011d26132eb7f4b8aca8112f92` |
| Darwin Balanced | BALdw (`BALDW`) | 35% BTC, 35% ETH, 30% USD | `0xfe862c4947626bc9c86bcee12d82153f8286df9a` |
| Darwin Qore Ecosystem | QOREdw (`QOREDW`) | 60% QOR, 25% ETH, 15% QWAKK | `0x86514e17c50265c9ea90d2001bd879b6b724e575` |
| Darwin Degen | DEGENdw (`DEGENDW`) | 70% QWAKK, 30% QOR | `0x112d76f9bd9e421228f4b326d13e2ea160e92b74` |

These are the **v2 stack** (2026-11-20), deployed on the contracts fixed by our review (see
[Known limitations](#known-limitations)); every seed was minted to `0x…dEaD`. Earlier versions are
listed in `deployments/diana.json` (`stackHistory`, `basketHistory`, `routerHistory`): their
minting is paused and their holders can always redeem in kind.

BTC, ETH and USD are held as the Fest test tokens fBTC, fETH and fUSD. QOR and QWAKK are held as
**fQOR and fQWAKK**, Darwin's stand-ins in the same spirit (`0x3042be6c…16d`, `0xc558289c…aca`),
minted only by the admin's ML-DSA-87 signature and priced by the real feeds: QOR at its market
price (CoinGecko and MEXC), QWAKK, QoreChain's community memecoin, from its only market, the
QWAKK/QOR pool of the native AMM, times QOR's price.

**We first held the real ones.** The reserve bought ~19,750 QOR and 5M QWAKK on QoreChain's native
AMM (hybrid-signed swaps, under the AMM's 5% price-impact cap): that capped Qore Ecosystem at ~$66
a buy and Degen at ~$36, because a faucet claim is worth $0.33 at QOR's market price and QWAKK's
whole market about $330. So the QOR baskets moved to the stand-ins, the real QOR and QWAKK went back
to the public pools, and the native wiring stays (the AMM tools in `ops/`, QWAKK's price from pool
6). Capacity today: Blue Chip ~$22,000, Balanced ~$32,000, Qore Ecosystem ~$45,000 (bounded by its
25% fETH, a faucet token), Degen ~$385,000. Details: [docs/PRICING.md](docs/PRICING.md#capacity-and-why-the-qor-baskets-hold-fqor-and-fqwakk).

## Why it matters

A basket protocol has three keys worth stealing: the one that sets prices, the one that trades the
vault, and the one that administers it. On Q-Day a quantum computer derives a secp256k1 private key
from its public key. Darwin puts all three behind ML-DSA-87 (FIPS 204), verified by QoreChain's
precompiles against keys registered on chain:

| Action | Authorised by | Checked by |
|---|---|---|
| Oracle price round | reporter's ML-DSA-87 key | `DarwinOracle.submit` → `pqcVerify` (`0x…0A01`) against `pqcKeyStatus` (`0x…0A02`) |
| Rebalance (exact trades) | curator's ML-DSA-87 key | `DarwinBasket.rebalance`, plus a max NAV loss of 1% |
| Target weights | curator's ML-DSA-87 key | `DarwinBasket.setTargetWeights` |
| Every admin action | admin's ML-DSA-87 key | `PqcAdmin`: no function checks `msg.sender` for admin powers |
| User buy and sell | the user's QoreX keys, hybrid | the chain's hybrid ante check, then `MsgCrossVMCall` into the router |
| Keeper relaying | scoped EVM window | `allowed_targets` = Darwin's contracts and tokens only |
| Pause new mints | guardian (classical key) | the only classical power, and it can never cost a holder anything |
| Sell the basket token for fUSD | the user's QoreX keys, hybrid | always open, even when buying is paused |

Signatures are domain-separated (tag, chain id, contract, nonce, deadline) and the contracts
expose the exact bytes to sign (`roundMessage`, `rebalanceMessage`, `weightsMessage`,
`adminMessage`), so off-chain signers never re-implement the encoding.

**Don't trust the chain's word, check it in your browser.** Every transaction page in the app
re-verifies the signatures itself: a trade's hybrid signature with QoreSign
(`@qorechain/qoresign`, both the ML-DSA-87 layer and secp256k1, against the keys the signer
registered), and an oracle round by rebuilding `roundMessage` from the calldata and verifying the
reporter's 4,627-byte ML-DSA-87 signature with `@qorechain/pqc`, then checking that the same
signature fails for the next round number.

## How a trade works

```
QoreX (secp256k1 + ML-DSA-87)
  └─ one native tx, up to 3 messages:
       MsgConvertCoin        faucet fUSD (bank form) -> ERC-20 on the user's 0x twin, if needed
       MsgCrossVMCall(fUSD)  approve the router, if needed
       MsgCrossVMCall(router) buy(basket, fUSD, minShares, you)
                               └─ DarwinRouter: fee 0.30%, buys each component from the
                                  DarwinReserve at oracle prices, mints the shares, refunds the rest
```

QoreX cannot sign EVM transactions yet, but it signs native ones hybrid. Darwin uses that:
the trade reaches the EVM through a native cross-VM call, so the user never opens an EVM window
and every trade carries the user's post-quantum signature. The chain emits
`pqc_hybrid_verify status=verified` for each one, and the app's activity feed shows it.

## Architecture

```
contracts/   Solidity 0.8.28, Foundry, OpenZeppelin 5.4
  pqc/PqcAuth.sol       ML-DSA-87 check against the on-chain key registry
  pqc/PqcAdmin.sol      admin powers usable only with a post-quantum signature
  DarwinOracle.sol      price rounds signed by the reporter, circuit breaker, staleness
  DarwinReserve.sol     oracle-priced inventory market maker (the EVM cannot call the native AMM)
  DarwinBasket.sol      ERC-20 share, in-kind mint/redeem, NAV, curator-signed rebalances
  DarwinRouter.sol      buy or sell a whole basket with fUSD in one call
  WQOR.sol              wrapped QOR, so native QOR can sit in a basket
ops/         TypeScript, @qorechain/sdk 0.14, viem
  accounts.ts           treasury (coin 118) + deployer/reporter/curator (coin 60) from one mnemonic
  nativeClient.ts       hybrid-signed native txs (TxClient + EthNativeSigner)
  window.ts             PQC key registration (proof of possession) and scoped EVM windows
  deploy.ts             idempotent deployment and seeding, recorded in deployments/diana.json
  prices.ts             BTC/ETH median of 4 spot APIs; QOR from CoinGecko + MEXC; QWAKK from its AMM pool
  oracle.ts             signs and relays a price round
  rebalance.ts          curator: plans drift trades, signs them, relays
  amm.ts, refill.ts     buy on the native AMM (QWAKK), refill the reserve
  crossvm.ts            trade from the native lane, as QoreX users do
  keeper.ts             one loop: scoped window, oracle heartbeat (10 min or a 0.25% move),
                        the weekly rebalance (Mondays 12:00 UTC, curator-signed)
app/         Next.js 15, React 18, viem: Darwin's mainnet front (same frame, navbar, home, basket
             screen and trade card) on QoreChain, with QoreX; tabs Baskets, Portfolio, Activity, Security
deployments/diana.json  every address, role and seed
```

### Roles on the testnet

| Role | Address | Key |
|---|---|---|
| Admin, guardian, seeder, fee recipient, relayer | `0x20807accBc9693B40a17F2EC73a07e6dc77d3f85` | eth_secp256k1 + ML-DSA-87 (registered) |
| Reporter | `0x6A286f3D805c2bE0d653Ec86c1CaD9598373CB2e` | ML-DSA-87 only signs; never sends a tx |
| Curator | `0xe0BBCcb71b761041B3f3038b3E6cdb392CfbE373` | ML-DSA-87 only signs; never sends a tx |

Oracle `0xabe07a51e1974d36970b40d3c1c84da37364685f`, reserve
`0x3a87144e2193db059228f5b982ffb2bdf65bc264`, router `0xf402f3ce6505be9ba382ddf0bc53c27c1bd1d018`,
WQOR `0xa140f05ff3fec2d757ae758cddc064e2e386b749` (v2 stack; see `deployments/diana.json`).

Each EVM window also caps the **value** it admits (0.75 QOR per allowed transaction): a stolen
secp256k1 key cannot drain more QOR through the EVM than the window allows, and opening a new one
needs the account's ML-DSA-87 signature. We hit it ourselves funding the reserve, and had to wrap
QOR in pieces.

### Measured on qorechain-diana

| Operation | Gas |
|---|---|
| Oracle round, 4 prices, one 4,627-byte ML-DSA-87 signature verified by `pqcVerify` | ~257k |
| Rebalance, 2 trades, curator signature verified | ~389k |
| Buy through the router (EVM lane) | ~323k |
| Buy from QoreX (native tx, cross-VM call, hybrid verification included) | ~1.05M |

## Kits and network functions used

Each kit does a real job in Darwin:

| Kit | Where | What it does for Darwin |
|---|---|---|
| QoreChain SDK (TS) `@qorechain/sdk`, `@qorechain/evm` | `ops/` | account derivation, canonical ML-DSA-87 keys, hybrid signing (`TxClient`, `EthNativeSigner`), `pqcSign`, PQC key registration with proof of possession, EVM windows |
| QoreSign `@qorechain/qoresign` | `app/src/lib/qore/verify.ts` | re-checks a trade's committed hybrid signature in the browser (`inspectTransaction`), reads registered keys (`fetchPqKeyStatus`) |
| qorechain-pqc `@qorechain/pqc` | `app/src/lib/qore/verify.ts` | verifies the oracle reporter's ML-DSA-87 signature in the browser, plus a tamper check |
| QoreChain React `@qorechain/react` | account menu | `PqcStatusBadge`: is the connected account's ML-DSA-87 key registered |
| Wallet adapter `@qorechain/wallet-adapter` | `app/src/lib/qore/qorex.ts` | QoreX capability check, request validation, `qorexSignAndBroadcast`, `isQorexRejection` |
| QoreX integrations `@qorechain/qorex-wallet-mock` | `app/e2e/` | browser end-to-end tests with real hybrid signing and broadcast |
| MCP + qore CLI `@qorechain/qore-cli`, `@qorechain/mcp` | `ops/src/e2e.ts`, `.mcp.json` | a second opinion in the on-chain suite (tier, layer, proof of possession); AI agents read Darwin's deployment through MCP |
| QoreScan `@qorechain/qorescan` | `docs/cbom/`, `npm run cbom` | Darwin's CycloneDX 1.6 CBOM, a DORA mapping and a crypto-agility template |

**Network functions:** ML-DSA-87 hybrid transactions (every user trade); PQC key registration
with proof of possession (every role); EVM window, scoped (the keeper's `allowed_targets`); PQC
signature verification in Solidity (`pqcVerify`); PQC key status in Solidity (`pqcKeyStatus`);
Fest test tokens fUSD, fETH, fBTC with `MsgConvertCoin`/`MsgConvertERC20`; cross-VM calls (native
to EVM, `MsgCrossVMCall`); AMM pools (QWAKK bought on the native AMM, QWAKK's price replayed from
its pool); MCP server and qore CLI; QoreScan.

### Testnet addresses

| Address | Role |
|---|---|
| `qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5` | treasury and test trader (QoreX, coin 118): hybrid-signed cross-VM trades |
| `qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p` | deployer, admin, relayer (`0x20807acc…`): scoped EVM window, ML-DSA-87 admin signatures |
| `qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs` | oracle reporter (`0x6A286f3D…`): signs every price round |
| `qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u` | curator (`0xe0BBCcb7…`): signs weights and rebalances |

### Pricing and rebalancing

BTC and ETH are the median of four spot APIs; QOR is its market price (CoinGecko and MEXC);
QWAKK's price in QOR comes from its only market, pool 6 of the native AMM. The charts replay the
same sources, QWAKK swap by swap since its pool opened. Details and the repricing of round 60:
[docs/PRICING.md](docs/PRICING.md).

Baskets rebalance once a week, **Mondays at 12:00 UTC**, with trades the curator signs with
ML-DSA-87; there is no drift-triggered rebalance in between.

## Run it

Requirements: Foundry, Node 20+.

```bash
git clone --recursive https://github.com/darwinmarket/darwin-qorechain && cd darwin-qorechain

# contracts: 94 unit, fuzz and invariant tests, mock precompiles locally
cd contracts && forge test && cd ..

# app, against the live testnet deployment
cd app && npm install && npm run dev        # http://localhost:3032
```

To trade, install QoreX, take test QOR and fUSD from the
[faucet](https://dashboard.qorechain.io/faucet), open a basket and buy. QoreX shows one approval.

Operating your own deployment (testnet-only mnemonic in `QORE_MNEMONIC` or
`~/.config/qorechain/testnet.mnemonic`, never committed):

```bash
cd ops && npm install
npm run status                       # keys, windows, balances of every role
npm run fund -- qor 60 2 2           # treasury -> deployer, reporter, curator (hybrid-signed)
npm run fund -- tokens               # faucet fUSD/fETH/fBTC -> ERC-20 on the deployer
npm run window -- register all       # ML-DSA-87 keys, with proof of possession
npm run window -- open deployer      # an EVM window for the deployment
(cd ../contracts && forge build) && npm run deploy
npm run keeper                       # oracle rounds, rebalances, scoped window upkeep
npm run trade -- buy BLUEDW 5        # or: tsx src/crossvm.ts buy BLUEDW 5 (native, hybrid)
npm run rebalance -- plan BALDW
```

End-to-end in a browser, with real hybrid signing by the QoreX test double:

```bash
cd app && npm run build && npm start &   # port 3032
npm run e2e                              # the full browser suite (25 checks)
ONLY="buy BLUEdw|declined" npm run e2e   # a subset: each trade costs testnet QOR in fees
node e2e/trade.mjs BLUEdw 2              # one trade: connect, buy 2 fUSD of BLUEdw, sell half
```

## Security notes

- Users only ever hold fUSD and basket tokens: the vault holds the coins, and the way out is
  selling the basket token for fUSD through the router. As a last-resort backstop the basket
  contract also keeps an in-kind `redeem` that needs no oracle, curator or admin; the app never
  exposes it.
- The oracle refuses a round that moves any price more than 15%, a round that is not the next one,
  a timestamp that is not newer, or one more than 2 minutes in the future. Readers refuse prices
  older than 30 minutes, so a stalled oracle stops buys and sells through the router, never
  redemptions.
- The reserve's inventory is managed by the team (`ops/src/refill.ts` wraps QOR or sends tokens,
  `ops/src/amm.ts` buys on QoreChain's native AMM); the app refuses buys above what it holds.
- The reserve sells at oracle prices with a 0.30% spread; Darwin's own baskets are spread-exempt
  for rebalances. A rebalance that would lose more than 1% of NAV at oracle prices reverts (it
  bounds the curator against the oracle, not execution against the wider market).
- Audit: see [docs/AUDIT.md](docs/AUDIT.md) (the two-stage QCAI audit, to be run by the team on
  the dashboard, and where each `pqcVerify` /
  `pqcKeyStatus` call sits and which tests cover it).
- Cryptographic inventory: [docs/cbom](docs/cbom) (QoreScan CBOM; QoreChain's endpoints already
  negotiate the hybrid post-quantum key exchange X25519MLKEM768).
- Tests, on the v2 stack: 94 unit, fuzz and invariant tests; on-chain E2E 26/26
  (`docs/e2e/2026-11-20T1334.md`); an 8-user parallel battery, 32/32 trades with a verified hybrid
  signature (`battery-2026-11-20T1335.md`); browser E2E 25/25 (`browser-2026-11-20T133727.md`); see
  [docs/TESTING.md](docs/TESTING.md).
- Testnet only: the tokens have no value and the mnemonic used here must never touch mainnet.

## Known limitations

Found by our own review on 2026-11-20 (an independent read of the repo, as a juror would), fixed,
tested, and live on the v2 stack the same day:

| Limitation | Status |
|---|---|
| Duplicate feed ids in one round could chain the 15% breaker; rounds could follow each other within seconds | **fixed and live (v2)**: ids strictly increasing, rounds at least 60 s apart (`test_aFeedAppearsOnceARound`, `test_roundsAreAtLeastAMinuteApart`; on chain: `FeedsNotSorted`, `TooSoon`) |
| `PqcAuth` assumed the registered key is ML-DSA-87 | **fixed and live (v2)**: algorithm id 1 enforced (`test_aKeyOfAnotherAlgorithmIsRefused`) |
| A basket emptied by redemptions could be re-seeded by the classical seeder key | **fixed and live (v2)**: one-shot seed (`test_aBasketIsSeededOnceEvenIfEmptiedLater`) |
| The oracle address was fixed in the reserve and baskets | **fixed and live (v2)**: `setOracle`, ML-DSA-87 admin only |
| The seed shares sat on the deployer, whose secp256k1 key relays through the keeper's EVM window: a stolen key could sell them | **fixed and live (v2)**: every seed minted to `0x…dEaD`, checked by the on-chain suite |
| QWAKK's only market is a thin pool, whose spot could be pumped | **fixed**: the oracle uses the pool's 30-minute median; QOR needs two of three quotes, else QOR and QWAKK sit out the round |
| The reserve trades at the oracle price with a 0.30% spread, which arbitrage can farm around updates | accepted on testnet; a staleness-dependent spread is the mainnet answer |
| The QOR baskets were bounded by the real QOR and QWAKK on the testnet (QWAKK's whole market is about $330): ~$66 and ~$36 a buy | **moved to fQOR/fQWAKK** (same feeds, ML-DSA-87 minting); the real assets went back to the public pools ([PRICING](docs/PRICING.md#capacity-and-why-the-qor-baskets-hold-fqor-and-fqwakk)) |

## Credits

- The app's visual shell (hero, basket tiles, chart, treemap, styles) is forked from Darwin's own
  mainnet front (`darwinmarket/darwin-app-mainnet`, same team). Its Miden data layer was replaced:
  everything is read from QoreChain, and trades go through QoreX.
- QoreChain kits (Apache-2.0, QoreChain Association): `@qorechain/sdk`, `@qorechain/evm`,
  `@qorechain/qoresign`, `@qorechain/pqc` (built on `@noble/post-quantum`, MIT),
  `@qorechain/react`, `@qorechain/wallet-adapter`, `@qorechain/qorex-wallet-mock`,
  `@qorechain/qore-cli`, `@qorechain/mcp`, `@qorechain/qorescan`.
- OpenZeppelin Contracts (MIT); forge-std (MIT/Apache-2.0); viem (MIT); Next.js and React (MIT);
  TanStack Query (MIT); Playwright (Apache-2.0); `@cosmjs/stargate` (Apache-2.0).
- Market data: CoinGecko and MEXC (QOR), Yahoo Finance and four spot APIs (BTC, ETH).
- Logos: QOR from the QoreChain brand pack; QWAKK's mark is relayed from qwakk.fun at runtime and
  not redistributed in this repository.
- How AI was used: [AI_USAGE.md](AI_USAGE.md).

MIT licence.
