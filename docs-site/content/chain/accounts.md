# Darwin Accounts

Every QoreX user trades through a **DarwinAccount**: a small contract on QoreChain's EVM that obeys one key only, the ML-DSA-87 key the user registered on QoreChain. The user signs plain text in QoreX; the account checks that signature on chain with `pqcVerify` before it makes any call. No EVM window, no authz grant, and no gas for the user's trades.

## Why an account

QoreX does not send EVM transactions and refuses cross-VM calls (see [QoreX & the Relayer](/chain/relayer)). It does sign plain text with `signArbitrary`: a secp256k1 signature and an ML-DSA-87 signature over the same bytes. And QoreChain lets a contract check an ML-DSA-87 signature against a registered key. So the account checks the user's signature itself, and anyone may submit it. Darwin's relayer submits it and pays the gas; it cannot change what was signed.

## The contracts

| Contract | Source | Address |
|---|---|---|
| DarwinAccountFactory | `contracts/src/account/DarwinAccountFactory.sol` | `0x09891b295bf34c6ed6b364e53bcd68e06fc2bd12` |
| DarwinAccount | `contracts/src/account/DarwinAccount.sol` | one per user, at `factory.accountOf(owner)` |

- **The address is known before the account exists.** It is fixed by CREATE2 from the owner's address alone. The app shows it, and fUSD can be credited to it, before the first trade.
- **It is created with the first action.** `factory.execute` deploys it if needed, then runs the signed calls.
- **Only a post-quantum owner gets one.** The factory refuses an owner without a registered ML-DSA-87 key with proof of possession (`PqcAuth.isQuantumSafe`, error `OwnerNotQuantumSafe`).
- **It calls Darwin's contracts only.** Allowed targets: the router, the four baskets and fUSD. The list changes only with the admin's ML-DSA-87 signature (`setTarget`, through `PqcAdmin`).
- **It holds** the user's fUSD (ERC-20 form) and basket shares.

## The exact signed text

The app builds the text, QoreX shows it, and the user approves it:

```
<summary>

Darwin account <account address, lowercase 0x>
nonce <n>
valid until <deadline, unix seconds>
calls <keccak256(abi.encode(calls))>
```

For example:

```
Darwin: Buy 2.00 fUSD of BLUEdw, for at least 0.207100 BLUEdw

Darwin account 0x3f1c…a9e2
nonce 3
valid until 1795190400
calls 0x5b8e…41d0
```

QoreX's ML-DSA-87 half signs exactly `"qorechain-msg-v1|qorechain-diana|" + text`. The account rebuilds those bytes on chain (`PREFIX` and `textFor`) and checks the signature against them.

| Part | What it binds |
|---|---|
| `qorechain-diana` (prefix) | the chain |
| `Darwin account 0x…` | this account, so the message is useless on any other |
| `nonce n` | single use: the nonce moves after every execution |
| `valid until` | a deadline; the app signs for 10 minutes, the relayer refuses more than 15 |
| `calls 0x…` | every target and every byte of calldata |
| the summary | what the user reads in QoreX; it is part of the signed bytes too |

## How a message is checked

**1. Darwin's relayer** (`app/src/server/accounts.ts`, in the app's server) checks before it spends anything:

- both halves, secp256k1 and ML-DSA-87, with QoreSign `verifyMessageWithChain` against the keys the user registered on chain, so it never pays for something the chain would refuse;
- one to three calls, all to Darwin's contracts;
- what the calls do: a buy or sell that pays the account itself, optionally preceded by router approvals; or a withdrawal of fUSD;
- the deadline, and that the nonce has not moved since signing.

Then it submits `factory.execute(owner, calls, summary, deadline, pqSignature)` and pays the gas, on the native lane: a `MsgCrossVMCall` the relayer hybrid-signs (secp256k1 + ML-DSA-87). The transaction itself is therefore post-quantum (the QoreChain explorer shows it *quantum-safe, verified on-chain*), and no EVM window is involved: none of the relayers holds one, so the chain would refuse an ECDSA-only transaction from them. An EVM transaction would carry ECDSA alone, which is how the first executions went out. Each execution carries the memo `darwin execute <account> <nonce> <calls hash, 12 hex>`. Four relayers share the load, each user served by one fixed by its address.

**2. The account** checks again, on chain:

1. the deadline has not passed (`Expired`);
2. the owner's ML-DSA-87 signature over the rebuilt bytes, with `pqcVerify` (`0x…0A01`) against the key `pqcKeyStatus` (`0x…0A02`) returns (`PqcAuth.requireSigned`);
3. the nonce moves by one;
4. each target is on the factory's list (`TargetNotAllowed`), and each call succeeds (`CallFailed`);
5. it emits `Executed(nonce, callsHash, submitter, calls)`.

| Attempt | Result |
|---|---|
| the same signature submitted twice | refused: the nonce moved, the signature no longer matches |
| calls changed after signing | refused: the calls hash differs |
| a signature from another key | refused by `pqcVerify` |
| a call to a contract outside Darwin | refused: `TargetNotAllowed` |
| a forged call sent on chain directly, skipping the relayer | refused by the account's `pqcVerify` |

Each of these is checked on the testnet by `ops/src/account-check.ts`, and in Foundry by `contracts/test/DarwinAccount.t.sol`.

## Deposits

Faucet fUSD sits in the QoreX wallet as a bank coin (denom `erc20:0x97143B…`). The account needs it in ERC-20 form, and QoreX refuses the conversion messages. So:

1. The user signs **one `MsgSend`** of fUSD to Darwin's relayer (`qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf`). QoreX displays it decoded. It needs a little QOR for gas, which the faucet pays.
2. The relayer reads that transaction from the chain and checks the sender, the recipient, the denom and the amount.
3. It converts exactly that amount onto the user's account in ERC-20 form: `MsgConvertCoin` with the account as receiver, memo `darwin deposit <txhash>`.

A deposit is credited once: before converting, the relayer reads its own memos back from the chain, so a restart or a second request cannot credit it twice.

The app does this on its own when a buy needs more fUSD than the account holds. The first buy is a deposit approval plus one signature; later buys are one signature.

## Withdrawals

Portfolio's Cash row has **Withdraw X fUSD to QoreX**. One signed message:

1. the account transfers the fUSD to the relayer (a signed `fUSD.transfer`, checked like any other message);
2. the relayer returns it to the user's QoreX wallet in bank form: `MsgConvertERC20` with the user as receiver, memo `darwin withdraw <evm hash>`.

These are two transactions, and a serverless call can be cut between them. `settleWithdrawals()` reads the factory's recent transactions back from the chain and completes every successful withdrawal without its memo. It runs before each withdrawal and in the daily cron. It was tested on chain with a withdrawal deliberately cut halfway.

## What the relayer can and cannot do

| | |
|---|---|
| Can | refuse or delay a message (the user then signs nothing new; nothing moves) |
| Can | hold fUSD for one transaction while it converts a deposit or a withdrawal: a custody of seconds |
| Cannot | change a call: the signature fails on chain |
| Cannot | replay a message: the nonce moved |
| Cannot | make the account call a contract outside Darwin's list |
| Cannot | move the account's shares or fUSD without a message the owner signed |

Trades themselves are non-custodial: the account enforces them. Deposits and withdrawals pass through the relayer for one transaction each way.

## Verify a trade yourself

The app's transaction page (`/tx/0x…`) shows **Signed by** with the owner's address and the signed summary, then re-verifies the owner's ML-DSA-87 signature **in your browser** with `@qorechain/pqc`:

1. decode `factory.execute(owner, calls, summary, deadline, pqSignature)` from the calldata;
2. the account is `factory.accountOf(owner)`; the nonce is the first indexed topic of its `Executed` event;
3. rebuild the text and prefix it with `qorechain-msg-v1|qorechain-diana|`;
4. read the owner's ML-DSA-87 key from the chain and verify the 4,627-byte signature;
5. check that the same signature **fails** for nonce + 1.

You can do the same by hand with any ML-DSA-87 library: every input is in the transaction and the event.

## If Darwin's relayer stops

The account accepts a signed message from any submitter, not only Darwin's relayer. A message to an allowed target (for example the basket's in-kind `redeem`, which needs no price) can be submitted by anyone able to send an EVM transaction on QoreChain. The app builds only trades and fUSD withdrawals; converting fUSD back to bank form for QoreX needs the relayer.

## Before DarwinAccounts

Shares bought before DarwinAccounts sit on the user's EVM twin, not on an account. Selling them still takes the original path: an EVM window opened in QoreX, a 24-hour grant to the relayer, and a signed intent executed through authz `MsgExec`. The trade card switches to it on its own for those holdings. See [QoreX & the Relayer](/chain/relayer#before-darwinaccounts).

## Found while building

- An EVM window can be opened for at most **17,280 blocks**, about 7 hours at 1.43 s blocks.
- `MsgConvertCoin` and `MsgConvertERC20` sent by the relayer need about **2M gas**. Below it the chain reports a misleading `failed to retrieve balance: EVM call unexpected error`.
- `MsgConvertERC20`'s `sender` must be a bech32 address (`qor1…`), not `0x`.

## Source

| What | Where |
|---|---|
| Contracts | `contracts/src/account/DarwinAccount.sol`, `DarwinAccountFactory.sol` |
| Unit tests | `contracts/test/DarwinAccount.t.sol` (11 tests) |
| Relayer | `app/src/server/accounts.ts` |
| Browser side | `app/src/lib/qore/account.ts`, `app/src/lib/qore/accountClient.ts` |
| Deployment | `ops/src/deploy-accounts.ts`; address in `deployments/diana.json` (`accountFactory`) |
| On-chain check | `ops/src/account-check.ts` (9 checks) |
