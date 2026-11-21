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

QoreX does not send EVM transactions either. So a QoreX user cannot send Darwin's trade transaction, which is a call into the router. The testnet also has CosmWasm uploads switched off, which rules out a CosmWasm gateway.

What QoreX does sign is enough: a `MsgSend` to deposit fUSD, and plain text (`signArbitrary`) for each trade. A [Darwin Account](/chain/accounts) checks that text on chain.

## The design

| Step | Who | Signature |
|---|---|---|
| Deposit fUSD (when a buy needs more than the account holds) | the user, in QoreX | hybrid `MsgSend` of fUSD to the relayer |
| Credit the deposit to the account | the relayer | hybrid `MsgConvertCoin`, receiver = the account, memo `darwin deposit <txhash>` |
| Sign a trade | the user, in QoreX | `signArbitrary`: secp256k1 + ML-DSA-87 over the [exact text](/chain/accounts#the-exact-signed-text) |
| Check it | the relayer | QoreSign `verifyMessageWithChain`, both halves, against the user's on-chain keys |
| Submit it | the relayer | `factory.execute(owner, calls, summary, deadline, pqSignature)` in a `MsgCrossVMCall` it hybrid-signs (secp256k1 + ML-DSA-87) |
| Execute it | the user's DarwinAccount | `pqcVerify` against the user's ML-DSA-87 key, nonce, allowed targets |
| Withdraw fUSD | the user signs; the relayer returns it | the account transfers fUSD to the relayer; `MsgConvertERC20`, receiver = the user, memo `darwin withdraw <evm hash>` |

No EVM window, no authz grant, no gas for the user's trades. The deposit `MsgSend` costs the user a little QOR.

## What the relayer checks

`app/src/server/accounts.ts`, in the app's server:

- both halves of the signature, with `requirePq`, against the keys the user registered on chain, so it never pays for a message the chain would refuse;
- one to three calls, every target one of Darwin's contracts (router, baskets, fUSD);
- the calls are a buy or sell paying the account itself, optionally after router approvals, or an fUSD withdrawal to the relayer; anything else is refused;
- the deadline is in the future and at most 15 minutes ahead;
- the account's nonce has not moved since signing. If it has, either this very message already went through (a retry after a cut answer: the relayer answers with that transaction's hash and sends nothing), or another message took the nonce (a double click: "Your previous action was still being confirmed. Nothing was sent: try again.");
- for a deposit: the transaction exists and succeeded, and sends fUSD from the user to the relayer; it is credited once (the relayer's memo is read back from the chain).

## What it sends

- For a trade or a withdrawal: one call to the factory, which creates the account on its first action and calls it. It is a `MsgCrossVMCall` the relayer hybrid-signs (secp256k1 + ML-DSA-87), memo `darwin execute <account> <nonce> <calls hash, 12 hex>`; no relayer holds an EVM window. The relayer pays the gas. Before a trade it publishes a fresh oracle round if the last is more than 20 minutes old.
- It never sends a message twice. The memo is unique to the message (the account, the nonce, and the first 12 hex digits of the calls' hash). Before any resend (after `account sequence mismatch`, or an error from a broadcast that may still have landed) the relayer looks for a committed, executed transaction carrying that memo among its latest 30, and returns it as the success. Before sending, it also checks the mempool: if another message for the same nonce is waiting there (two serverless instances, a double click), it waits for that block instead of sending a transaction that could only fail on chain. Tested by the battery: two messages signed for one nonce and sent at once, 4/4 times one executed and the other refused before sending, with no failed transaction on chain.
- For a deposit: one native `MsgConvertCoin` (2M gas).
- After a withdrawal: one native `MsgConvertERC20` (2M gas). `settleWithdrawals()` completes any withdrawal cut halfway, before the next withdrawal and in the daily cron.

## Trust bounds

The relayer cannot change a call, replay a message or reach a contract outside Darwin's list: the account refuses all three on chain. It can refuse or delay a message, and it holds fUSD for one transaction during a deposit or a withdrawal. See [Darwin Accounts](/chain/accounts#what-the-relayer-can-and-cannot-do) and [Risks](/risks#the-relayer).

## Before DarwinAccounts

Shares bought before DarwinAccounts sit on the user's EVM twin. Selling them still uses the original path, `app/src/server/relayer.ts` and `app/src/lib/qore/relay.ts`. The trade card switches to it on its own for those holdings.

| Step | Who | Signature |
|---|---|---|
| Open an EVM access window (at most 17,280 blocks, ~7 h) | the user, in QoreX | hybrid `MsgOpenEVMWindow` |
| Grant `MsgCrossVMCall` and `MsgConvertCoin` to the relayer for 24 h | the user, in the app | hybrid `MsgGrant`, decoded by QoreX |
| Sign a trade intent (JSON) | the user, in the app | `signArbitrary`: secp256k1 + ML-DSA-87 |
| Verify it | the relayer | QoreSign `verifyMessageWithChain` against the user's registered key; fields, expiry (10 min), single-use nonce |
| Execute it as the user | the relayer | hybrid authz `MsgExec`; admitted by the user's own EVM window |

On that path the relayer is bounded by the grant (two message types, 24 hours, revocable) and the user's window (transaction count, value, expiry). Every action is a public `MsgExec` naming the user as sender.

## Running it

The relayer is a route of the app (`/api/relay/account`, `/api/relay/deposit`, `/api/relay/execute`; `/api/relay/status` and `/api/relay/trade` for the original path). It runs in the app's server, on Vercel in production; its keys stay server-side.
