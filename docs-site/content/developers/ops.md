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
| `keeper` | local runs only: rounds, the weekly rebalance, the scoped window (in production the app does these on demand and by two daily/weekly crons) |
| `relayer` | the original QoreX trade relayer (intents through authz); in production both relayers run in the app's server |
| `relay-setup` | a test account's one-time setup for the original path (window, grants) |
| `deploy-accounts` | deploy `DarwinAccountFactory`; scope the relayer's window to it |
| `account-check` | the Darwin account path end to end through the app's API |
| `refill`, `mint-ftokens`, `source-qor`, `return-to-amm` | the reserve's inventory |
| `sweep <index>` | bring a faucet-funded account's tokens to the deployer |
| `cbom` | regenerate the cryptographic inventory |
| `e2e`, `battery` | the on-chain suites |

Every admin action goes through `adminCall`: read the exact message the contract will check, sign it with the admin's ML-DSA-87 key, relay it.
