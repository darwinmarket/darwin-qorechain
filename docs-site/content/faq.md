# FAQ

### Is this mainnet?

No. Darwin on QoreChain runs on the `qorechain-diana` testnet, with test tokens that have no value. Darwin's mainnet product runs on Miden. See [Status](/reference/status).

### Why one signature per trade, plus a setup?

QoreX refuses to sign cross-VM calls and ERC-20 conversions, the messages Darwin's trades are made of. It does sign authz grants and message signatures. So you grant Darwin's relayer the right to send those two message types as you for 24 hours, inside your own EVM window, and each trade is an intent you sign. See [QoreX & the Relayer](/chain/relayer).

### Who pays the gas?

Darwin's relayer pays for the trades it executes. You pay for your own setup transactions (the EVM window and the grant).

### Can Darwin take my basket tokens?

Darwin has no key that moves them. During your grant, the relayer can send cross-VM calls as you; it acts only on intents you signed, and you can revoke the grant at any time. See [Risks](/risks).

### What happens if Darwin's services stop?

Your basket tokens stay on your account. The basket's `redeem` is permissionless and needs no price, no curator and no admin: any holder can call it and receive their share of each component. Selling through the router needs fresh oracle prices; redeeming in kind does not.

### Are the prices real?

BTC and ETH are medians of four spot APIs. QOR is its market price (median of CoinGecko and MEXC). QWAKK is priced from its only market, the QWAKK/QOR pool of QoreChain's native AMM, as a 30-minute median times QOR's price. Every round is signed with ML-DSA-87. See [Oracle](/chain/oracle).

### Why do the QOR baskets hold fQOR and fQWAKK?

At QOR's market price, a faucet claim is worth about $0.33, and QWAKK's whole market about $330. Holding the real tokens capped Qore Ecosystem at about $66 a buy and Degen at about $36. The stand-ins track the same prices and let the baskets take real-size trades. See [Risks](/risks#qor-and-qwakk-are-stand-ins).

### Can I verify the signatures myself?

Yes. Each transaction page in the app re-verifies the signatures in your browser: a trade's hybrid signature with QoreSign, and an oracle round's ML-DSA-87 signature with `@qorechain/pqc`, rebuilding the exact message the oracle checks. See [Verify It Yourself](/security/verify).

### When do baskets rebalance?

Once a week, Mondays at 12:00 UTC, with trades the curator signs with ML-DSA-87. There is no drift-triggered rebalance in between. See [Rebalancing](/protocol/rebalancing).
