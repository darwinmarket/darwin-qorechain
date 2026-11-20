# Every Privileged Action

There is one call site for both precompiles: `PqcAuth.requireSigned` (`contracts/src/pqc/PqcAuth.sol`). It reads the signer's key with `pqcKeyStatus`, refuses an unregistered key, a key without proof of possession or a key of another algorithm than ML-DSA-87, then checks the signature with `pqcVerify`.

| Action | Signer | Checked in | Protects |
|---|---|---|---|
| Oracle round | reporter | `DarwinOracle.submit` | every price the baskets are valued at |
| Rebalance | curator | `DarwinBasket.rebalance` | the exact trades the vault makes |
| Target weights | curator | `DarwinBasket.setTargetWeights` | the basket's composition |
| 16 admin functions | admin | `PqcAdmin._authorizeAdmin` | every power over the protocol and its funds |
| Test-token minting | admin | `DarwinTestToken.mint` | fQOR and fQWAKK supply |
| User trades | the user | the relayer (QoreSign) + the chain (hybrid `MsgExec`, the user's EVM window) | what is traded for whom |

The 16 admin functions: oracle `addFeed`, `setTokenFeed`, `setReporter`, `setParams`; reserve `listToken`, `setSpread`, `setSpreadExempt`, `withdraw`, `setOracle`; basket `setMintPaused`, `setCurator`, `setGuardian`, `setReserve`, `setMaxRebalanceLoss`, `setOracle`; and `setAdmin` on each. Each admin signature works once (nonce) and expires (deadline).

## What a leaked secp256k1 key can do

The deployer's key relays transactions and holds the guardian role, which can only pause new mints, never selling or redeeming. It cannot change a price, a weight, a trade or a parameter, and cannot move the reserve's funds. No seed shares sit on it: every seed went to `0x...dEaD`.

## Tested

Each row is covered by Foundry tests with mock precompiles and by the on-chain suite against the real `pqcVerify` and `pqcKeyStatus`: forged, tampered, replayed, stale and expired signatures refused. See [Tests](/developers/testing).
