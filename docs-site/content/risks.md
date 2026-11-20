# Risks

Darwin on QoreChain is a testnet deployment. This page lists what can go wrong and what bounds it.

## Testnet

The tokens have no value and the network is a testnet: it can be reset, upgraded or paused by its operators. Nothing here is an offer of a financial product.

## The relayer

A QoreX user trades through Darwin's relayer (see [QoreX & the Relayer](/chain/relayer)).

- **What it can do.** For the 24 hours of the grant, send `MsgCrossVMCall` and `MsgConvertCoin` as the user. The grant is generic for those two types: technically, the relayer could call any EVM contract as the user while it lasts.
- **What bounds it.** It acts only on intents whose secp256k1 and ML-DSA-87 signatures verify against the user's on-chain key, each used once and expiring within 10 minutes. The chain admits its EVM calls only through the user's own EVM window (transaction count, value, expiry). The grant expires on its own and can be revoked. Every action is a public `MsgExec` naming the user as sender.
- **If it stops.** Trades from QoreX stop. Holdings do not: redeeming in kind is permissionless.

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

The deployer's secp256k1 key relays transactions and holds the guardian role, which can only pause new mints. It cannot change a price, a weight, a trade or a parameter, or move the reserve's funds. Each EVM window also caps the value it admits.

## Known limitations

See [Known Limitations](/security/limitations) for what the review of 2026-11-20 found and what changed.
