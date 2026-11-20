# Status

What is live, what is not, and what is known to be imperfect. Accurate as of **20 November 2026**, on the QoreChain testnet.

## Live

| Thing | State |
|---|---|
| Network | `qorechain-diana` testnet. Test tokens, no value |
| Baskets | Blue Chip, Balanced, Qore Ecosystem, Degen, on the v2 stack |
| Buy and sell | From QoreX: one signed intent per trade, executed by Darwin's relayer; setup once (EVM window, 24-hour grant) |
| Pricing | ML-DSA-87 signed oracle rounds: BTC/ETH spot median, QOR market price, QWAKK pool median |
| Rebalancing | Weekly, Mondays 12:00 UTC, curator-signed |
| Fees | 0.30% on buys and sells, plus the reserve's 0.30% spread |
| Verification | In-browser re-verification of trades (QoreSign) and oracle rounds (`@qorechain/pqc`) |

## Not live

| Thing | Why |
|---|---|
| Mainnet | QoreChain's PQC precompiles are on the testnet |
| A redeem-in-kind button | The contract allows it for anyone; the app exits by selling for fUSD |
| QoreX signing cross-VM calls directly | QoreX does not display them today; the relayer covers it |

## Audit

The two-stage QCAI audit runs on QoreChain's dashboard; the design map and the review's findings are in `docs/AUDIT.md` and on [Known Limitations](/security/limitations).
