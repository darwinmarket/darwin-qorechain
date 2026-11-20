# EVM Windows

On QoreChain an EVM transaction is admitted only while the sending account has an open **EVM authorisation window**: a hybrid-signed `MsgOpenEVMWindow`, bounded by

| Bound | Meaning |
|---|---|
| blocks | the window closes after this many blocks |
| transactions | at most this many EVM transactions |
| value | at most this much QOR transferred into the EVM |
| allowed targets (optional) | a **scoped** window admits calls only to these contracts |

A stolen secp256k1 key alone cannot open a window: that needs the account's ML-DSA-87 signature.

## How Darwin uses them

- **The keeper's window is scoped** to Darwin's contracts and tokens (`allowed_targets`). A contract creation is refused in a scoped window, so deployments open an unscoped one, closed again by the keeper's scoped window.
- **The value cap is real.** Each window caps the QOR it admits. Funding the reserve with wrapped QOR needed a window with a raised cap (`WINDOW_MAX_QOR` in `ops/src/window.ts`), replaced by the keeper's scoped window right after.
- **Each user's own window admits relayed trades.** When the relayer executes a trade through an authz grant, the chain checks that the user did not send the call itself and admits it only through **the user's** window. The transaction records `pqc_evm_window_used` with the user's address.

QoreX opens a user's window from its own screen; a website cannot open one for the user.
