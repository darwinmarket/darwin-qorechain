/**
 * Move Darwin to the v2 contracts (2026-11-20 review): the oracle takes each feed once per round,
 * in increasing order, with rounds at least 60 s apart; PqcAuth enforces ML-DSA-87; a basket is
 * seeded once; the reserve and baskets can be pointed at another oracle by the admin's ML-DSA-87
 * signature. The oracle address was immutable in v1, so the whole stack is redeployed.
 *
 *   1. retire v1: pause new mints on every v1 basket (admin ML-DSA-87 signature), redeem the
 *      deployer's v1 shares in kind, withdraw the v1 reserve's inventory (admin signature);
 *   2. deploy v2: oracle (feeds, token feeds, a first round), reserve (listings), the four baskets
 *      with their published weights, spread exemptions, the router;
 *   3. seed every basket at 10 USD per share, the shares minted to an unspendable address, so no
 *      classical key holds basket shares;
 *   4. record v1 in `stackHistory`, `basketHistory` and `routerHistory` (the app still decodes its
 *      transactions), and v2 as the live stack.
 *
 * Idempotent like deploy.ts: steps are recorded under "v2 ..." in deployments/diana.json.
 *   tsx src/redeploy-v2.ts      (stop the keeper; needs an unscoped deployer window)
 */
import { encodeAbiParameters, parseAbiParameters, maxUint256, type Address, type Hex } from "viem";
import { evmAccount } from "./accounts.js";
import { adminCall, artifact, deploy, loadDeployments, saveDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";
import { FEED, fetchPrices } from "./prices.js";
import { submitRound } from "./oracle.js";

/** Unspendable: nobody holds its key, classical or post-quantum. */
export const BURN = "0x000000000000000000000000000000000000dEaD" as Address;

const BASKETS = [
  { key: "BLUEDW", components: ["fBTC", "fETH"], weights: [7000, 3000], seedUsd: 100,
    description: "Bitcoin-led crypto majors: 70% BTC, 30% ETH." },
  { key: "BALDW", components: ["fBTC", "fETH", "fUSD"], weights: [3500, 3500, 3000], seedUsd: 100,
    description: "BTC and ETH with a 30% dollar cushion: 35% BTC, 35% ETH, 30% USD." },
  { key: "QOREDW", components: ["WQOR", "fETH", "QWAKK"], weights: [6000, 2500, 1500], seedUsd: 0.1,
    description: "QoreChain's ecosystem: 60% QOR, 25% ETH, 15% QWAKK." },
  { key: "DEGENDW", components: ["WQOR", "QWAKK"], weights: [3000, 7000], seedUsd: 0.1,
    description: "QoreChain's degen pair: 70% QWAKK, 30% QOR. High risk, for fun." },
] as const;

const NAV_PER_SHARE = 10;
const DECIMALS: Record<string, number> = { fUSD: 6, fETH: 18, fBTC: 8, WQOR: 18, QWAKK: 6 };
const enc = (types: string, values: unknown[]) => encodeAbiParameters(parseAbiParameters(types), values as any) as Hex;

const d = loadDeployments();
const admin = (await evmAccount("deployer")).evm as Address;
const reporter = (await evmAccount("reporter")).evm as Address;
const curator = (await evmAccount("curator")).evm as Address;
const erc20 = artifact("WQOR").abi;
const oracleAbi = artifact("DarwinOracle").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const basketAbi = artifact("DarwinBasket").abi;
const bal = async (token: Address, who: Address) =>
  (await publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [who] })) as bigint;

const step = async (name: string, fn: () => Promise<unknown>) => {
  if (d.steps[`v2 ${name}`]) return;
  console.log(`- v2 ${name}`);
  await fn();
  d.steps[`v2 ${name}`] = new Date().toISOString();
  saveDeployments(d);
};

if (d.stack === 2) {
  console.log("already on the v2 stack:", d.oracle, d.reserve, d.router);
  process.exit(0);
}

// ---- 1. retire v1 ----------------------------------------------------------------------------
d.v1 ??= { oracle: d.oracle, reserve: d.reserve, router: d.router, baskets: structuredClone(d.baskets) };
const v1 = d.v1 as { oracle: Address; reserve: Address; router: Address; baskets: Record<string, any> };

for (const [key, b] of Object.entries(v1.baskets)) {
  await step(`retire ${key} v1: pause mint`, () =>
    adminCall(b.address, basketAbi, "setMintPaused", "setMintPaused", enc("bool", [true]), [true]));
  await step(`retire ${key} v1: redeem the deployer's shares in kind`, async () => {
    const held = await bal(b.address, admin);
    if (held > 0n) await write("deployer", b.address, basketAbi, "redeem", [held, admin]);
    console.log(`  redeemed ${Number(held) / 1e18} ${key}`);
  });
}
for (const sym of ["fUSD", "fETH", "fBTC", "WQOR", "QWAKK"]) {
  await step(`retire reserve v1: withdraw ${sym}`, async () => {
    const t = d.tokens[sym] as Address;
    const amount = await bal(t, v1.reserve);
    if (amount > 0n) await adminCall(v1.reserve, reserveAbi, "withdraw", "withdraw", enc("address, uint256, address", [t, amount, admin]), [t, amount, admin]);
    console.log(`  v1 reserve -> deployer ${amount} ${sym}`);
  });
}

// ---- 2. deploy v2 ----------------------------------------------------------------------------
await step("deploy oracle", async () => {
  d.oracle = await deploy("deployer", "DarwinOracle", [admin, reporter, 1800, 1500]);
});
for (const [name, id] of Object.entries(FEED)) {
  await step(`oracle feed ${name}`, () =>
    adminCall(d.oracle, oracleAbi, "addFeed", "addFeed", enc("uint16, string", [id, `${name}/USD`]), [id, `${name}/USD`]));
}
const tokenFeed: Record<string, number> = { fUSD: FEED.USD, fETH: FEED.ETH, fBTC: FEED.BTC, WQOR: FEED.QOR, QWAKK: FEED.QWAKK };
for (const [sym, id] of Object.entries(tokenFeed)) {
  await step(`oracle token ${sym}`, () =>
    adminCall(d.oracle, oracleAbi, "setTokenFeed", "setTokenFeed", enc("address, uint16", [d.tokens[sym], id]), [d.tokens[sym], id]));
}
await step("oracle first round", () => submitRound(d.oracle));

await step("deploy reserve", async () => { d.reserve = await deploy("deployer", "DarwinReserve", [admin, d.oracle, 30]); });
for (const sym of ["fUSD", "fETH", "fBTC", "WQOR", "QWAKK"]) {
  await step(`reserve list ${sym}`, () =>
    adminCall(d.reserve, reserveAbi, "listToken", "listToken", enc("address, bool", [d.tokens[sym], true]), [d.tokens[sym], true]));
}

const live: Record<string, any> = {};
for (const b of BASKETS) {
  const prev = v1.baskets[b.key];
  await step(`deploy ${b.key}`, async () => {
    const address = await deploy("deployer", "DarwinBasket", [
      prev.name, b.key, b.description, d.oracle, d.reserve, admin, curator, admin, b.components.map((c) => d.tokens[c]), b.weights,
    ]);
    d.v2Baskets = { ...(d.v2Baskets ?? {}), [b.key]: {
      address, version: (prev.version ?? 1) + 1, stack: 2, name: prev.name, display: prev.display, description: b.description,
      components: [...b.components], weights: [...b.weights],
    } };
  });
  live[b.key] = d.v2Baskets[b.key];
  await step(`reserve exempt ${b.key}`, () =>
    adminCall(d.reserve, reserveAbi, "setSpreadExempt", "setSpreadExempt", enc("address, bool", [live[b.key].address, true]), [live[b.key].address, true]));
}
await step("deploy router", async () => { d.v2Router = await deploy("deployer", "DarwinRouter", [d.tokens.fUSD, d.reserve, 30, admin]); });

// ---- 3. seed, shares to the burn address -----------------------------------------------------
const p = await fetchPrices();
const usd: Record<string, number> = { fUSD: 1, fETH: p.ETH, fBTC: p.BTC, WQOR: p.QOR, QWAKK: p.QWAKK };
if (!Number.isFinite(p.QOR) || !Number.isFinite(p.QWAKK)) throw new Error("no QOR/QWAKK price right now; rerun in a minute");
for (const b of BASKETS) {
  const addr = live[b.key].address as Address;
  await step(`seed ${b.key}`, async () => {
    const amounts = b.components.map((c, i) => BigInt(Math.floor(((b.seedUsd * b.weights[i]) / 10_000 / usd[c]) * 10 ** DECIMALS[c])));
    const iq = (b.components as readonly string[]).indexOf("WQOR");
    if (iq >= 0) {
      const have = await bal(d.tokens.WQOR, admin);
      if (have < amounts[iq]) await write("deployer", d.tokens.WQOR, erc20, "deposit", [], amounts[iq] - have);
    }
    for (let i = 0; i < b.components.length; i++) {
      const t = d.tokens[b.components[i]] as Address;
      const have = await bal(t, admin);
      if (have < amounts[i]) throw new Error(`deployer holds ${have} ${b.components[i]}, needs ${amounts[i]}`);
      await write("deployer", t, erc20, "approve", [addr, maxUint256]);
    }
    const shares = BigInt(Math.round((b.seedUsd / NAV_PER_SHARE) * 1e6)) * 10n ** 12n;
    await write("deployer", addr, basketAbi, "seed", [amounts, shares, BURN]);
    live[b.key].seed = { amounts: amounts.map(String), shares: shares.toString(), to: BURN, prices: usd };
    console.log(`  ${b.key}: ${amounts.join(", ")} for ${Number(shares) / 1e18} shares, minted to ${BURN}`);
  });
}

// ---- 4. switch the record --------------------------------------------------------------------
await step("switch deployments to v2", async () => {
  d.basketHistory = [
    ...(d.basketHistory ?? []),
    ...Object.entries(v1.baskets).map(([key, b]) => ({ key, ...b, retired: new Date().toISOString(), reason: "v2 stack: fixed oracle, ML-DSA-87 algorithm check, one-shot seed" })),
  ];
  d.routerHistory = [...(d.routerHistory ?? []), { address: v1.router, retired: new Date().toISOString(), reason: "v2 stack" }];
  d.stackHistory = [...(d.stackHistory ?? []), { stack: 1, oracle: v1.oracle, reserve: v1.reserve, router: v1.router, retired: new Date().toISOString() }];
  d.baskets = live;
  d.router = d.v2Router;
  d.stack = 2;
  delete d.v2Baskets;
  delete d.v2Router;
  delete d.v1;
});
console.log("v2:", JSON.stringify({ oracle: d.oracle, reserve: d.reserve, router: d.router, baskets: Object.fromEntries(Object.entries(d.baskets).map(([k, v]: any) => [k, v.address])) }, null, 2));
