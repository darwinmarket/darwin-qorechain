# Cryptographic Inventory

Darwin keeps a CycloneDX 1.6 CBOM of its deployment, generated with [QoreScan](https://github.com/qorechain/qorescan): the Solidity contracts, the accounts that run Darwin read live from the testnet, and the TLS endpoints the app and services talk to. Files in `docs/cbom/`; regenerate with `npm run cbom` in `ops/`.

| Classification | Where it shows up | Why, and what covers it |
|---|---|---|
| **ML-DSA-87** (FIPS 204) | every account's registered key; `pqcVerify` / `pqcKeyStatus` in `PqcAuth` | every Darwin power, and every trade |
| **X25519MLKEM768** (hybrid, FIPS 203) | TLS 1.3 key exchange of QoreChain's API endpoints | the endpoints already negotiate a post-quantum key exchange |
| ECDSA secp256k1 | the classical half of each hybrid transaction; EVM transaction signatures | never alone: native transactions carry a required ML-DSA-87 layer; EVM transactions are admitted only through windows opened from that lane; every privileged call also checks ML-DSA-87 in the contract |
| Ed25519 | validators' consensus keys | chain level, outside Darwin |
| ECDSA P-256 / P-384, RSA | web PKI certificates of the endpoints | outside Darwin |
| Keccak-256, SHA-256, AES-128-GCM, HKDF | hashes in signed messages; TLS | symmetric: Grover halves their margin, which stays at 128 bits or more |

QoreScan also maps the inventory to DORA (EU financial-sector ICT rules, `docs/cbom/dora-report.md`) and fills a crypto-agility template. Its output is an inventory aid, not a certification.
