# Running Locally

Requirements: Foundry, Node 20+.

```bash
git clone --recursive https://github.com/darwinmarket/darwin-qorechain && cd darwin-qorechain

# contracts: unit, fuzz and invariant tests with mock precompiles
cd contracts && forge test && cd ..

# the trade relayer (needs a testnet mnemonic in ~/.config/qorechain/testnet.mnemonic or QORE_MNEMONIC)
cd ops && npm install && npm run relayer &      # :3046

# the app, against the live testnet deployment
cd ../app && npm install && npm run build && npm start   # :3032, proxies /api/relay to :3046
```

The mnemonic is a **testnet-only** secret, never committed. The app reads the chain through its own REST proxy (`/api/rest`): QoreChain's public REST endpoint sends no CORS headers.

## The documentation

```bash
cd docs-site && pnpm install && pnpm build && pnpm start   # :3048/qorechain
```
