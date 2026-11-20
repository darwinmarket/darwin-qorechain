# Build Before Q-Day submission

Everything the project form asks for, ready to paste.

**Name:** Darwin

**Tagline:** Crypto baskets that survive Q-Day: one token, a whole portfolio, priced and rebalanced
only with ML-DSA-87 signatures checked on chain.

**Category:** Post-Quantum dApp

## Description

Darwin turns a portfolio into one token. Four baskets are live on qorechain-diana: Blue Chip
(BLUEdw, 70% BTC / 30% ETH), Balanced (BALdw, 35% BTC / 35% ETH / 30% USD), Qore Ecosystem
(QOREdw, 60% QOR / 25% ETH / 15% QWAKK) and Degen (DEGENdw, 70% QWAKK / 30% QOR). You buy one
with fUSD from QoreX in a single approval, and you exit by selling it for fUSD; the vault holds the
coins.

A basket protocol has three keys worth stealing: the one that sets prices, the one that trades the
vault, and the one that administers it. On Q-Day a quantum computer derives a secp256k1 private
key from its public key. Darwin puts all three behind ML-DSA-87, verified by QoreChain's
precompiles against keys registered with proof of possession:

- every oracle round carries the reporter's ML-DSA-87 signature, checked by `pqcVerify` before a
  price is stored, with a 15% circuit breaker;
- every rebalance carries the curator's signature over the exact trades, and reverts if it would
  lose more than 1% of NAV at oracle prices; rebalances run once a week, Mondays 12:00 UTC;
- every admin action (15 of them, including moving the reserve's funds) needs the admin's
  ML-DSA-87 signature; no function trusts `msg.sender` for admin powers;
- every user trade is hybrid-signed (secp256k1 + ML-DSA-87) by QoreX on the native lane and reaches
  the EVM through `MsgCrossVMCall`;
- the keeper's EVM window is scoped to Darwin's own contracts.

And you don't have to take the chain's word for it: each transaction page re-verifies the
signatures in the browser, with QoreSign for a trade and with `@qorechain/pqc` for an oracle
round (and shows that the same signature fails for the next round).

Darwin is already live on Miden mainnet (app.darwin.market, 120+ wallets). This is its
post-quantum port, written during the fest, with the same front.

## How it's made

- **Contracts** (Solidity 0.8.28, Foundry, OpenZeppelin): `PqcAuth` is the single call site of
  `pqcKeyStatus` (0x0A02) and `pqcVerify` (0x0A01); `PqcAdmin` puts every admin power behind it;
  `DarwinOracle` (signed rounds, breaker, staleness), `DarwinBasket` (ERC-20 share, in-kind
  mint/redeem, curator-signed rebalances), `DarwinReserve` (oracle-priced inventory, because the
  EVM cannot call the native AMM), `DarwinRouter` (buy or sell a whole basket with fUSD), `WQOR`.
- **Ops** (TypeScript, QoreChain SDK): coin-118 treasury and coin-60 deployer / reporter / curator
  from one mnemonic; ML-DSA-87 registration with proof of possession; hybrid-signed native txs;
  `MsgConvertCoin`/`MsgConvertERC20` for the Fest tokens; QWAKK bought on the native AMM; a keeper
  that keeps a scoped EVM window, posts signed rounds (10-minute heartbeat or a 0.25% move) and runs
  the weekly rebalance.
- **App** (Next.js, forked from our mainnet front): reads everything from the chain; trades through
  QoreX with the wallet adapter's helpers; a Security tab with the oracle's feeds and rounds, the
  rules and the keeper's window; a transaction page with the chain's post-quantum evidence and the
  browser's own ML-DSA-87 verdict; a PQC key badge from `@qorechain/react`.
- **Prices:** BTC and ETH from four spot APIs; QOR at its market price (CoinGecko, MEXC); QWAKK
  from its only market, the QWAKK/QOR pool, whose history the charts replay swap by swap.
- **Tests:** 94 unit, fuzz and invariant tests; 23 on-chain checks against the real precompiles
  (forged, tampered, replayed, stale and expired signatures refused, plus a second opinion from the
  `qore` CLI); an 8-user parallel battery; 25 browser checks with the QoreX test double and real
  hybrid signing. Reports with every tx hash in `docs/e2e`.
- **Audit:** the two-stage QCAI audit (run by the team on the dashboard) and the post-quantum
  design map in `docs/AUDIT.md`; QoreScan
  CBOM in `docs/cbom`.
- **Hard parts:** QoreX cannot sign EVM transactions, so trades go native to EVM by cross-VM call;
  the EVM lane needs coin-60 keys; EVM logs of cross-VM calls are not in `eth_getLogs`, so the app
  reads trades from the native tx search; the REST endpoint sends no CORS headers; the testnet AMM
  pools priced QOR about 10x above its market, so the oracle moved to market prices (round 60).

## Links and addresses

- GitHub: https://github.com/darwinmarket/darwin-qorechain (MIT)
- Video: _to record (3 minutes max)_
- Demo: _local for now (`app/`, port 3032)_
- Testnet addresses (one per line):

```
qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5
qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p
qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs
qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u
```

(treasury and test trader; deployer, admin and relayer; oracle reporter; curator)

## Boxes to tick

**Kits and SDKs** (each is a dependency in `app/package.json` or `ops/package.json`):

- QoreChain SDK: TypeScript (`@qorechain/sdk`, `@qorechain/evm`), TypeScript (React)
  (`@qorechain/react`)
- qorechain-pqc: TypeScript (`@qorechain/pqc`)
- QoreSign: TypeScript (`@qorechain/qoresign`)
- QoreX integrations: TypeScript (`@qorechain/qorex-wallet-mock`)
- Wallet adapter: TypeScript (`@qorechain/wallet-adapter`)
- MCP + qore CLI: TypeScript (Node.js server) (`@qorechain/mcp`), TypeScript (CLI)
  (`@qorechain/qore-cli`)
- QoreScan: CLI (npm wrapper) (`@qorechain/qorescan`)

**Network functions:**

- ML-DSA-87 hybrid transactions
- PQC key registration with proof of possession
- EVM window (including scoped)
- PQC signature verification in Solidity
- PQC key status in Solidity
- AMM pools
- Test tokens fUSD, fETH, fBTC
- MCP server or qore CLI
- QoreScan

Not ticked: "Cross-VM, from EVM to Native". Darwin's cross-VM calls go the other way (native to
EVM, `MsgCrossVMCall`), which the form does not list.

**Special awards:** AI-Native (AI_USAGE.md). Regional: the team's country.

## Still to do before 2 December (team only)

- QCAI audit, stage 1 and stage 2, same setting (Ethereum EVM/Solidity); reports in `docs/audit/`,
  findings mapped in `docs/AUDIT.md`.
- The 3-minute video.
- Upload the cover image: `docs/cover.png` (2400x1350, 16:9).
