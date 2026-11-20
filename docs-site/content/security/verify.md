# Verify It Yourself

You do not have to take the chain's word, or Darwin's. Each transaction page in the app re-verifies the signatures in your browser.

## A trade

QoreSign's `inspectTransaction` (`@qorechain/qoresign`) re-reads the committed transaction and checks both its secp256k1 signature and its ML-DSA-87 layer against the keys the signer registered on chain, over the sign-bytes version the network verifies. A relayed trade shows the relayer's signature and the user it was relayed for.

## An oracle round

The page decodes `submit(timestamp, ids, prices, signature)` from the transaction's calldata, rebuilds the exact `roundMessage` the oracle checked, reads the reporter's key, and verifies the 4,627-byte ML-DSA-87 signature with `@qorechain/pqc`. It then checks that the same signature **fails** for the next round number.

## From the terminal

QoreChain's `qore` CLI gives a second opinion; Darwin's on-chain suite uses it:

```bash
npx @qorechain/qore-cli pq status <txhash> --json      # tier, layer count, verified
npx @qorechain/qore-cli pq status <qor1 or 0x> --json  # registered key, proof of possession, EVM window
```

## Raw data

Every transaction page links to the raw transaction on the testnet's REST API and to the QoreChain explorer (set it to Testnet once; it remembers).
