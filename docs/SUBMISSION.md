# Build Before Q-Day submission

**Name:** Darwin

**Tagline:** Crypto baskets that survive Q-Day: one token, a whole portfolio, priced and rebalanced
only with ML-DSA-87 signatures checked on chain.

**Category:** Post-Quantum dApp

**Description**

Darwin turns a portfolio into one token. Three baskets are live on qorechain-diana: Blue Chip
(BLUEdw, 50% BTC / 50% ETH), Balanced (BALdw, 35/35/30 with fUSD) and Qore Ecosystem (QOREdw, 40%
QOR). You buy and sell them with fUSD from QoreX in one transaction.

A basket protocol has three keys worth stealing: the price key, the trading key and the admin key.
Darwin puts all three behind ML-DSA-87. Every oracle round carries the reporter's signature,
verified by `pqcVerify` against the key registered on chain before a price is stored. Every
rebalance carries the curator's signature over the exact trades and reverts if it would cost more
than 1% of NAV. Every admin action needs the admin's ML-DSA-87 signature; no function trusts
`msg.sender` for admin powers. User trades are hybrid-signed by QoreX on the native lane and reach
the EVM through `MsgCrossVMCall`. Redemption in kind never stops, even if the oracle, the curator
and the admin all disappear.

Darwin is already live on Miden mainnet (app.darwin.market, 120+ wallets). This is its
post-quantum port, written during the fest.

**How it was built**

- Contracts (Solidity, Foundry, 80 unit/fuzz/invariant tests, plus 18 on-chain and 16 browser E2E checks): PqcAuth / PqcAdmin on the 0x0A01 and 0x0A02 precompiles,
  DarwinOracle, DarwinBasket, DarwinReserve (oracle-priced inventory, since the EVM cannot call the
  native AMM), DarwinRouter, WQOR.
- Ops (TypeScript, @qorechain/sdk 0.14): coin-118 treasury and coin-60 deployer / reporter /
  curator from one mnemonic; ML-DSA-87 key registration with proof of possession; hybrid-signed
  native txs; MsgConvertCoin for the Fest tokens; a keeper that keeps a **scoped** EVM window
  (allowed_targets = Darwin's contracts only), posts signed price rounds on a heartbeat or a 0.25%
  move, and rebalances on drift.
- App (Next.js, forked from our mainnet front): reads everything from the chain, trades through
  QoreX `signAndBroadcast` with hand-encoded MsgCrossVMCall / MsgConvertCoin (byte-identical to the
  SDK), and an activity feed that shows the chain's `pqc_hybrid_verify` result for each trade.
- Hard parts: QoreX cannot sign EVM transactions yet, so trades go native → EVM by cross-VM call;
  the EVM lane needs coin-60 keys; EVM logs of cross-VM calls are not indexed, so the app reads
  them from the native tx search; the public REST endpoint has no CORS.

**Testnet addresses (qor1, for the form)**

- `qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5` treasury, trades from the native lane
- `qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p` deployer / admin / keeper relayer
- `qor1dg5x70vqts47p4jnajrvrjketxph8jewxe3phs` oracle reporter
- `qor1uzauedcmwcgyrvlnqw9numxm8yk0hcmnyvuq5u` curator

**Kits:** QoreChain SDK (TypeScript), QoreX integrations (TypeScript).

**Network functions:** ML-DSA-87 hybrid transactions; PQC key registration with proof of
possession; EVM window (scoped); PQC signature verification in Solidity; PQC key status in
Solidity; test tokens fUSD, fETH, fBTC; AMM pools (QOR price).

**Special awards:** AI-Native (AI_USAGE.md), Regional (France / Europe).

**Still to do before 2 December:** QCAI audit stage 1 and 2 (docs/AUDIT.md), the 3-minute video,
the cover image, the demo URL.
