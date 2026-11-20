# Hybrid Signing & Keys

## Two signatures on every transaction

A QoreChain native transaction carries a secp256k1 signature and an ML-DSA-87 signature (FIPS 204) in a tx-body extension. The network requires the ML-DSA-87 layer. The chain records the check as `pqc_hybrid_verify status=verified`.

## Registering a key

An account registers its ML-DSA-87 public key with `MsgRegisterPQCKey`, with a **proof of possession**. It is the one transaction allowed without the ML-DSA-87 layer. QoreX does this on its own with the account's first transaction; Darwin's roles were registered by `ops/src/window.ts register`.

The key is derived from the account's mnemonic and address, so it needs no separate backup.

## Darwin's roles

| Role | Address | Key |
|---|---|---|
| Admin, guardian, fee recipient, keeper relayer | `0x20807accBc9693B40a17F2EC73a07e6dc77d3f85` | eth_secp256k1 + ML-DSA-87 |
| Oracle reporter | `0x6A286f3D805c2bE0d653Ec86c1CaD9598373CB2e` | ML-DSA-87 signs rounds |
| Curator | `0xe0BBCcb71b761041B3f3038b3E6cdb392CfbE373` | ML-DSA-87 signs weights and rebalances |
| Trade relayer | `qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf` | secp256k1 + ML-DSA-87; submits users' signed messages to the account factory, converts deposits and withdrawals |

All registered with proof of possession; `PqcAuth` refuses a key without it, and refuses a key whose algorithm is not ML-DSA-87 (algorithm id 1).

## Inside the contracts

`PqcAuth.requireSigned(account, message, signature)` reads the account's key with `pqcKeyStatus`, refuses an unregistered key, a key without proof of possession or a key of another algorithm, then checks the signature with `pqcVerify`. Every privileged path in Darwin goes through it. See [Every Privileged Action](/security/model).

Signatures are domain-separated (tag, chain id, contract, nonce, deadline), and each contract exposes the exact bytes to sign (`roundMessage`, `rebalanceMessage`, `weightsMessage`, `adminMessage`), so off-chain signers never re-implement the encoding.

A user's trade is checked the same way: the user's [Darwin account](/chain/accounts) rebuilds the text QoreX signed and calls `PqcAuth.requireSigned` against the user's own registered key.
