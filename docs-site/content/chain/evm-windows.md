# EVM Windows

On QoreChain an EVM transaction is admitted only while the sending account has an open **EVM authorisation window**: a hybrid-signed `MsgOpenEVMWindow`, bounded by

| Bound | Meaning |
|---|---|
| blocks | the window closes after this many blocks |
| transactions | at most this many EVM transactions |
| value | at most this much QOR transferred into the EVM |
| allowed targets (optional) | a **scoped** window admits calls only to these contracts |

A stolen secp256k1 key alone cannot open a window: that needs the account's ML-DSA-87 signature. A window can be opened for at most **17,280 blocks**, about 7 hours at 1.43 s blocks.

## How Darwin uses them

- **The keeper's window is scoped** to Darwin's contracts and tokens (`allowed_targets`). A contract creation is refused in a scoped window, so deployments open an unscoped one, closed again by the keeper's scoped window.
- **The value cap is real.** Each window caps the QOR it admits. Funding the reserve with wrapped QOR needed a window with a raised cap (`WINDOW_MAX_QOR` in `ops/src/window.ts`), replaced by the keeper's scoped window right after.
- **The relayer's window is scoped to the factory.** Darwin's relayer submits users' signed messages to `DarwinAccountFactory` and nothing else, so its window lists that one contract. It renews it itself (17,280 blocks, 1,000 transactions) when it runs low.

## Users need none

A QoreX user trades through a [Darwin account](/chain/accounts): the relayer sends the EVM transaction through its own window, and the account checks the user's ML-DSA-87 signature with `pqcVerify`. The user opens no window and grants nothing.

## Before Darwin accounts

Shares bought before Darwin accounts sit on the user's EVM twin, and selling them still takes the user's own window. On that path the relayer executes the trade through an authz grant; the chain checks that the user did not send the call itself and admits it only through **the user's** window. The transaction records `pqc_evm_window_used` with the user's address. QoreX opens a user's window from its own screen (about 7 hours); a website cannot open one for the user.
