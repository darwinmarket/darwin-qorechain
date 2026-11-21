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
with fUSD from QoreX with one signature (the first buy adds one fUSD deposit approval), and you
exit by selling it for fUSD and withdrawing to QoreX; the vault holds the coins. No EVM window, no
authorization, no gas for the trade.

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
- every user trade is plain text the user signs in QoreX with secp256k1 and ML-DSA-87
  (`signArbitrary`), and is executed by the user's own DarwinAccount, a contract controlled only by
  the user's registered ML-DSA-87 key: it rebuilds the text (account, single-use nonce, deadline,
  hash of the exact calls) and checks it with `pqcVerify` before calling Darwin's router. Darwin's
  relayer first verifies both halves with QoreSign so it never pays for a message the chain would
  refuse, then submits it and pays the gas; it cannot change or replay a call. Windowless: the user
  opens no EVM window and signs no grant (QoreX does not sign cross-VM calls or send EVM
  transactions, which we established message type by message type);
- every transaction Darwin itself sends (the keeper's rounds and rebalances, the relayers'
  executions) is a `MsgCrossVMCall` hybrid-signed with secp256k1 + ML-DSA-87 and verified by the
  chain; the explorer shows each one "quantum-safe · verified on-chain". None of Darwin's accounts
  holds an EVM window, so the chain refuses an ECDSA-only transaction from them: a leaked
  secp256k1 key alone can move nothing, not even the guardian's pause.

And you don't have to take the chain's word for it: each transaction page re-verifies the
signatures in the browser with `@qorechain/pqc`: a trade's owner signature, rebuilt from the
calldata and the account's nonce (and shown to fail for the next nonce), and an oracle round's
reporter signature, for the round number in the transaction's memo (shown to fail for the next
round); hybrid transaction signatures with QoreSign.

Darwin is already live on Miden mainnet (app.darwin.market, 120+ wallets). This is its
post-quantum port, written during the fest, with the same front.

## How it's made

- **Contracts** (Solidity 0.8.28, Foundry, OpenZeppelin): `PqcAuth` is the single call site of
  `pqcKeyStatus` (0x0A02) and `pqcVerify` (0x0A01); `PqcAdmin` puts every admin power behind it;
  `DarwinOracle` (signed rounds, breaker, staleness), `DarwinBasket` (ERC-20 share, in-kind
  mint/redeem, curator-signed rebalances), `DarwinReserve` (oracle-priced inventory, because the
  EVM cannot call the native AMM), `DarwinRouter` (buy or sell a whole basket with fUSD), `WQOR`,
  `DarwinAccount` and `DarwinAccountFactory` (each QoreX user's account, CREATE2 from the owner,
  ML-DSA-87 only, allowed targets changed only by the admin's ML-DSA-87 signature).
- **Ops** (TypeScript, QoreChain SDK): coin-118 treasury and coin-60 deployer / reporter / curator
  from one mnemonic; ML-DSA-87 registration with proof of possession; hybrid-signed native txs;
  `MsgConvertCoin`/`MsgConvertERC20` for the Fest tokens; QOR and QWAKK first bought on the native AMM, then held as the price-tracking stand-ins fQOR/fQWAKK (minted only by an ML-DSA-87 admin signature) because the real testnet supply capped buys at tens of dollars; a keeper
  that posts signed rounds (10-minute heartbeat or a 0.25% move) and runs the weekly rebalance, each
  sent as a hybrid-signed `MsgCrossVMCall` (simulated first, so a refusal is named before sending);
  an audit (`ops/src/pq-audit.ts`) that every transaction of Darwin's accounts is hybrid-verified.
- **App** (Next.js, forked from our mainnet front): reads everything from the chain; trades through
  QoreX with the wallet adapter's helpers and the user's DarwinAccount; its server is the relayer
  (deposits: one `MsgSend` of fUSD converted onto the account; withdrawals: back to the QoreX
  wallet in bank form); a Security tab with the oracle's feeds and rounds, the
  rules and how Darwin signs (keeper and relayers: `MsgCrossVMCall`, secp256k1 + ML-DSA-87; EVM
  window: none); a transaction page with the chain's post-quantum evidence and the
  browser's own ML-DSA-87 verdict; a PQC key badge from `@qorechain/react`.
- **Prices:** BTC and ETH from four spot APIs; QOR at its market price (CoinGecko, MEXC); QWAKK
  from its only market, the QWAKK/QOR pool, whose history the charts replay swap by swap.
- **Tests:** 110 unit, fuzz and invariant tests (11 for DarwinAccount); 28/28 on-chain checks
  against the real precompiles (forged, tampered, replayed, stale and expired signatures refused;
  no Darwin account holds an EVM window and the chain refuses an ECDSA-only transaction; each NAV
  recomputed from holdings at oracle prices; a second opinion from the `qore` CLI); a signing audit,
  230/230 transactions of Darwin's accounts hybrid-verified since the windows were closed; 9/9
  on-chain checks of DarwinAccounts (deposit credited once, buy, sell, withdraw; replay, changed
  calls, another key, a target outside Darwin and a forged call sent on chain directly, all
  refused); a 16-user battery on production (168/168 operations, 32/32 attacks refused, 138/138
  relayer transactions hybrid-signed); a 6-user native battery (32/32 trades hybrid-verified); 26 browser checks with the QoreX test double and real hybrid signing (24/26
  locally plus a rerun of the flaky check, 7/7 on production). Reports with every tx hash in
  `docs/e2e`.
- **Audit:** the two-stage QCAI audit (run by the team on the dashboard) and the post-quantum
  design map in `docs/AUDIT.md`; QoreScan
  CBOM in `docs/cbom`.
- **Hard parts:** QoreX cannot sign EVM transactions, so trades go through an account that checks
  the user's ML-DSA-87 signature itself (the first version went native to EVM by cross-VM call,
  through each user's EVM window and an authz grant); the keeper's rounds were EVM transactions,
  which the explorer labels *not quantum-safe* although their prices were ML-DSA-87 signed, so every
  Darwin transaction moved to the native lane (a cross-VM call meters the EVM work at about 2.5x
  and leaves no EVM logs, so rounds carry a memo `darwin round <n>` and readers decode the calldata;
  contract creation and QOR-carrying calls still need an EVM window, at deployment only); closing a
  window always failed in our tooling (an object passed where the SDK takes the address string),
  now fixed; an EVM window
  lasts at most 17,280 blocks;
  the ERC-20 conversions need ~2M gas, below which the chain reports a misleading balance error;
  the EVM lane needs coin-60 keys; EVM logs of cross-VM calls are not in `eth_getLogs`, so the app
  reads trades from the native tx search; the REST endpoint sends no CORS headers; the testnet AMM
  pools priced QOR about 10x above its market, so the oracle moved to market prices (round 60).

## Links and addresses

- GitHub: https://github.com/darwinmarket/darwin-qorechain (MIT)
- Video: _to record (3 minutes max)_
- Demo: https://darwin.market/qorechain (docs: https://docs.darwin.market/qorechain)
- Testnet addresses (one per line):

```
qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5
qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p
qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs
qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u
qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf
0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12
```

(treasury and QoreX test trader; deployer, admin and keeper; oracle reporter; curator; trade relayer;
DarwinAccountFactory)

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
- EVM window (including scoped: deployment and the original user path; Darwin's own accounts hold none)
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
