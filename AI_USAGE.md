# How AI was used

Darwin on QoreChain was built during the fest by the Darwin team with an AI coding agent (Claude
Code) working in the terminal: reading the chain, writing the code, running it against
qorechain-diana, and committing step by step. This file says what the agent did, what the humans
did, and, as honestly, where the agent was wrong and how it was caught.

## The loop

Every change went through the same loop, and "done" meant the last step passed:

1. **Read the chain first.** Before designing anything the agent scanned the testnet: every token,
   AMM pool and active contract; the precompiles' exact ABI (`pqcVerify` takes a 2,592-byte key and
   a 4,627-byte signature); which lanes QoreX can sign (native yes, EVM not yet).
2. **Write it**, with tests next to it (Foundry for the contracts, `node --test` for the ops logic).
3. **Run it on the testnet** with real keys and real ML-DSA-87 signatures, not mocks: deploy,
   sign, relay, read back.
4. **Check it from the outside**: the on-chain suite (`ops/src/e2e.ts`), the browser suite with the
   QoreX test double (`app/e2e/suite.mjs`), screenshots of the real UI, and a second opinion from
   QoreChain's own `qore` CLI.
5. **Commit small**, with a message that says why.

## What the agent generated

- `contracts/`: all seven contracts and the 83 unit, fuzz and invariant tests.
- `ops/`: key derivation and registration, hybrid native signing, EVM windows, deployment and
  migrations, the oracle, the curator's planner, the keeper, the AMM and refill tools, the on-chain
  E2E suite and the multi-user battery.
- `app/`: the QoreChain data layer (`lib/qore`, `lib/darwin`), the trade panel, portfolio, activity,
  the Security tab, the transaction page and its in-browser ML-DSA-87 verification, the API routes
  (REST proxy, price history replayed from the chain), and the browser suite.
- `docs/`: the audit map, testing, pricing, the CBOM reading guide, the submission text.

## What the humans did

- **Darwin itself**: the product, the mainnet protocol, and the front this app forks.
- **Every product decision**, often overruling the agent:
  - users only ever hold fUSD and the basket token, and exit by selling it; the agent's in-kind
    withdrawal screen was dropped (the contract keeps it as an invisible backstop);
  - the reserve is run by the team, not by an auto-refill bot;
  - rebalances happen **only on Mondays at 12:00 UTC**: the team removed the agent's
    "emergency rebalance on 5% drift" guard;
  - the four baskets and their weights (Blue Chip 70/30, Degen 70% QWAKK), the naming (BLUEDW on
    chain, BLUEdw on screen), the four tabs, and that the front must be the mainnet front, exactly;
  - "is that really QWAKK's price? check it thoroughly", which led to the repricing below.
  - real QOR and QWAKK first, then, once the agent showed the testnet's real supply capped the QOR
    baskets at tens of dollars, price-tracking stand-ins (fQOR, fQWAKK) with the real assets given
    back to the public pools.
- **The testnet funds and keys** (faucet claims need the dashboard sign-in), the QCAI audit runs,
  the video and the submission.

## Where the agent was wrong, and how it was caught

| What went wrong | Caught by | Fix |
|---|---|---|
| A small buy of an 8-decimal leg (fBTC) reverted: the router's linear quote undershot after rounding | the multi-user battery | router v2 checks the exact cost of the quoted shares; regression fuzz test `RouterRoundingTest` |
| QOR priced from two testnet AMM pools that disagree, ~10x above its market | the team asking whether QWAKK's price was real; the agent compared CoinGecko, MEXC and the pools | QOR at market (CoinGecko + MEXC), breaker widened and restored with ML-DSA-87 admin signatures, QOR baskets reseeded at index 100 |
| QWAKK's chart history drawn back to August from today's ratio: two baskets looked identical | the team ("is it normal they're so correlated?"); the agent then read all 58 swaps of the pool | history replayed swap by swap from the pool's opening on Nov 18; a test asserts nothing is drawn before |
| The curator E2E check reset Blue Chip to 50/50 after it had moved to 70/30 | reading the E2E output line by line | the check restores the basket's own targets in a `finally`; a new check pins every basket to its published weights |
| A failed guardian check left a basket paused | the next suite run | the check always unpauses; every suite first verifies no basket is paused |
| Keeper demo trades sold the seed shares | on-chain balances | demo trades moved to the treasury, then disabled |
| Hero copy kept Miden's "held privately in your wallet", untrue on QoreChain | reviewing the cover image before submission | copy now states what is true here |
| Every trade path was tested with the QoreX test double, which signs anything; the real QoreX refuses cross-VM calls and ERC-20 conversions | the team trading from the real QoreX extension | a diagnostic page mapped what QoreX signs; trades became ML-DSA-87 signed intents executed by a relayer through authz, verified with the real wallet; later, DarwinAccounts (an account contract checking the user's ML-DSA-87 signature with `pqcVerify`) removed the EVM window and the grant for new trades |

## Tools and context

- Claude Code in the terminal, with shell, git, Foundry, Node and Playwright.
- The QoreChain docs, the fest's kit READMEs (installed and read from npm), and the testnet itself.
- `.mcp.json` registers QoreChain's MCP server, so an agent working on this repo reads blocks,
  transactions, PQ status and contract state directly.
- Commits are authored by the team; the agent proposes, the team decides what ships.
