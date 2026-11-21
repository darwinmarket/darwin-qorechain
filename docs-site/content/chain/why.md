# Why QoreChain

QoreChain is a chain whose transactions are **hybrid-signed**: every native transaction carries a secp256k1 signature and an ML-DSA-87 signature, and the network requires both. It exposes ML-DSA-87 to EVM contracts through two precompiles:

| Precompile | Address | What it does |
|---|---|---|
| `pqcVerify(pubkey, signature, message)` | `0x...0A01` | verifies an ML-DSA-87 signature (2,592-byte key, 4,627-byte signature) |
| `pqcKeyStatus(account)` | `0x...0A02` | the ML-DSA-87 key an account registered, its algorithm and whether it proved possession |

That is what lets Darwin put its three dangerous keys (prices, rebalances, admin) behind ML-DSA-87 **inside its contracts**, not only at the transaction layer.

## What Darwin uses

| Feature | Where in Darwin |
|---|---|
| Hybrid ML-DSA-87 transactions | every transaction Darwin sends: the keeper's rounds and rebalances, the relayers' executions and conversions; and the users' fUSD deposits |
| PQC key registration with proof of possession | every role (deployer, reporter, curator, relayer) |
| ML-DSA-87 message signatures | every trade and withdrawal (QoreX `signArbitrary`), verified on chain by the user's Darwin account |
| EVM windows | none open on Darwin's accounts, so the chain refuses an ECDSA-only transaction from them; opened only at deployment (contract creation) and by users of the original sell path |
| `pqcVerify`, `pqcKeyStatus` in Solidity | `PqcAuth`, the single call site, used by the oracle, baskets, admin and every user's Darwin account |
| Authz grants | only for selling shares bought before Darwin accounts (users to the relayer, 24 hours) |
| Cross-VM calls (native to EVM) | every Darwin contract call: rounds, rebalances, account executions; tests' trades from the native lane; sales of shares bought before Darwin accounts |
| Fest tokens fUSD, fETH, fBTC | three of the baskets' components and the quote asset; fUSD moved between bank and ERC-20 form with `MsgConvertCoin` / `MsgConvertERC20` |
| Native AMM pools | QWAKK's price (pool 6); the reserve's first QOR and QWAKK |

## What it looked like on mainnet

Darwin's mainnet product on Miden relies on private notes. QoreChain's angle is different: the threat is a future quantum computer, and the answer is post-quantum signatures checked by the chain itself.
