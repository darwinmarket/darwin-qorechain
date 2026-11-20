# Verify It Yourself

You do not have to take the chain's word, or Darwin's. Each transaction page in the app re-verifies the signatures in your browser.

## A trade

A trade made through a [Darwin account](/chain/accounts) shows **Signed by** with the owner's address and the summary the owner signed. The page then verifies the owner's ML-DSA-87 signature with `@qorechain/pqc`, in your browser:

1. it decodes `factory.execute(owner, calls, summary, deadline, pqSignature)` from the calldata;
2. it reads the account's nonce for this trade from its `Executed` event;
3. it rebuilds the exact text, `qorechain-msg-v1|qorechain-diana|` + summary, account, nonce, deadline and the hash of the calls, as the account did on chain;
4. it verifies the 4,627-byte signature against the owner's registered key;
5. it checks that the same signature **fails** for nonce + 1.

For any native transaction, QoreSign's `inspectTransaction` (`@qorechain/qoresign`) re-reads the committed transaction and checks both its secp256k1 signature and its ML-DSA-87 layer against the keys the signer registered on chain, over the sign-bytes version the network verifies. A trade relayed on the path used before Darwin accounts shows the relayer's signature and the user it was relayed for.

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
