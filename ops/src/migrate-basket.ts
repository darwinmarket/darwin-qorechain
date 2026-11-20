/**
 * Replace a basket with a new version when its components change, or to reseed it (a basket's
 * components are fixed at deployment; weights alone are changed by the curator instead):
 *   1. pause minting on the current version (guardian); its holders can still sell,
 *   2. take the seed from the reserve with an ML-DSA-87 signed admin withdrawal,
 *   3. deploy the new version, exempt it from the reserve spread, seed it at 10 USD a share,
 *   4. record the old version in basketHistory and the new one under the same key.
 *
 * QOREDW: v1 40% QOR / 30% ETH / 30% BTC; v2 (2026-11-20) 40/20/20/20 with QWAKK; v3 50% QOR /
 * 25% ETH / 25% QWAKK; v4 60% QOR / 25% ETH / 15% QWAKK, reseeded at QOR's market price.
 * DEGENDW: v1 50% QOR / 50% QWAKK; v2 30% QOR / 70% QWAKK, reseeded at QOR's market price.
 *
 *   tsx src/migrate-basket.ts <KEY> <version> <tokens,comma> <weights,comma> <seedUsd> "<description>"
 *   (needs an unscoped deployer window; stop the keeper first)
 */
import { encodeAbiParameters, maxUint256, parseAbiParameters, type Address, type Hex } from "viem";
import { evmAccount } from "./accounts.js";
import { adminCall, artifact, deploy, loadDeployments, saveDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";
import { fetchPrices } from "./prices.js";

const d = loadDeployments();
const basketAbi = artifact("DarwinBasket").abi;
const reserveAbi = artifact("DarwinReserve").abi;
const erc20 = artifact("WQOR").abi;
const enc = (t: string, v: unknown[]) => encodeAbiParameters(parseAbiParameters(t), v as any) as Hex;
const admin = (await evmAccount("deployer")).evm as Address;
const curator = (await evmAccount("curator")).evm as Address;
d.steps ??= {};
const step = async (name: string, fn: () => Promise<unknown>) => {
  if (d.steps[name]) return;
  console.log(`- ${name}`);
  await fn();
  d.steps[name] = new Date().toISOString();
  saveDeployments(d);
};

const [KEY, versionArg, tokensArg, weightsArg, seedArg, DESCRIPTION] = process.argv.slice(2);
if (!KEY || !d.baskets[KEY] || !DESCRIPTION) throw new Error("usage: migrate-basket.ts <KEY> <version> <tokens> <weights> <seedUsd> <description>");
const VERSION = Number(versionArg);
const COMPONENTS = tokensArg.split(",");
const WEIGHTS = weightsArg.split(",").map(Number);
if (WEIGHTS.reduce((a, b) => a + b, 0) !== 10_000 || WEIGHTS.length !== COMPONENTS.length) throw new Error("weights must sum to 10000");
const DEC: Record<string, number> = { WQOR: 18, fBTC: 8, fETH: 18, QWAKK: 6, fUSD: 6 };
const SEED_USD = Number(seedArg);
const prev = d.baskets[KEY];
const prevVersion: number = prev.version ?? 1;
if (prevVersion >= VERSION && !d.steps[`${KEY} v${VERSION} deploy`]) throw new Error(`${KEY} is already v${prevVersion}`);
const v1 = prev.address as Address; // the version being replaced
const V = `v${VERSION}`;

await step(`${KEY} v${prevVersion} pause mint`, async () => {
  if (!(await publicClient.readContract({ address: v1, abi: basketAbi, functionName: "mintPaused" }))) {
    await write("deployer", v1, basketAbi, "pauseMint");
  }
});

const p = await fetchPrices();
const usd: Record<string, number> = { WQOR: p.QOR, fBTC: p.BTC, fETH: p.ETH, QWAKK: p.QWAKK, fUSD: 1 };
const amounts = COMPONENTS.map((c, i) => BigInt(Math.floor((((SEED_USD * WEIGHTS[i]) / 10_000) / usd[c]) * 10 ** DEC[c])));

await step(`${KEY} ${V} seed from reserve`, async () => {
  // the deployer's own tokens first; only the shortfall is withdrawn from the reserve (ML-DSA-87 admin)
  for (let i = 0; i < COMPONENTS.length; i++) {
    const token = d.tokens[COMPONENTS[i]] as Address;
    const need = amounts[i] + amounts[i] / 50n; // 2% headroom for price moves before the seed
    const have = (await publicClient.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [admin] })) as bigint;
    if (have >= need) continue;
    await adminCall(d.reserve, reserveAbi, "withdraw", "withdraw", enc("address, uint256, address", [token, need - have, admin]), [token, need - have, admin]);
    console.log(`  reserve -> deployer ${need - have} ${COMPONENTS[i]}`);
  }
});

await step(`${KEY} ${V} deploy`, async () => {
  const address = await deploy("deployer", "DarwinBasket", [
    prev.name, KEY, DESCRIPTION,
    d.oracle, d.reserve, admin, curator, admin, COMPONENTS.map((c) => d.tokens[c]), WEIGHTS,
  ]);
  d.basketHistory = [...(d.basketHistory ?? []), { key: KEY, version: prevVersion, ...prev, retired: new Date().toISOString(), reason: `${V}: new components or reseed at market prices` }];
  d.baskets[KEY] = {
    address, version: VERSION, name: prev.name, display: prev.display,
    description: DESCRIPTION,
    components: [...COMPONENTS], weights: WEIGHTS,
  };
});

const v2 = () => d.baskets[KEY].address as Address;
await step(`${KEY} ${V} reserve exempt`, () =>
  adminCall(d.reserve, reserveAbi, "setSpreadExempt", "setSpreadExempt", enc("address, bool", [v2(), true]), [v2(), true]));
await step(`${KEY} ${V} seed`, async () => {
  for (const c of COMPONENTS) await write("deployer", d.tokens[c], erc20, "approve", [v2(), maxUint256]);
  const shares = BigInt(Math.round((SEED_USD / 10) * 1e6)) * 10n ** 12n;
  await write("deployer", v2(), basketAbi, "seed", [amounts, shares, admin]);
  console.log(`  seeded ${amounts.join(", ")} for ${Number(shares) / 1e18} shares`);
});
await step(`${KEY} ${V} leftovers back to reserve`, async () => {
  for (const c of COMPONENTS) {
    const left = (await publicClient.readContract({ address: d.tokens[c], abi: erc20, functionName: "balanceOf", args: [admin] })) as bigint;
    if (left > 0n) await write("deployer", d.tokens[c], erc20, "transfer", [d.reserve, left]);
  }
});
console.log(`${KEY} ${V}:`, v2(), `v${prevVersion} retired:`, v1);
