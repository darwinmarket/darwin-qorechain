# Known Limitations

Darwin had its repository read cold, as a juror would, on 2026-11-20. What it found, and where it stands:

| Finding | Status |
|---|---|
| Duplicate feed ids in one round could chain the 15% breaker; rounds could follow each other within seconds | fixed and live (v2): ids strictly increasing, rounds at least 60 s apart; refused on chain as `FeedsNotSorted` and `TooSoon` |
| `PqcAuth` assumed the registered key was ML-DSA-87 | fixed: algorithm id 1 enforced |
| An emptied basket could be re-seeded by the classical seeder key | fixed: one-shot seed |
| The oracle address was fixed in the reserve and baskets | fixed: `setOracle`, ML-DSA-87 admin only |
| Seed shares sat on the deployer, whose secp256k1 key relays transactions | fixed: every seed minted to `0x...dEaD` |
| QWAKK's only market is a thin pool whose spot could be pumped | fixed: 30-minute median; QOR needs two of three quotes |
| The reserve trades at the oracle price with a 0.30% spread, which arbitrage can farm around updates | accepted on testnet |
| QoreX does not sign cross-VM calls | addressed by Darwin accounts: the user signs text, the account checks it on chain; trust bounds in [Risks](/risks#the-relayer) |
| The QOR baskets were bounded by the real QOR and QWAKK on the testnet | addressed by fQOR and fQWAKK |
| The keeper's rounds and rebalances were EVM transactions (ECDSA alone) through a scoped window; the explorer labelled them *not quantum-safe* (found 2026-11-21) | fixed and live: every Darwin transaction is a hybrid `MsgCrossVMCall`; every window closed, and the chain refuses an ECDSA-only transaction from Darwin's accounts |
| Closing an EVM window always failed in `ops/src/window.ts` (an object passed where the SDK takes the address string: `invalid sender: decoding bech32 failed`) | fixed |
| A contract creation or a call carrying QOR value cannot be a cross-VM call | accepted: such calls need an EVM window, opened with the ML-DSA-87 key at deployment only and closed afterwards; none since 2026-11-21 |

## Found by testing with a real wallet

Every trade path had been tested with QoreX's test double, which signs any message type. A buy from the real extension failed: QoreX refuses `MsgConvertCoin` and `MsgCrossVMCall`. That finding is what led to the relayer design, verified with the real extension on the testnet. Its EVM window and 24-hour grant were then replaced by [Darwin accounts](/chain/accounts), which need neither; the original path remains only for selling shares bought before.
