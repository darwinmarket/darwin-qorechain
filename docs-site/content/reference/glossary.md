# Glossary

| Term | Meaning |
|---|---|
| **Basket** | A set of assets bought and sold as one ERC-20 token |
| **BLUEdw, BALdw, QOREdw, DEGENdw** | The four baskets' tokens (on chain: BLUEDW, BALDW, QOREDW, DEGENDW) |
| **Reserve** | `DarwinReserve`, which sells and buys components at oracle prices minus a spread |
| **Router** | `DarwinRouter`, which buys or sells a whole basket for fUSD in one call |
| **Reporter** | The key that signs oracle rounds |
| **Curator** | The key that signs target weights and rebalances |
| **Admin** | The key whose ML-DSA-87 signature authorises every admin action |
| **Guardian** | The one classical power: pause new mints |
| **Darwin account** | A user's contract account (`DarwinAccount`), controlled only by the ML-DSA-87 key the user registered; it checks each signed message with `pqcVerify` |
| **Relayer** | Darwin's service that submits QoreX users' signed messages to their Darwin accounts and pays the gas; it also converts fUSD deposits and withdrawals |
| **Intent** | Before Darwin accounts: a JSON trade request signed with QoreX's `signArbitrary`, executed through authz; still used to sell shares bought then |
| **ML-DSA-87** | The NIST post-quantum signature standard (FIPS 204) QoreChain uses, category 5 |
| **Hybrid signature** | secp256k1 + ML-DSA-87 on the same transaction |
| **Proof of possession** | Proof, at registration, that the account holds its ML-DSA-87 secret key |
| **EVM window** | A bounded authorisation for an account's EVM transactions; scoped when it lists allowed targets |
| **Authz grant** | Permission, with an expiry, for another account to send a message type as you |
| **MsgExec** | The authz message that carries messages sent on someone's behalf |
| **Cross-VM call** | `MsgCrossVMCall`: a native transaction calling an EVM contract |
| **fUSD, fETH, fBTC** | The fest's test tokens |
| **fQOR, fQWAKK** | Darwin's test tokens priced by the QOR and QWAKK feeds |
| **NAV** | The value of a basket's holdings at oracle prices; shown as an index, base 100 at launch |
| **CBOM** | Cryptographic bill of materials (CycloneDX) |
