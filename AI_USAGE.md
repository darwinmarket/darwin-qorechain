# How AI was used

Darwin on QoreChain was built by the Darwin team with an AI coding assistant (Claude Code) in the
terminal, during the fest.

## Workflow

1. **Research.** The assistant read the QoreChain docs and the official repos (SDK, QoreX
   integrations, Build Before Q-Day workshops) and scanned the testnet: every token, AMM pool and
   active contract, to find what a basket could hold and price.
2. **Design.** The team chose the track (Post-Quantum dApp) and the baskets (BLUEdw, BALdw,
   QOREdw); the assistant proposed the contract architecture: an ML-DSA-87 signed oracle, curator
   signed rebalances, admin powers behind `PqcAdmin`, in-kind redemption that never stops.
3. **Build.** The assistant wrote the contracts, the Foundry tests, the TypeScript ops tooling and
   the app's QoreChain data and wallet layers, committing step by step.
4. **Verify on chain.** Every path was run on qorechain-diana before it was called done: key
   registration, scoped windows, deployment, oracle rounds, rebalances, router trades, and a
   browser end-to-end test with real hybrid signing.

## What was generated

- `contracts/`: all contracts and tests.
- `ops/`: all scripts.
- `app/src/lib/qore`, `app/src/components/app`, the on-chain store and the pages.

## What the humans did

- Darwin itself: the product, the mainnet protocol and the front whose visual shell this app forks.
- The decisions: track, baskets and their weights, naming (BLUEDW / BLUEdw), what to ship.
- Testnet funds and keys, the QCAI audit runs on the dashboard, the demo video, the submission.

## Findings the assistant made along the way

- QoreX cannot sign EVM transactions yet, but signs native ones hybrid: Darwin sends trades as
  `MsgCrossVMCall` from the native lane, which works on the testnet and puts the user's
  ML-DSA-87 signature on every trade.
- The EVM lane needs an `eth_secp256k1` (coin 60) key: the deployer, reporter and curator are
  coin-60 accounts derived from the same mnemonic as the coin-118 treasury.
- EVM logs of cross-VM calls are not indexed by `eth_getLogs`; the app reads those trades from the
  native tx search (`crossvm_request.target_contract`) and decodes their calldata.
- The public REST endpoint sends no CORS headers; the app reads it through a narrow proxy.
