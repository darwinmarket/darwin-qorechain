# Ops Scripts

All in `ops/`, run with `npx tsx src/<script>.ts` or the npm scripts.

| Script | What |
|---|---|
| `status` | keys, windows (none open) and balances of every role |
| `window register <role>` | register a role's ML-DSA-87 key, with proof of possession |
| `window open <role> [blocks] [txs] [targets...]` | open an EVM window; with targets it is scoped. Needed only for a contract creation or a call carrying QOR value, at deployment |
| `window close <role>` | close it again: none of Darwin's accounts holds a window |
| `deploy`, `redeploy-v2` | idempotent deployments, recorded in `deployments/diana.json` |
| `oracle` | sign and relay a price round |
| `rebalance plan\|run\|weights <BASKET>` | the curator's planner, rebalances and target weights |
| `keeper` | local runs only: rounds, the weekly rebalance, every call hybrid-signed with no EVM window (in production the app does these on demand and by two daily/weekly crons, every transaction hybrid) |
| `relayer` | the original QoreX trade relayer (intents through authz); in production both relayers run in the app's server |
| `relay-setup` | a test account's one-time setup for the original path (window, grants) |
| `deploy-accounts` | deploy `DarwinAccountFactory` |
| `account-check` | the Darwin account path end to end through the app's API |
| `refill`, `mint-ftokens`, `source-qor`, `return-to-amm` | the reserve's inventory |
| `sweep <index>` | bring a faucet-funded account's tokens to the deployer |
| `cbom` | regenerate the cryptographic inventory |
| `e2e`, `battery` | the on-chain suites |
| `pq-audit [since]` | every transaction of the deployer and the four relayers since a date must carry a verified hybrid signature (`npx tsx src/pq-audit.ts`) |

Every admin action goes through `adminCall`: read the exact message the contract will check, sign it with the admin's ML-DSA-87 key, relay it.

Every contract write goes through `write()` (`src/evm.ts`): it simulates the call from the role's 0x address, so a refusal is named before sending, then sends it as a `MsgCrossVMCall` hybrid-signed with secp256k1 + ML-DSA-87. A cross-VM call meters the EVM work at about 2.5x its EVM gas (gas = max(1.2M, 2.8 x estimate + 400k), retried at x1.6 when out of gas). Only a call carrying QOR value and a contract creation still go out as EVM transactions, through a window opened for the deployment.
