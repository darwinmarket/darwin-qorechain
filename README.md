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
| Darwin Blue Chip | BLUEdw (`BLUEDW`) | 50% BTC, 50% ETH | `0x033e85e85853bcf9b580c5613f373eb739bd9c2a` |
| Darwin Balanced | BALdw (`BALDW`) | 35% BTC, 35% ETH, 30% USD | `0x5e8290cfe9ad6487c7336780b0069ecb9b9b92cd` |
| Darwin Qore Ecosystem | QOREdw (`QOREDW`) | 40% QOR, 30% ETH, 30% BTC | `0x16b1463475aa75d80519bc2743d137b507cb2fe0` |

BTC, ETH and USD are held as the Fest test tokens fBTC, fETH and fUSD; QOR as WQOR.

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
| Redeem in kind | nobody | always open: no oracle, curator or admin involved |

Signatures are domain-separated (tag, chain id, contract, nonce, deadline) and the contracts
expose the exact bytes to sign (`roundMessage`, `rebalanceMessage`, `weightsMessage`,
`adminMessage`), so off-chain signers never re-implement the encoding.

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
  prices.ts             BTC/ETH median of 4 spot APIs; QOR from QoreChain's native AMM pools
  oracle.ts             signs and relays a price round
  rebalance.ts          curator: plans drift trades, signs them, relays
  crossvm.ts            trade from the native lane, as QoreX users do
  keeper.ts             one loop: scoped window, oracle heartbeat/deviation, drift rebalances
app/         Next.js 15, React 18, viem: the web app, forked from Darwin's mainnet front
deployments/diana.json  every address, role and seed
```

### Roles on the testnet

| Role | Address | Key |
|---|---|---|
| Admin, guardian, seeder, fee recipient, relayer | `0x20807accBc9693B40a17F2EC73a07e6dc77d3f85` | eth_secp256k1 + ML-DSA-87 (registered) |
| Reporter | `0x6A286f3D805c2bE0d653Ec86c1CaD9598373CB2e` | ML-DSA-87 only signs; never sends a tx |
| Curator | `0xe0BBCcb71b761041B3f3038b3E6cdb392CfbE373` | ML-DSA-87 only signs; never sends a tx |

Oracle `0x26ede83659e3e007f3fe568ee6c6a20df77929e6`, reserve
`0x39a401ae133e80b05c6f7076bc0bc6d5e3df1a23`, router `0x6b4d9220db397d4490ce4acc6ff63e4386a39de3`,
WQOR `0xa140f05ff3fec2d757ae758cddc064e2e386b749` (see `deployments/diana.json`).

### Measured on qorechain-diana

| Operation | Gas |
|---|---|
| Oracle round, 4 prices, one 4,627-byte ML-DSA-87 signature verified by `pqcVerify` | ~257k |
| Rebalance, 2 trades, curator signature verified | ~389k |
| Buy through the router (EVM lane) | ~323k |
| Buy from QoreX (native tx, cross-VM call, hybrid verification included) | ~1.05M |

## Kits and network functions used

- **QoreChain SDK (TypeScript)** `@qorechain/sdk` 0.14 and `@qorechain/evm`: account derivation,
  canonical ML-DSA-87 keys, hybrid signing (`TxClient`, `EthNativeSigner`), `pqcSign`, PQC key
  registration with proof of possession, EVM windows.
- **QoreX integrations** `@qorechain/qorex-wallet-mock`: end-to-end tests with real hybrid signing.
- **Network functions:** ML-DSA-87 hybrid transactions; PQC key registration with proof of
  possession; EVM window, scoped; PQC signature verification in Solidity (`pqcVerify`); PQC key
  status in Solidity (`pqcKeyStatus`); Fest test tokens fUSD, fETH, fBTC and `MsgConvertCoin`;
  cross-VM calls (native to EVM); AMM pools (QOR price).

## Run it

Requirements: Foundry, Node 20+.

```bash
git clone --recursive https://github.com/darwinmarket/darwin-qorechain && cd darwin-qorechain

# contracts: 47 tests, mock precompiles locally
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
node e2e/trade.mjs BLUEdw 2              # connect, buy 2 fUSD of BLUEdw, sell half
```

## Security notes

- Redemption is in kind and unconditional: if the oracle stops, the curator disappears or the admin
  key is lost, holders still take their coins back.
- The oracle refuses a round that moves any price more than 15%, a round that is not the next one,
  a timestamp that is not newer, or one more than 2 minutes in the future. Readers refuse prices
  older than 30 minutes, so a stalled oracle stops buys and sells through the router, never
  redemptions.
- The reserve sells at oracle prices with a 0.30% spread; Darwin's own baskets are spread-exempt
  for rebalances. A rebalance that would cost more than 1% of NAV reverts.
- Audit: see [docs/AUDIT.md](docs/AUDIT.md) (two-stage QCAI audit).
- Testnet only: the tokens have no value and the mnemonic used here must never touch mainnet.

## Credits

- The app's visual shell (hero, basket tiles, chart, treemap, styles) is forked from Darwin's own
  mainnet front (`darwinmarket/darwin-app-mainnet`, same team). Its Miden data layer was replaced:
  everything is read from QoreChain, and trades go through QoreX.
- `@qorechain/sdk`, `@qorechain/evm`, `@qorechain/qorex-wallet-mock` (Apache-2.0, QoreChain
  Association); OpenZeppelin Contracts (MIT); forge-std (MIT/Apache-2.0); viem (MIT); Next.js (MIT).
- How AI was used: [AI_USAGE.md](AI_USAGE.md).

MIT licence.
