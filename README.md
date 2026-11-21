# Darwin on QoreChain

**Crypto baskets that survive Q-Day.** Buy a whole portfolio as one token. Every price that values
it is signed with ML-DSA-87 and checked on chain by `pqcVerify`, every rebalance needs the curator's
post-quantum signature, and every trade you make from QoreX is hybrid-signed (secp256k1 +
ML-DSA-87) and checked on chain by your own Darwin account, which obeys your ML-DSA-87 key only.
Every transaction Darwin itself sends (price rounds, rebalances, trade executions) is also
hybrid-signed and verified by the chain, and none of Darwin's accounts holds an EVM window, so the
chain refuses an ECDSA-only transaction from them. No ECDSA key alone can change a price, a
weight, a trade or a parameter, pause a basket, or move the reserve's funds (what remains is
listed under [Known limitations](#known-limitations)).

Built for **Build Before Q-Day**, the QoreChain Developer Fest, on the `qorechain-diana` testnet.
Category: **Post-Quantum dApp**. Darwin is already live on Miden mainnet at
[app.darwin.market](https://app.darwin.market); this is its post-quantum port, written during the
fest.

**Live:** the app at **[darwin.market/qorechain](https://darwin.market/qorechain)** (QoreX, testnet)
and its documentation at **[docs.darwin.market/qorechain](https://docs.darwin.market/qorechain)**.

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
| User buy, sell and withdraw | the user's ML-DSA-87 + secp256k1 signed text (QoreX `signArbitrary`) | the relayer's QoreSign check of both halves, then the user's `DarwinAccount`: `pqcVerify` against the user's key, single-use nonce, Darwin's contracts only |
| Accounts' allowed targets | admin's ML-DSA-87 key | `DarwinAccountFactory.setTarget` (`PqcAdmin`) |
| Every Darwin transaction (keeper, relayers) | hybrid secp256k1 + ML-DSA-87 | the chain (`pqc_hybrid_verify status=verified`); a `MsgCrossVMCall`, no EVM window open |
| Pause new mints | guardian, hybrid-signed | checked by `msg.sender`, the only such power; it can never cost a holder anything |
| Sell the basket token for fUSD | the user's QoreX keys, hybrid | always open, even when buying is paused |

Signatures are domain-separated (tag, chain id, contract, nonce, deadline) and the contracts
expose the exact bytes to sign (`roundMessage`, `rebalanceMessage`, `weightsMessage`,
`adminMessage`), so off-chain signers never re-implement the encoding.

**Don't trust the chain's word, check it in your browser.** Every transaction page in the app
re-verifies the signatures itself with `@qorechain/pqc`: a trade by rebuilding the exact text
its owner signed (from the calldata and the account's nonce in the `Executed` event) and verifying
the owner's ML-DSA-87 signature, then checking that the same signature fails for nonce + 1; an
oracle round by rebuilding `roundMessage` from the calldata and verifying the reporter's 4,627-byte
ML-DSA-87 signature, then checking that it fails for the next round number ("Round #72 signature
verified · rejected for round #73"). Hybrid transaction
signatures are re-checked with QoreSign (`@qorechain/qoresign`, both layers, against the keys the
signer registered).

**Every transaction Darwin sends is hybrid-signed.** The keeper (rounds, rebalances) and the
relayers (account executions) call Darwin's contracts with `MsgCrossVMCall` (`qorechain.crossvm.v1`)
from their own accounts, signed secp256k1 + ML-DSA-87 and verified by the chain
(`pqc_hybrid_verify status=verified`); the QoreChain explorer shows each one "quantum-safe ·
verified on-chain" (ML-DSA-87, FIPS 204, NIST category 5). Code: `writeNative` in
`app/src/server/chain.ts`, `write()` in `ops/src/evm.ts`. Each call is simulated first (an
`eth_estimateGas` from the role's 0x address), so a refusal is named before anything is sent. A
cross-VM call meters the EVM work at about 2.5x its EVM gas: the gas limit is max(1.2M, 2.8 x
estimate + 400k), retried at x1.6 when out of gas. No Darwin account holds an EVM window, and the
chain refuses an ECDSA-only EVM transaction from them ("account … has no open EVM authorisation
window; open one with MsgOpenEVMWindow, signed on the Cosmos lane with the account's post-quantum
key"). Only a call carrying QOR value and a contract creation still need an EVM transaction (a
cross-VM call can do neither); they are used at deployment only, and none happened since the
switch (2026-11-21).

Native calls leave no EVM logs, so each carries a memo: `darwin round <n>`, `darwin rebalance
<basket> <nonce>`, `darwin execute <account> <nonce>`. The Security tab, the oracle history (the
charts) and the transaction page decode the `submit` calldata from the committed transaction
(`app/src/lib/qore/nativeCalls.ts`) and take the round number from the memo, never trusted alone:
the browser re-verifies the reporter's signature for that number. Older EVM-lane rounds and trades
are still read from logs.

## How a trade works

QoreX signs only what it can show its user decoded. We tested it message by message
(`/debug/qorex` in the app): it signs bank sends, authz grants, CosmWasm calls and plain text
(`signArbitrary`), and refuses `MsgCrossVMCall` and the ERC-20 conversions (`MsgConvertCoin`,
`MsgConvertERC20`). It cannot send EVM transactions either. So each QoreX user trades through a
**DarwinAccount** (`contracts/src/account/`), a contract controlled only by the ML-DSA-87 key the
user registered on QoreChain.

```
the account
  address fixed by CREATE2 from the owner      known before it exists; created with the first action
  DarwinAccountFactory.create                  refuses an owner without a registered, proven
                                               ML-DSA-87 key (PqcAuth.isQuantumSafe)
  allowed targets                              router, the 4 baskets, fUSD; changed only by the
                                               admin's ML-DSA-87 signature (setTarget, PqcAdmin)

deposit, when a buy needs more fUSD than the account holds
  QoreX: MsgSend of fUSD to the relayer         hybrid; faucet fUSD is a bank coin (erc20:0x97143B…)
  relayer (app/src/server/accounts.ts)         checks that tx (sender, recipient, denom, amount),
                                               MsgConvertCoin of exactly that amount, receiver =
                                               the account; memo "darwin deposit <txhash>", so
                                               it is credited once

each trade
  QoreX signArbitrary: plain text              <summary>
                                               Darwin account <account>  nonce <n>
                                               valid until <deadline>  calls <keccak256(abi.encode(calls))>
                                               ML-DSA-87 half over "qorechain-msg-v1|qorechain-diana|" + text
  relayer                                      QoreSign verifyMessageWithChain, both halves, against
                                               the user's on-chain keys; the calls are a trade paying
                                               the account (optional router approvals) or an fUSD
                                               withdrawal; then, paying the gas:
    factory.execute(owner, calls, summary, deadline, pqSignature)
      DarwinAccount                            rebuilds the text, pqcVerify (0x0A01) against the key
                                               from pqcKeyStatus (0x0A02), nonce++, targets checked
      └─ DarwinRouter: fee 0.30%, buys each component from the DarwinReserve at oracle prices,
         mints the shares to the account

withdraw (Portfolio, Cash row: "Withdraw X fUSD to QoreX")
  one signed message: the account transfers fUSD to the relayer, which returns it to the user's
  QoreX wallet in bank form (MsgConvertERC20, receiver = the user; memo "darwin withdraw <evm hash>")
```

No EVM window, no authz grant and no gas for the user's trades: the first buy is a deposit approval
plus one signature, later buys one signature. The relayer cannot change a call (the signature fails
on chain) nor replay one (the nonce). It submits the message as a `MsgCrossVMCall` it hybrid-signs (secp256k1 + ML-DSA-87): the transaction itself is post-quantum, and needs no EVM window, so the QoreChain explorer shows every trade as quantum-safe. Trades are
non-custodial; deposits and withdrawals pass through the relayer for one transaction each way, a
custody of seconds. If a serverless call is cut between the two steps of a withdrawal,
`settleWithdrawals()` completes it before the next withdrawal and in the daily cron (tested on chain
with a withdrawal cut halfway). The transaction page shows "Signed by" with the owner and the signed
summary, and re-verifies the owner's ML-DSA-87 signature in the browser. Activity reads account
trades from the relayers' cross-VM calls to the factory. Details: [docs.darwin.market/qorechain/chain/accounts](https://docs.darwin.market/qorechain/chain/accounts).

**Shares bought before DarwinAccounts** sit on the user's EVM twin, and selling them keeps the
original path (`app/src/server/relayer.ts`, `app/src/lib/qore/relay.ts`): the user opens an EVM
access window in QoreX (at most 17,280 blocks, ~7 h), signs a 24-hour `MsgGrant` to the relayer,
then each trade is a JSON intent signed with `signArbitrary`, executed by the relayer through authz
`MsgExec` and admitted only by the user's own window.

**Found while building:** an EVM window can be opened for at most 17,280 blocks (~7 h at 1.43 s
blocks); `MsgConvertCoin`/`MsgConvertERC20` sent by the relayer need ~2M gas (below it the chain
reports a misleading "failed to retrieve balance: EVM call unexpected error"); `MsgConvertERC20`'s
`sender` must be bech32 (`qor1…`), not `0x`; `closeEvmWindowMsg` takes the sender's address
string, not `{ sender }` (our `window.ts` passed an object, so every close failed with "invalid
sender: decoding bech32 failed"; fixed).

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
  account/              DarwinAccount, DarwinAccountFactory: each QoreX user's account,
                        controlled only by the user's ML-DSA-87 key
ops/         TypeScript, @qorechain/sdk 0.14, viem
  accounts.ts           treasury (coin 118) + deployer/reporter/curator (coin 60) from one mnemonic
  nativeClient.ts       hybrid-signed native txs (TxClient + EthNativeSigner)
  window.ts             PQC key registration (proof of possession); opens and closes EVM windows
                        (deployment only: no Darwin account holds one)
  evm.ts                contract reads and writes; write() sends a hybrid MsgCrossVMCall
  deploy.ts             idempotent deployment and seeding, recorded in deployments/diana.json
  prices.ts             BTC/ETH median of 4 spot APIs; QOR from CoinGecko + MEXC; QWAKK from its AMM pool
  oracle.ts             signs and relays a price round
  rebalance.ts          curator: plans drift trades, signs them, relays
  amm.ts, refill.ts     buy on the native AMM (QWAKK), refill the reserve
  crossvm.ts            trade from the native lane with the SDK (the keeper and tests)
  relayer.ts            the original relayer: signed intents through authz grants (shares bought
                        before DarwinAccounts)
  relay-setup.ts        a test account's one-time setup for that path (EVM window, grants)
  deploy-accounts.ts    deploys DarwinAccountFactory
  account-check.ts      the account path end to end on the testnet, through the app's API
  pq-audit.ts           every transaction of the deployer and the 4 relayers since a date must
                        carry a verified hybrid signature
  keeper.ts             the always-on keeper for local runs: oracle heartbeat, the weekly
                        rebalance (in production these run on demand, see below); every call
                        hybrid-signed, no EVM window
app/         Next.js 15, React 18, viem: Darwin's mainnet front (same frame, navbar, home, basket
             screen and trade card) on QoreChain, with QoreX; tabs Baskets, Portfolio, Activity, Security
  src/server/accounts.ts  the relayer for DarwinAccounts: deposits, signed trades, withdrawals
  src/server/keeper.ts    rounds and rebalances, sent with writeNative (src/server/chain.ts)
  src/lib/qore/nativeCalls.ts  decodes native calls (calldata, memo) for readers: no EVM logs
  src/server/relayer.ts   the original relayer (intents through authz), for older holdings
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
WQOR `0xa140f05ff3fec2d757ae758cddc064e2e386b749` (v2 stack), DarwinAccountFactory
`0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12` (`accountFactory`; see `deployments/diana.json`).

No role holds an EVM window: the chain refuses an ECDSA-only EVM transaction from any of Darwin's
accounts, and opening a window needs the account's ML-DSA-87 signature. During deployment a window
was opened when needed; each caps the **value** it admits (0.75 QOR per allowed transaction). We
hit that cap ourselves funding the reserve, and had to wrap QOR in pieces.

### Measured on qorechain-diana

| Operation | Gas |
|---|---|
| Oracle round, 4 prices, one 4,627-byte ML-DSA-87 signature verified by `pqcVerify` | ~257k |
| Rebalance, 2 trades, curator signature verified | ~389k |
| Buy through the router (EVM lane) | ~323k |
| Buy from QoreX before DarwinAccounts (native tx, cross-VM call, hybrid verification included) | ~1.05M |

These are EVM gas figures. Sent as a cross-VM call, as Darwin now sends every transaction, the
same work is metered at about 2.5x.

## Kits and network functions used

Each kit does a real job in Darwin:

| Kit | Where | What it does for Darwin |
|---|---|---|
| QoreChain SDK (TS) `@qorechain/sdk`, `@qorechain/evm` | `ops/` | account derivation, canonical ML-DSA-87 keys, hybrid signing (`TxClient`, `EthNativeSigner`), `pqcSign`, PQC key registration with proof of possession, EVM windows |
| QoreSign `@qorechain/qoresign` | `app/src/server/accounts.ts`, `app/src/server/relayer.ts`, `app/src/lib/qore/verify.ts` | verifies both halves of every signed trade or withdrawal against the user's on-chain keys (`verifyMessageWithChain`) before the relayer spends gas; re-checks a committed hybrid signature in the browser (`inspectTransaction`); reads EVM windows and keys |
| qorechain-pqc `@qorechain/pqc` | `app/src/lib/qore/verify.ts` | verifies in the browser the owner's ML-DSA-87 signature of every account trade (rebuilt from calldata and nonce) and the oracle reporter's signature of every round, each with a tamper check (next nonce, next round) |
| QoreChain React `@qorechain/react` | account menu | `PqcStatusBadge`: is the connected account's ML-DSA-87 key registered |
| Wallet adapter `@qorechain/wallet-adapter` | `app/src/lib/qore/qorex.ts` | QoreX capability check, request validation, `qorexSignAndBroadcast`, `isQorexRejection` |
| QoreX integrations `@qorechain/qorex-wallet-mock` | `app/e2e/` | browser end-to-end tests with real hybrid signing and broadcast |
| MCP + qore CLI `@qorechain/qore-cli`, `@qorechain/mcp` | `ops/src/e2e.ts`, `.mcp.json` | a second opinion in the on-chain suite (tier, layer, proof of possession); AI agents read Darwin's deployment through MCP |
| QoreScan `@qorechain/qorescan` | `docs/cbom/`, `npm run cbom` | Darwin's CycloneDX 1.6 CBOM, a DORA mapping and a crypto-agility template |

**Network functions:** ML-DSA-87 hybrid transactions (every transaction, the users' fUSD
deposits and the relayer's conversions included); ML-DSA-87 message signatures (every trade and
withdrawal, QoreX `signArbitrary`, verified on chain by the user's DarwinAccount); PQC key
registration with proof of possession (every role; a DarwinAccount only for a proven key); EVM
windows: none open, every Darwin transaction is hybrid (the chain refuses an ECDSA-only one from
Darwin's accounts; windows were used during deployment only); authz
grants with expiry (only for selling shares bought before DarwinAccounts); PQC signature
verification in Solidity (`pqcVerify`: oracle, baskets, admin, every user account); PQC key status
in Solidity (`pqcKeyStatus`);
Fest test tokens fUSD, fETH, fBTC with `MsgConvertCoin`/`MsgConvertERC20`; cross-VM calls (native
to EVM, `MsgCrossVMCall`); AMM pools (QWAKK bought on the native AMM, QWAKK's price replayed from
its pool); MCP server and qore CLI; QoreScan.

### Testnet addresses

| Address | Role |
|---|---|
| `qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5` | treasury and test trader (QoreX, coin 118): hybrid-signed cross-VM trades |
| `qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p` | deployer, admin, keeper (`0x20807acc…`): hybrid `MsgCrossVMCall` rounds and rebalances, no EVM window, ML-DSA-87 admin signatures |
| `qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs` | oracle reporter (`0x6A286f3D…`): signs every price round |
| `qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u` | curator (`0xe0BBCcb7…`): signs weights and rebalances |
| `qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf` | trade relayer (`0x08Ac091C…`): submits QoreX users' signed messages to `DarwinAccountFactory`, converts fUSD deposits and withdrawals |

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

# contracts: 110 unit, fuzz and invariant tests, mock precompiles locally
cd contracts && forge test && cd ..

# app, against the live testnet deployment
cd app && npm install && npm run dev        # http://localhost:3032
```

To trade, install QoreX, take test QOR and fUSD from the
[faucet](https://dashboard.qorechain.io/faucet), open a basket and buy. The first buy shows two
approvals in QoreX (the fUSD deposit, then the signed trade); later buys one.

Operating your own deployment (testnet-only mnemonic in `QORE_MNEMONIC` or
`~/.config/qorechain/testnet.mnemonic`, never committed):

```bash
cd ops && npm install
npm run status                       # keys, windows (none open), balances of every role
npm run fund -- qor 60 2 2           # treasury -> deployer, reporter, curator (hybrid-signed)
npm run fund -- tokens               # faucet fUSD/fETH/fBTC -> ERC-20 on the deployer
npm run window -- register all       # ML-DSA-87 keys, with proof of possession
npm run window -- open deployer      # an EVM window for the deployment (contract creation)
(cd ../contracts && forge build) && npm run deploy
npm run window -- close deployer     # close it again: Darwin's accounts hold no window
npm run keeper                       # local only: oracle rounds, rebalances
npm run relayer                      # the original intent relayer on :3046 (production runs it in the app)
npx tsx src/deploy-accounts.ts       # DarwinAccountFactory
APP=http://localhost:3032 npx tsx src/account-check.ts   # the account path, 9 checks
npm run e2e                          # the on-chain suite, 28 checks
npx tsx src/pq-audit.ts 2026-11-21T09:12:00Z   # every Darwin transaction since then hybrid-verified
npm run trade -- buy BLUEDW 5        # or: tsx src/crossvm.ts buy BLUEDW 5 (native, hybrid)
npm run rebalance -- plan BALDW
```

End-to-end in a browser, with real hybrid signing by the QoreX test double:

```bash
cd app && npm run build && npm start &   # port 3032
npm run e2e                              # the full browser suite (26 checks)
ONLY="buy BLUEdw|declined" npm run e2e   # a subset: each trade costs testnet QOR in fees
node e2e/trade.mjs BLUEdw 2              # one trade: connect, buy 2 fUSD of BLUEdw, sell half
```

## How it runs in production

The app is one Vercel project (`app/`, base path `/qorechain`), served at darwin.market/qorechain by a
Cloudflare Worker attached to that path alone (`infra/cloudflare/worker.js`); the rest of
darwin.market is untouched. Its server holds the role keys (an encrypted environment variable) and
does the keeper's work on demand, so nothing runs while nobody trades:

- **Prices:** before executing a trade, the relayer publishes a signed round if the last one is more
  than 20 minutes old (the router refuses prices older than 30). QWAKK's price is the median of its
  pool's last 30 minutes of swaps, read from the chain, so no state is kept between calls.
- **Stale prices:** a visitor whose app finds the round older than 30 minutes asks the server for
  one, published only if the last is over 20 minutes old (at most three an hour, none while nobody
  visits).
- **Daily cron** (06:00 UTC): publishes a round (a hybrid `MsgCrossVMCall`, memo `darwin round
  <n>`) and completes any withdrawal left halfway (`settleWithdrawals()`). It opens no window.
- **Keeper:** `app/src/server/keeper.ts` sends rounds and rebalances with `writeNative`
  (`app/src/server/chain.ts`), from the deployer's account, hybrid-signed. None of Darwin's
  accounts holds an EVM window.
- **Weekly cron** (Mondays 12:05 UTC): the curator-signed rebalance of every basket that drifted.
- **Relayer:** routes of the app (`/api/relay/*`), so it runs in the app's server on Vercel.
  `app/src/server/accounts.ts` checks both halves of a user's signed message with QoreSign, then
  submits it to `DarwinAccountFactory` as a `MsgCrossVMCall` it hybrid-signs (secp256k1 +
  ML-DSA-87), with memo `darwin execute <account> <nonce>`, and pays the gas. The transaction
  itself is post-quantum and needs no EVM window. Deposits and withdrawals are credited once through the
  relayer's own on-chain memos (`darwin deposit <txhash>`, `darwin withdraw <evm hash>`), so they
  survive serverless restarts. `app/src/server/relayer.ts` keeps the original intent path for
  shares bought before DarwinAccounts.

If none of it runs, the app still displays, and in-kind redemption never needs a price.

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
- Tests, on the v2 stack: 110 unit, fuzz and invariant tests (11 for DarwinAccount); on-chain E2E
  28/28 (`docs/e2e/2026-11-21T0917.md`), including "no Darwin account holds an EVM window, and the
  chain refuses an ECDSA-only EVM transaction from the deployer" and each basket's NAV per share
  recomputed from its holdings at the oracle's prices; `ops/src/pq-audit.ts`: 230/230 transactions
  of the deployer and the four relayers hybrid-verified since 2026-11-21T09:12Z, when the windows
  were closed; the account path on chain 9/9 (`ops/src/account-check.ts`:
  deposit credited once, buy, sell, withdraw; replay, changed calls, another key, a target outside
  Darwin and a forged call sent on chain directly, all refused); a 16-user DarwinAccount battery
  on production, 168/168 operations, 32/32 attacks refused, 138/138 relayer transactions
  hybrid-signed (`account-battery-2026-11-21T092613.md`); a 6-user native battery, 32/32 trades
  with a verified hybrid signature (`battery-2026-11-21T0927.md`); browser E2E 24/26 locally
  with one skip and one timeout that passed on rerun (`browser-2026-11-20T221356.md`), and 7/7 on
  production; see [docs/TESTING.md](docs/TESTING.md).
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
| The keeper sent rounds and rebalances as EVM transactions (ECDSA alone) through a scoped window: the explorer labelled them *not quantum-safe*, and a stolen secp256k1 key could pause minting or send calls within the window | **fixed and live (2026-11-21)**: every Darwin transaction is a hybrid `MsgCrossVMCall`; every window closed; the chain refuses an ECDSA-only transaction (on-chain suite, `pq-audit.ts` 230/230) |
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
