# Darwin on QoreChain

**Crypto baskets that survive Q-Day.** Buy a whole portfolio as one token. Every price that values
it is signed with ML-DSA-87 and checked on chain by `pqcVerify`, every rebalance needs the curator's
post-quantum signature, and every trade you make from QoreX is hybrid-signed (secp256k1 +
ML-DSA-87). No ECDSA key alone can move a Darwin basket.

Built for **Build Before Q-Day**, the QoreChain Developer Fest, on the `qorechain-diana` testnet.
Category: **Post-Quantum dApp**. Darwin is already live on Miden mainnet at
[app.darwin.market](https://app.darwin.market); this is its post-quantum port, written during the
fest.

| Basket | Ticker | Composition | Address (EVM 9800) |
|---|---|---|---|
| Darwin Blue Chip | BLUEdw (`BLUEDW`) | 70% BTC, 30% ETH | `0x033e85e85853bcf9b580c5613f373eb739bd9c2a` |
| Darwin Balanced | BALdw (`BALDW`) | 35% BTC, 35% ETH, 30% USD | `0x5e8290cfe9ad6487c7336780b0069ecb9b9b92cd` |
| Darwin Qore Ecosystem | QOREdw (`QOREDW`) | 60% QOR, 25% ETH, 15% QWAKK | `0x2a78aedc518aadbd99f2f206d82c1cfd2863f961` (v4; earlier versions in `basketHistory`) |
| Darwin Degen | DEGENdw (`DEGENDW`) | 70% QWAKK, 30% QOR | `0x77cf407ef0ded53ff39d0eb83e1ece1049d733a6` (v2) |

BTC, ETH and USD are held as the Fest test tokens fBTC, fETH and fUSD; QOR as WQOR; QOR is priced at
its market price (CoinGecko and MEXC); QWAKK is QoreChain's community memecoin, bought on the
native AMM and priced from its only market, the QWAKK/QOR pool, times QOR's price.

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

Oracle `0x26ede83659e3e007f3fe568ee6c6a20df77929e6`, reserve
`0x39a401ae133e80b05c6f7076bc0bc6d5e3df1a23`, router v2 `0x9a3ec4cc1163ee8fdce4049944178da6d74972c9`
(v1 `0x6b4d…9de3` retired),
WQOR `0xa140f05ff3fec2d757ae758cddc064e2e386b749` (see `deployments/diana.json`).

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

# contracts: 81 unit, fuzz and invariant tests, mock precompiles locally
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
npm run e2e                              # the full browser suite (24 checks)
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
  for rebalances. A rebalance that would cost more than 1% of NAV reverts.
- Audit: see [docs/AUDIT.md](docs/AUDIT.md) (two-stage QCAI audit, and where each `pqcVerify` /
  `pqcKeyStatus` call sits and which tests cover it).
- Cryptographic inventory: [docs/cbom](docs/cbom) (QoreScan CBOM; QoreChain's endpoints already
  negotiate the hybrid post-quantum key exchange X25519MLKEM768).
- Tests: 81 unit, fuzz and invariant tests; on-chain E2E (23/23); an 8-user parallel battery
  (48/48 trades); browser E2E (24/24); see [docs/TESTING.md](docs/TESTING.md).
- Testnet only: the tokens have no value and the mnemonic used here must never touch mainnet.

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
