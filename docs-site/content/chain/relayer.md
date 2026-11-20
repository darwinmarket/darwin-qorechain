# QoreX & the Relayer

## What QoreX signs

QoreX shows every message it signs, decoded, and refuses what it cannot display. Darwin tested the extension message type by message type, with a diagnostic page that asks it to sign one type at a time:

| Message | Result |
|---|---|
| `cosmos.bank.v1beta1.MsgSend` | signed |
| `cosmos.authz.v1beta1.MsgGrant` | signed, shown with its expiry |
| `cosmwasm.wasm.v1.MsgExecuteContract` | signed |
| `signArbitrary` (message signature) | signed: ADR-36 secp256k1 + ML-DSA-87 |
| `qorechain.crossvm.v1.MsgCrossVMCall` | refused: "QoreX cannot show what ... does" |
| `cosmos.evm.erc20.v1.MsgConvertCoin`, `MsgConvertERC20` | refused |

QoreX does not send EVM transactions either. So a QoreX user cannot send Darwin's trade transaction, which is a cross-VM call into the router. The testnet also has CosmWasm uploads switched off, which rules out a CosmWasm gateway.

## The design

| Step | Who | Signature |
|---|---|---|
| Open an EVM access window | the user, in QoreX | hybrid `MsgOpenEVMWindow` |
| Grant `MsgCrossVMCall` and `MsgConvertCoin` to the relayer for 24 h | the user, in the app | hybrid `MsgGrant`, decoded by QoreX |
| Sign a trade intent | the user, in the app | `signArbitrary`: secp256k1 + ML-DSA-87 |
| Verify it | the relayer | QoreSign `verifyMessageWithChain` against the user's registered key |
| Execute it as the user | the relayer | hybrid `MsgExec`; admitted by the user's EVM window |

## What the relayer checks

`ops/src/relayer.ts`:

- the intent's signature, with `requirePq`, against the key the user registered on chain;
- `darwin: "trade-v1"`, chain id `qorechain-diana`, a known Darwin basket, positive amounts;
- `expires` in the future and at most 10 minutes ahead;
- the nonce was never used for this account (kept until the intent expires);
- the user's window is open and the grant is live.

A replay is refused (`already executed`), a tampered intent is refused (the signature does not verify). Both are checked on chain by Darwin's test suite.

## What it sends

One `MsgExec` from the relayer, with the user as the sender of every inner message: `MsgConvertCoin` if the user's ERC-20 fUSD is short, an `approve` if the router's allowance is short, then the router's `buy` or `sell` with the user's minimum. The relayer pays the gas.

## Trust bounds

See [Risks](/risks#the-relayer).

## Running it

`npm run relayer` in `ops/` (port 3046). The app proxies `/api/relay/status` and `/api/relay/trade` to it.
