# Every Privileged Action

There is one call site for both precompiles: `PqcAuth.requireSigned` (`contracts/src/pqc/PqcAuth.sol`). It reads the signer's key with `pqcKeyStatus`, refuses an unregistered key, a key without proof of possession or a key of another algorithm than ML-DSA-87, then checks the signature with `pqcVerify`.

| Action | Signer | Checked in | Protects |
|---|---|---|---|
| Oracle round | reporter | `DarwinOracle.submit` | every price the baskets are valued at |
| Rebalance | curator | `DarwinBasket.rebalance` | the exact trades the vault makes |
| Target weights | curator | `DarwinBasket.setTargetWeights` | the basket's composition |
| 16 admin functions | admin | `PqcAdmin._authorizeAdmin` | every power over the protocol and its funds |
| Test-token minting | admin | `DarwinTestToken.mint` | fQOR and fQWAKK supply |
| User trades and withdrawals | the user | `DarwinAccount.execute` (and the relayer first, with QoreSign) | what the user's account does, call by call |
| Accounts' allowed targets | admin | `DarwinAccountFactory.setTarget` (`PqcAdmin`) | which contracts a user's account may call |

The 16 admin functions: oracle `addFeed`, `setTokenFeed`, `setReporter`, `setParams`; reserve `listToken`, `setSpread`, `setSpreadExempt`, `withdraw`, `setOracle`; basket `setMintPaused`, `setCurator`, `setGuardian`, `setReserve`, `setMaxRebalanceLoss`, `setOracle`; and `setAdmin` on each. Each admin signature works once (nonce) and expires (deadline). The account factory adds a seventeenth, `setTarget`.

A user's Darwin account goes through the same `PqcAuth.requireSigned`, with the user's own registered key: it rebuilds the text QoreX signed (account, nonce, deadline, hash of the calls) and checks it before any call. See [Darwin Accounts](/chain/accounts).

## What a leaked secp256k1 key can do

Alone, nothing. Every transaction Darwin sends is a native `MsgCrossVMCall` hybrid-signed with secp256k1 + ML-DSA-87: the keeper's rounds and rebalances from the deployer, the relayers' account executions. None of these accounts holds an EVM window, so the chain refuses an ECDSA-only transaction from them ("has no open EVM authorisation window"), and opening a window needs the account's ML-DSA-87 key.

The deployer also holds the guardian role, which can only pause new mints, never selling or redeeming. The pause is the only function checked by `msg.sender`, so it too needs a hybrid transaction now. With both its keys the deployer still cannot change a price, a weight, a trade or a parameter, or move the reserve's funds: those need the reporter's, the curator's or the admin's ML-DSA-87 signature. No seed shares sit on it: every seed went to `0x...dEaD`.

A contract creation and a call carrying QOR value still need an EVM transaction, because a cross-VM call can do neither. They are used at deployment only, through a window opened with the ML-DSA-87 key and closed afterwards.

## Tested

Each row is covered by Foundry tests with mock precompiles and by the on-chain suite against the real `pqcVerify` and `pqcKeyStatus`: forged, tampered, replayed, stale and expired signatures refused. The suite also checks that no Darwin account holds an EVM window and that the chain refuses an ECDSA-only transaction from the deployer; `ops/src/pq-audit.ts` checks that every transaction of Darwin's accounts carries a verified hybrid signature. See [Tests](/developers/testing).
