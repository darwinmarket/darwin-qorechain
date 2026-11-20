# Darwin's cryptographic inventory (CBOM)

Generated with [QoreScan](https://github.com/qorechain/qorescan) (`@qorechain/qorescan`), a
CycloneDX 1.6 CBOM of what Darwin's deployment depends on: the Solidity contracts, the four
accounts that run it (treasury, deployer/admin, oracle reporter, curator) read live from
qorechain-diana, and the two TLS endpoints the app and the keeper talk to.

| File | What |
|---|---|
| `darwin.cbom.json` | the CBOM (31 components) |
| `dora-report.md` | the inventory mapped to DORA RTS 2024/1774 art. 6 (EU financial-sector ICT rules) |
| `crypto-agility.md` | QoreScan's crypto-agility template, filled from the CBOM |

Regenerate: `cd ops && npm run cbom`.

## Reading it

| Classification | Where it shows up in Darwin | Why it is there, and what covers it |
|---|---|---|
| **ML-DSA-87** (FIPS 204, category 5) | every account's registered key; `pqcVerify` / `pqcKeyStatus` in `PqcAuth.sol` | the security of every Darwin power: oracle rounds, admin actions, curator rebalances, and the user's own trades |
| **X25519MLKEM768** (hybrid, FIPS 203) | TLS 1.3 key exchange of `api-testnet.qore.host` and `evm-testnet.qore.host` | QoreChain's endpoints already negotiate a post-quantum key exchange |
| ECDSA secp256k1 | the classical half of each hybrid native tx; EVM tx signatures | never alone: native txs carry a required ML-DSA-87 layer; an EVM tx is admitted only by an EVM window opened from that hybrid lane; every privileged call also checks an ML-DSA-87 signature inside the contract |
| Ed25519 | validators' consensus keys | chain level, outside Darwin |
| ECDSA P-256/P-384, RSA | the web PKI certificates of the endpoints | outside Darwin |
| Keccak-256, SHA-256, AES-128-GCM, HKDF | hashes in the contracts' signed messages; TLS | symmetric: Grover's algorithm halves their margin, which stays at 128 bits or more |

QoreScan output is an inventory aid, not a certification or a legal opinion.
