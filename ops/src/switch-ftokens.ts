/**
 * Move the QOR baskets to price-tracking test tokens, as the fest does for BTC and ETH.
 *
 * Darwin first held the real assets: WQOR (wrapped native QOR) and QWAKK, bought on QoreChain's
 * native AMM (`source-qor.ts`, `refill.ts qwakk`). At QOR's market price that capped Qore
 * Ecosystem at about $66 a buy and Degen at about $36: a faucet claim is worth $0.33 and QWAKK's
 * whole market about $330 (docs/PRICING.md). fQOR and fQWAKK track QOR and QWAKK through the same
 * oracle feeds, and only the admin's ML-DSA-87 signature can mint them.
 *
 *   1. deploy fQOR (18 decimals) and fQWAKK (6), map them to the QOR and QWAKK feeds, list them on
 *      the reserve, mint the reserve's inventory (INVENTORY_USD each);
 *   2. pause new mints on the WQOR/QWAKK versions of QOREDW and DEGENDW (holders keep redeeming in
 *      kind), deploy the new versions on fQOR/fQWAKK, seed them to 0xdEaD;
 *   3. record the old versions in basketHistory.
 *
 * Returning the real QOR and QWAKK to the public pools is `return-to-amm.ts`.
 *   tsx src/switch-ftokens.ts      (stop the keeper; needs an unscoped deployer window)
 */
import { encodeAbiParameters, parseAbiParameters, maxUint256, type Address, type Hex } from "viem";
import { evmAccount } from "./accounts.js";
import { adminCall, artifact, deploy, loadDeployments, saveDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";
import { FEED, fetchPrices } from "./prices.js";
/** Unspendable: nobody holds its key, classical or post-quantum (as in redeploy-v2.ts). */
const BURN = "0x000000000000000000000000000000000000dEaD" as Address;

const INVENTORY_USD = 20_000;
const SEED_USD = 10;
const NAV_PER_SHARE = 10;

const TEST_TOKENS = [
  { sym: "fQOR", name: "Darwin test QOR", decimals: 18, tracks: "QOR", feed: FEED.QOR },
  { sym: "fQWAKK", name: "Darwin test QWAKK", decimals: 6, tracks: "QWAKK", feed: FEED.QWAKK },
] as const;

const BASKETS = [
  { key: "QOREDW", components: ["fQOR", "fETH", "fQWAKK"], weights: [6000, 2500, 1500],
    description: "QoreChain's ecosystem: 60% QOR, 25% ETH, 15% QWAKK." },
  { key: "DEGENDW", components: ["fQOR", "fQWAKK"], weights: [3000, 7000],
    description: "QoreChain's degen pair: 70% QWAKK, 30% QOR. High risk, for fun." },
] as const;

const enc = (t: string, v: unknown[]) => encodeAbiParameters(parseAbiParameters(t), v as any) as Hex;
const d = loadDeployments();
const admin = (await evmAccount("deployer")).evm as Address;
const curator = (await evmAccount("curator")).evm as Address;
const tokenAbi = artifact("DarwinTestToken").abi;
const erc20 = artifact("WQOR").abi;
const oracleAbi = artifact("DarwinOracle").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const basketAbi = artifact("DarwinBasket").abi;

const step = async (name: string, fn: () => Promise<unknown>) => {
  if (d.steps[`f ${name}`]) return;
  console.log(`- f ${name}`);
  await fn();
  d.steps[`f ${name}`] = new Date().toISOString();
  saveDeployments(d);
};

const p = await fetchPrices();
if (!Number.isFinite(p.QOR) || !Number.isFinite(p.QWAKK)) throw new Error("no QOR/QWAKK price right now; rerun in a minute");
const usd: Record<string, number> = { fQOR: p.QOR, fQWAKK: p.QWAKK, fETH: p.ETH, fBTC: p.BTC, fUSD: 1 };
const DEC: Record<string, number> = { fQOR: 18, fQWAKK: 6, fETH: 18, fBTC: 8, fUSD: 6 };
const units = (sym: string, dollars: number) => BigInt(Math.floor((dollars / usd[sym]) * 10 ** DEC[sym]));

// ---- 1. the test tokens ------------------------------------------------------------------------
for (const t of TEST_TOKENS) {
  await step(`deploy ${t.sym}`, async () => {
    d.tokens[t.sym] = await deploy("deployer", "DarwinTestToken", [t.name, t.sym, t.decimals, t.tracks, admin]);
  });
  await step(`oracle token ${t.sym}`, () =>
    adminCall(d.oracle, oracleAbi, "setTokenFeed", "setTokenFeed", enc("address, uint16", [d.tokens[t.sym], t.feed]), [d.tokens[t.sym], t.feed]));
  await step(`reserve list ${t.sym}`, () =>
    adminCall(d.reserve, reserveAbi, "listToken", "listToken", enc("address, bool", [d.tokens[t.sym], true]), [d.tokens[t.sym], true]));
  await step(`mint ${t.sym} inventory`, async () => {
    const amount = units(t.sym, INVENTORY_USD);
    await adminCall(d.tokens[t.sym], tokenAbi, "mint", "mint", enc("address, uint256", [d.reserve, amount]), [d.reserve, amount]);
    console.log(`  reserve <- ${amount} ${t.sym} (~$${INVENTORY_USD})`);
  });
  await step(`mint ${t.sym} for the seeds`, async () => {
    const amount = units(t.sym, SEED_USD * 2);
    await adminCall(d.tokens[t.sym], tokenAbi, "mint", "mint", enc("address, uint256", [admin, amount]), [admin, amount]);
  });
}

// ---- 2. the new baskets ------------------------------------------------------------------------
for (const b of BASKETS) {
  const prev = d.baskets[b.key];
  if ((prev.components as string[]).includes(b.components[0])) continue; // already switched
  await step(`retire ${b.key} v${prev.version}: pause mint`, () =>
    adminCall(prev.address, basketAbi, "setMintPaused", "setMintPaused", enc("bool", [true]), [true]));
  await step(`deploy ${b.key}`, async () => {
    const address = await deploy("deployer", "DarwinBasket", [
      prev.name, b.key, b.description, d.oracle, d.reserve, admin, curator, admin, b.components.map((c) => d.tokens[c]), b.weights,
    ]);
    d.fBaskets = { ...(d.fBaskets ?? {}), [b.key]: {
      address, version: prev.version + 1, stack: 2, name: prev.name, display: prev.display, description: b.description,
      components: [...b.components], weights: [...b.weights],
    } };
  });
  const next = d.fBaskets[b.key];
  await step(`reserve exempt ${b.key}`, () =>
    adminCall(d.reserve, reserveAbi, "setSpreadExempt", "setSpreadExempt", enc("address, bool", [next.address, true]), [next.address, true]));
  await step(`seed ${b.key}`, async () => {
    const amounts = b.components.map((c, i) => units(c, (SEED_USD * b.weights[i]) / 10_000));
    for (let i = 0; i < b.components.length; i++) {
      const t = d.tokens[b.components[i]] as Address;
      const have = (await publicClient.readContract({ address: t, abi: erc20, functionName: "balanceOf", args: [admin] })) as bigint;
      if (have < amounts[i]) {
        await adminCall(d.reserve, reserveAbi, "withdraw", "withdraw", enc("address, uint256, address", [t, amounts[i] - have, admin]), [t, amounts[i] - have, admin]);
      }
      await write("deployer", t, erc20, "approve", [next.address, maxUint256]);
    }
    const shares = BigInt(Math.round((SEED_USD / NAV_PER_SHARE) * 1e6)) * 10n ** 12n;
    await write("deployer", next.address, basketAbi, "seed", [amounts, shares, BURN]);
    next.seed = { amounts: amounts.map(String), shares: shares.toString(), to: BURN, prices: usd };
    console.log(`  ${b.key}: seeded ${amounts.join(", ")} for ${Number(shares) / 1e18} shares, minted to ${BURN}`);
  });
  await step(`switch ${b.key}`, async () => {
    d.basketHistory = [...(d.basketHistory ?? []), {
      key: b.key, ...prev, retired: new Date().toISOString(),
      reason: "real WQOR/QWAKK capped buys at tens of dollars; moved to fQOR/fQWAKK, which track the same prices",
    }];
    d.baskets[b.key] = next;
    delete d.fBaskets[b.key];
  });
}
if (d.fBaskets && !Object.keys(d.fBaskets).length) delete d.fBaskets;
saveDeployments(d);
console.log("baskets:", JSON.stringify(Object.fromEntries(Object.entries(d.baskets).map(([k, v]: any) => [k, `${v.address} ${v.components.join("/")}`])), null, 2));
