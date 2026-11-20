# Ops Scripts

All in `ops/`, run with `npx tsx src/<script>.ts` or the npm scripts.

| Script | What |
|---|---|
| `status` | keys, windows and balances of every role |
| `window register <role>` | register a role's ML-DSA-87 key, with proof of possession |
| `window open <role> [blocks] [txs] [targets...]` | open an EVM window; with targets it is scoped |
| `deploy`, `redeploy-v2` | idempotent deployments, recorded in `deployments/diana.json` |
| `oracle` | sign and relay a price round |
| `rebalance plan\|run\|weights <BASKET>` | the curator's planner, rebalances and target weights |
| `keeper` | rounds, the weekly rebalance, the scoped window |
| `relayer` | the QoreX trade relayer |
| `relay-setup` | a test account's one-time setup (window, grants) |
| `refill`, `mint-ftokens`, `source-qor`, `return-to-amm` | the reserve's inventory |
| `sweep <index>` | bring a faucet-funded account's tokens to the deployer |
| `cbom` | regenerate the cryptographic inventory |
| `e2e`, `battery` | the on-chain suites |

Every admin action goes through `adminCall`: read the exact message the contract will check, sign it with the admin's ML-DSA-87 key, relay it.
