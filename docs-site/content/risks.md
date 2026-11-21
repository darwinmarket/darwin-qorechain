# Risks

Darwin on QoreChain is a testnet deployment. This page lists what can go wrong and what bounds it.

## Testnet

The tokens have no value and the network is a testnet: it can be reset, upgraded or paused by its operators. Nothing here is an offer of a financial product.

## The relayer

A QoreX user trades through a [Darwin account](/chain/accounts); Darwin's relayer submits the user's signed messages and pays the gas (see [QoreX & the Relayer](/chain/relayer)).

- **What it cannot do.** Change a call (the signature fails on chain), replay a message (the nonce moved), or make an account call a contract outside Darwin's router, baskets and fUSD. The list of allowed targets changes only with the admin's ML-DSA-87 signature.
- **Deposits and withdrawals.** The fUSD passes through the relayer for one transaction each way: the user's `MsgSend` to the relayer, converted onto the account; or the account's transfer to the relayer, converted back to the user's wallet. A custody of seconds. Each deposit is credited once (the relayer's memo, read back from the chain), and a withdrawal cut halfway is completed by `settleWithdrawals()` before the next withdrawal and in the daily cron.
- **What it can do.** Refuse or delay a message. Nothing moves without one.
- **If it stops.** Trades from QoreX stop, and fUSD cannot be converted back to bank form through Darwin. Holdings do not: the account accepts signed messages from any submitter, and redeeming in kind is permissionless.
- **Shares bought before Darwin accounts.** Selling them uses the original path: for the 24 hours of a grant, the relayer may send `MsgCrossVMCall` and `MsgConvertCoin` as the user. It acts only on intents whose signatures verify against the user's on-chain key, each used once and expiring within 10 minutes; the chain admits its EVM calls only through the user's own EVM window; the grant expires on its own and can be revoked.

## The oracle

A signature proves who published a price, not that it is right.

- **Inputs.** BTC and ETH: median of four spot APIs. QOR: median of CoinGecko and MEXC (its only real market is MEXC); without two of its three quotes, QOR and QWAKK sit out the round. QWAKK: its only market is a thin pool, so the oracle uses that pool's 30-minute median, not its spot.
- **Bounds.** A round can move a price at most 15%; rounds are at least 60 seconds apart; a feed appears at most once per round; readers refuse prices older than 30 minutes.
- **If rounds stop.** Buying and selling through the router stop once prices are stale. Redeeming in kind does not need a price.

## The reserve

The reserve trades at the oracle's price with a 0.30% spread. It holds a finite inventory: a buy above what it holds of a component is refused before signing. Arbitrage around price updates is possible within that spread; on testnet this is accepted.

## QOR and QWAKK are stand-ins

Qore Ecosystem and Degen first held WQOR (wrapped native QOR) and real QWAKK, bought on QoreChain's native AMM in swaps under its 5% price-impact cap. At QOR's market price a faucet claim is worth about $0.33 and QWAKK's whole market about $330, which capped those baskets at about $66 and $36 a buy. Holding more would have meant pumping a community token's only pool, which is also the pool the oracle reads.

So they hold **fQOR and fQWAKK**: Darwin test tokens priced by the same QOR and QWAKK feeds, minted only by the admin's ML-DSA-87 signature. The real QOR and QWAKK went back to the public pools. Their earlier versions are paused for new buys; their holders can always redeem in kind.

## Keys

A secp256k1 key of Darwin's alone can send nothing. Every Darwin transaction is a native `MsgCrossVMCall` hybrid-signed with secp256k1 + ML-DSA-87, and none of Darwin's accounts holds an EVM window, so the chain refuses an ECDSA-only transaction from them. The deployer holds the guardian role, which can only pause new mints; that pause too now needs a hybrid transaction. With both its keys, the deployer still cannot change a price, a weight, a trade or a parameter, or move the reserve's funds. A relayer, with both its keys, can submit to the account factory, where every call needs the owner's ML-DSA-87 signature.

## Known limitations

See [Known Limitations](/security/limitations) for what the review of 2026-11-20 found and what changed.
