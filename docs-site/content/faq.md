# FAQ

### Is this mainnet?

No. Darwin on QoreChain runs on the `qorechain-diana` testnet, with test tokens that have no value. Darwin's mainnet product runs on Miden. See [Status](/reference/status).

### Why one signature per trade, and no setup?

QoreX refuses to sign cross-VM calls and ERC-20 conversions, and cannot send EVM transactions. It does sign plain text. So each QoreX user gets a Darwin account, a contract controlled only by the user's registered ML-DSA-87 key: you sign the trade as text, Darwin's relayer submits it, and the account checks your signature with `pqcVerify` before it trades. No EVM window, no grant. See [Darwin Accounts](/chain/accounts).

### Why does my first buy ask for two approvals?

Faucet fUSD sits in your QoreX wallet as a bank coin; your account needs it in ERC-20 form. The first approval is one `MsgSend` of fUSD to Darwin's relayer, which converts exactly that amount onto your account. The second is the trade. Later buys are one signature while your account holds enough fUSD.

### Who pays the gas?

Darwin's relayer pays for your trades and withdrawals, and for converting your deposits. You pay a little QOR for the deposit `MsgSend` itself.

### Can Darwin take my basket tokens?

No. They sit on your Darwin account, which makes a call only when your ML-DSA-87 signature over that exact call verifies on chain. The relayer cannot change a call or replay one. During a deposit or a withdrawal, your fUSD passes through the relayer for one transaction (seconds). See [Risks](/risks#the-relayer).

### How do I get my fUSD back to QoreX?

Portfolio's Cash row: **Withdraw X fUSD to QoreX**, one signed message. The fUSD returns to your QoreX wallet in bank form.

### I bought before Darwin accounts. What changes?

Those shares sit on your account's EVM twin. You can sell them as before: an EVM window opened in QoreX and a 24-hour grant to the relayer. The trade card shows these steps only for those shares.

### What happens if Darwin's services stop?

Your basket tokens stay on your Darwin account, which accepts your signed messages from any submitter, not only Darwin's relayer. The basket's `redeem` is permissionless and needs no price, no curator and no admin: any holder can call it and receive their share of each component. Selling through the router needs fresh oracle prices; redeeming in kind does not.

### Are the prices real?

BTC and ETH are medians of four spot APIs. QOR is its market price (median of CoinGecko and MEXC). QWAKK is priced from its only market, the QWAKK/QOR pool of QoreChain's native AMM, as a 30-minute median times QOR's price. Every round is signed with ML-DSA-87. See [Oracle](/chain/oracle).

### Why do the QOR baskets hold fQOR and fQWAKK?

At QOR's market price, a faucet claim is worth about $0.33, and QWAKK's whole market about $330. Holding the real tokens capped Qore Ecosystem at about $66 a buy and Degen at about $36. The stand-ins track the same prices and let the baskets take real-size trades. See [Risks](/risks#qor-and-qwakk-are-stand-ins).

### Can I verify the signatures myself?

Yes. Each transaction page in the app re-verifies the signatures in your browser with `@qorechain/pqc`: a trade's ML-DSA-87 signature, rebuilding the exact text your account checked (and showing it fails for the next nonce), and an oracle round's, rebuilding the exact message the oracle checked. Hybrid transaction signatures are checked with QoreSign. See [Verify It Yourself](/security/verify).

### When do baskets rebalance?

Once a week, Mondays at 12:00 UTC, with trades the curator signs with ML-DSA-87. There is no drift-triggered rebalance in between. See [Rebalancing](/protocol/rebalancing).
