/**
 * QOREDW v2: 40% QOR, 20% BTC, 20% ETH, 20% QWAKK. A basket's components are fixed at deployment,
 * so adding QWAKK means a new basket contract:
 *   1. pause minting on QOREDW v1 (guardian); its holders can still sell or redeem,
 *   2. take the seed from the reserve with an ML-DSA-87 signed admin withdrawal,
 *   3. deploy v2, exempt it from the reserve spread, seed it at 10 USD a share,
 *   4. record v1 in basketHistory and v2 as QOREDW.
 *
 *   tsx src/migrate-qoredw.ts      (needs an unscoped deployer window; stop the keeper first)
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

const COMPONENTS = ["WQOR", "fBTC", "fETH", "QWAKK"] as const;
const WEIGHTS = [4000, 2000, 2000, 2000];
const DEC: Record<string, number> = { WQOR: 18, fBTC: 8, fETH: 18, QWAKK: 6 };
const SEED_USD = 1;
const v1 = (d.basketHistory ?? []).find((b: any) => b.key === "QOREDW" && b.version === 1)?.address ?? d.baskets.QOREDW.address;

await step("QOREDW v1 pause mint", async () => {
  if (!(await publicClient.readContract({ address: v1, abi: basketAbi, functionName: "mintPaused" }))) {
    await write("deployer", v1, basketAbi, "pauseMint");
  }
});

const p = await fetchPrices();
const usd: Record<string, number> = { WQOR: p.QOR, fBTC: p.BTC, fETH: p.ETH, QWAKK: p.QWAKK };
const amounts = COMPONENTS.map((c, i) => BigInt(Math.floor((((SEED_USD * WEIGHTS[i]) / 10_000) / usd[c]) * 10 ** DEC[c])));

await step("QOREDW v2 seed from reserve", async () => {
  for (let i = 0; i < COMPONENTS.length; i++) {
    const token = d.tokens[COMPONENTS[i]] as Address;
    const need = amounts[i] + amounts[i] / 50n; // 2% headroom for price moves before the seed
    await adminCall(d.reserve, reserveAbi, "withdraw", "withdraw", enc("address, uint256, address", [token, need, admin]), [token, need, admin]);
    console.log(`  reserve -> deployer ${need} ${COMPONENTS[i]}`);
  }
});

await step("QOREDW v2 deploy", async () => {
  const address = await deploy("deployer", "DarwinBasket", [
    "Darwin Qore Ecosystem", "QOREDW", "QoreChain's ecosystem: 40% QOR, 20% BTC, 20% ETH, 20% QWAKK.",
    d.oracle, d.reserve, admin, curator, admin, COMPONENTS.map((c) => d.tokens[c]), WEIGHTS,
  ]);
  d.basketHistory = [...(d.basketHistory ?? []), { key: "QOREDW", version: 1, ...d.baskets.QOREDW, retired: new Date().toISOString(), reason: "v2 adds QWAKK; components are fixed per contract" }];
  d.baskets.QOREDW = {
    address, version: 2, name: "Darwin Qore Ecosystem", display: "QOREdw",
    description: "QoreChain's ecosystem: 40% QOR, 20% BTC, 20% ETH, 20% QWAKK.",
    components: [...COMPONENTS], weights: WEIGHTS,
  };
});

const v2 = d.baskets.QOREDW.address as Address;
await step("QOREDW v2 reserve exempt", () =>
  adminCall(d.reserve, reserveAbi, "setSpreadExempt", "setSpreadExempt", enc("address, bool", [v2, true]), [v2, true]));
await step("QOREDW v2 seed", async () => {
  for (const c of COMPONENTS) await write("deployer", d.tokens[c], erc20, "approve", [v2, maxUint256]);
  const shares = BigInt(Math.round((SEED_USD / 10) * 1e6)) * 10n ** 12n;
  await write("deployer", v2, basketAbi, "seed", [amounts, shares, admin]);
  console.log(`  seeded ${amounts.join(", ")} for ${Number(shares) / 1e18} shares`);
});
await step("QOREDW v2 leftovers back to reserve", async () => {
  for (const c of COMPONENTS) {
    const left = (await publicClient.readContract({ address: d.tokens[c], abi: erc20, functionName: "balanceOf", args: [admin] })) as bigint;
    if (left > 0n) await write("deployer", d.tokens[c], erc20, "transfer", [d.reserve, left]);
  }
});
console.log("QOREDW v2:", v2, "v1 retired:", v1);
