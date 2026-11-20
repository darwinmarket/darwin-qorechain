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
| Hybrid ML-DSA-87 transactions | every transaction: user setup, the relayer's `MsgExec`, the keeper's rounds |
| PQC key registration with proof of possession | every role (deployer, reporter, curator, relayer) |
| ML-DSA-87 message signatures | every trade intent (QoreX `signArbitrary`) |
| EVM windows, scoped and per user | the keeper's window scoped to Darwin's contracts; each user's own window admits relayed trades |
| `pqcVerify`, `pqcKeyStatus` in Solidity | `PqcAuth`, the single call site |
| Authz grants | users to the relayer, 24 hours |
| Cross-VM calls (native to EVM) | every trade |
| Fest tokens fUSD, fETH, fBTC | three of the baskets' components and the quote asset |
| Native AMM pools | QWAKK's price (pool 6); the reserve's first QOR and QWAKK |

## What it looked like on mainnet

Darwin's mainnet product on Miden relies on private notes. QoreChain's angle is different: the threat is a future quantum computer, and the answer is post-quantum signatures checked by the chain itself.
