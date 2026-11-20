# Repository

[`darwinmarket/darwin-qorechain`](https://github.com/darwinmarket/darwin-qorechain), MIT.

```
contracts/   Solidity 0.8.28, Foundry, OpenZeppelin
  pqc/PqcAuth.sol       ML-DSA-87 check against the on-chain key registry
  pqc/PqcAdmin.sol      admin powers usable only with a post-quantum signature
  DarwinOracle.sol      price rounds signed by the reporter, breaker, spacing, staleness
  DarwinReserve.sol     oracle-priced inventory market maker
  DarwinBasket.sol      ERC-20 share, in-kind mint/redeem, NAV, curator-signed rebalances
  DarwinRouter.sol      buy or sell a whole basket with fUSD in one call
  DarwinTestToken.sol   fQOR, fQWAKK: price-tracking stand-ins, ML-DSA-87 minting
  WQOR.sol              wrapped QOR
  account/              DarwinAccount, DarwinAccountFactory: users' accounts, ML-DSA-87 only
ops/         TypeScript, QoreChain SDK, viem
  relayer.ts            the original relayer: signed intents through authz (shares bought before accounts)
  deploy-accounts.ts    deploys the account factory; scopes the relayer's window to it
  account-check.ts      the account path end to end on the testnet, through the app's API
  keeper.ts             local keeper; in production app/src/server does it on demand
  prices.ts             BTC/ETH spot median, QOR market price, QWAKK pool median
  oracle.ts, rebalance.ts, window.ts, deploy.ts, redeploy-v2.ts, ...
app/         Next.js: Darwin's mainnet front on QoreChain
  src/lib/qore/         chain reads, QoreX, the account and relayer clients, in-browser verification
  src/server/           keys, keeper on demand, accounts.ts (the account relayer), relayer.ts (original)
  src/app/api/          REST proxy, relayer proxy, trades summary, price history
docs/        audit map, pricing, testing, CBOM, submission, E2E reports
docs-site/   this documentation
deployments/diana.json  every address, role, seed and retired version
```

## Kits

| Kit | Used for |
|---|---|
| QoreChain SDK (`@qorechain/sdk`, `@qorechain/evm`) | key derivation, hybrid signing, PQC registration, EVM windows |
| QoreSign (`@qorechain/qoresign`) | both halves of every signed message checked in the relayer; in-browser checks of committed transactions |
| qorechain-pqc (`@qorechain/pqc`) | in-browser verification of account trades and oracle rounds |
| QoreChain React (`@qorechain/react`) | the PQC key badge |
| Wallet adapter (`@qorechain/wallet-adapter`) | QoreX capability checks and requests |
| QoreX integrations (`@qorechain/qorex-wallet-mock`) | browser end-to-end tests |
| MCP + qore CLI (`@qorechain/mcp`, `@qorechain/qore-cli`) | second opinion in the on-chain suite; `.mcp.json` for agents |
| QoreScan (`@qorechain/qorescan`) | the CBOM |
