# Running Locally

Requirements: Foundry, Node 20+.

```bash
git clone --recursive https://github.com/darwinmarket/darwin-qorechain && cd darwin-qorechain

# contracts: unit, fuzz and invariant tests with mock precompiles
cd contracts && forge test && cd ..

# the app, against the live testnet deployment; its server runs the relayer
# (needs a testnet mnemonic in ~/.config/qorechain/testnet.mnemonic or QORE_MNEMONIC)
cd app && npm install && npm run build && npm start   # :3032, relayer at /api/relay
```

The mnemonic is a **testnet-only** secret, never committed. The app reads the chain through its own REST proxy (`/api/rest`): QoreChain's public REST endpoint sends no CORS headers.

## The documentation

```bash
cd docs-site && pnpm install && pnpm build && pnpm start   # :3048/qorechain
```
