# EVM Windows

On QoreChain an EVM transaction is admitted only while the sending account has an open **EVM authorisation window**: a hybrid-signed `MsgOpenEVMWindow`, bounded by

| Bound | Meaning |
|---|---|
| blocks | the window closes after this many blocks |
| transactions | at most this many EVM transactions |
| value | at most this much QOR transferred into the EVM |
| allowed targets (optional) | a **scoped** window admits calls only to these contracts |

A stolen secp256k1 key alone cannot open a window: that needs the account's ML-DSA-87 signature. A window can be opened for at most **17,280 blocks**, about 7 hours at 1.43 s blocks.

## Darwin opens none

Since 2026-11-21 none of Darwin's accounts (the deployer and the four relayers) holds an EVM window. Every transaction Darwin sends is a native `MsgCrossVMCall` hybrid-signed with secp256k1 + ML-DSA-87: the keeper's rounds and rebalances, and the relayers' account executions. So the chain refuses an ECDSA-only EVM transaction from Darwin's accounts:

```
account qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p has no open EVM authorisation window;
open one with MsgOpenEVMWindow, signed on the Cosmos lane with the account's post-quantum key
```

A leaked secp256k1 key alone can therefore move nothing. The on-chain suite checks both facts (no window on any Darwin account, an ECDSA-only transaction refused), and `ops/src/pq-audit.ts` checks that every transaction of these accounts carries a verified hybrid signature.

Two things still need an EVM transaction, because a cross-VM call cannot do them: creating a contract and a call carrying QOR value. Both are used at deployment only. A window is opened for them with the account's ML-DSA-87 key and closed afterwards (`npm run window -- open|close <role>`); none has been needed since the switch.

Before 2026-11-21 the deployer kept a window scoped to Darwin's contracts and tokens (`allowed_targets`) to send rounds and rebalances. The explorer labelled those transactions *not quantum-safe*, because an EVM transaction is signed with ECDSA alone, even though each round's prices were ML-DSA-87 signed and checked by `pqcVerify`. The value cap was real too: funding the reserve with wrapped QOR needed a window with a raised cap (`WINDOW_MAX_QOR` in `ops/src/window.ts`).

## Users need none

A QoreX user trades through a [Darwin account](/chain/accounts): the relayer submits the user's signed message as a hybrid `MsgCrossVMCall`, and the account checks the user's ML-DSA-87 signature with `pqcVerify`. The user opens no window and grants nothing.

## Before Darwin accounts

Shares bought before Darwin accounts sit on the user's EVM twin, and selling them still takes the user's own window. On that path the relayer executes the trade through an authz grant; the chain checks that the user did not send the call itself and admits it only through **the user's** window. The transaction records `pqc_evm_window_used` with the user's address. QoreX opens a user's window from its own screen (about 7 hours); a website cannot open one for the user.
