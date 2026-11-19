/**
 * Deploy Darwin on qorechain-diana and seed the three baskets. Idempotent: every finished step is
 * recorded in deployments/diana.json, so a run that stops halfway resumes where it stopped.
 *
 *   tsx src/deploy.ts
 *
 * Roles: the deployer account is the admin (its ML-DSA-87 key signs every admin action), the
 * guardian, the seeder and the fee recipient; the reporter signs price rounds; the curator signs
 * rebalances.
 */
import { encodeAbiParameters, parseAbiParameters, maxUint256, type Address, type Hex } from "viem";
import { evmAccount } from "./accounts.js";
import { adminCall, artifact, deploy, loadDeployments, saveDeployments, write } from "./evm.js";
import { publicClient } from "./net.js";
import { FEED, fetchPrices } from "./prices.js";
import { submitRound } from "./oracle.js";

export const FEST = {
  fUSD: "0x97143B771D34ddb9130b807b135Ae675A5a963CA",
  fETH: "0x02292293c13880a26242690eb70a0e42B8E91c28",
  fBTC: "0x4604e7E45b2ecdbfbDc157103f5B2b62cb16451A",
} as const satisfies Record<string, Address>;

export const BASKETS = [
  {
    key: "BLUEDW", name: "Darwin Blue Chip", display: "BLUEdw",
    description: "The two crypto majors, half and half: 50% BTC, 50% ETH.",
    components: ["fBTC", "fETH"], weights: [5000, 5000], seedUsd: 200,
  },
  {
    key: "BALDW", name: "Darwin Balanced", display: "BALdw",
    description: "BTC and ETH with a 30% dollar cushion: 35% BTC, 35% ETH, 30% USD.",
    components: ["fBTC", "fETH", "fUSD"], weights: [3500, 3500, 3000], seedUsd: 200,
  },
  {
    key: "QOREDW", name: "Darwin Qore Ecosystem", display: "QOREdw",
    description: "A bet on QoreChain itself: 40% QOR, 30% ETH, 30% BTC.",
    components: ["WQOR", "fETH", "fBTC"], weights: [4000, 3000, 3000], seedUsd: 1,
  },
] as const;

const NAV_PER_SHARE = 10; // USD at seed
const DECIMALS: Record<string, number> = { fUSD: 6, fETH: 18, fBTC: 8, WQOR: 18 };

const erc20 = artifact("WQOR").abi; // WQOR is a plain OZ ERC20 plus deposit/withdraw
const enc = (types: string, values: unknown[]) => encodeAbiParameters(parseAbiParameters(types), values as any) as Hex;

async function main() {
  const d = loadDeployments();
  const admin = (await evmAccount("deployer")).evm as Address;
  const reporter = (await evmAccount("reporter")).evm as Address;
  const curator = (await evmAccount("curator")).evm as Address;
  d.network = { chainId: 9800, cosmosChainId: "qorechain-diana", rpc: "https://evm-testnet.qore.host" };
  d.roles = { admin, reporter, curator, guardian: admin, feeTo: admin };
  d.tokens = { ...FEST, ...(d.tokens ?? {}) };
  d.steps ??= {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    if (d.steps[name]) return;
    console.log(`- ${name}`);
    await fn();
    d.steps[name] = new Date().toISOString();
    saveDeployments(d);
  };

  await step("deploy WQOR", async () => { d.tokens.WQOR = await deploy("deployer", "WQOR"); });
  await step("deploy oracle", async () => {
    d.oracle = await deploy("deployer", "DarwinOracle", [admin, reporter, 1800, 1500]);
  });
  const oracleAbi = artifact("DarwinOracle").abi;
  for (const [name, id] of Object.entries(FEED)) {
    await step(`oracle feed ${name}`, () =>
      adminCall(d.oracle, oracleAbi, "addFeed", "addFeed", enc("uint16, string", [id, `${name}/USD`]), [id, `${name}/USD`]));
  }
  const tokenFeed: Record<string, number> = { fUSD: FEED.USD, fETH: FEED.ETH, fBTC: FEED.BTC, WQOR: FEED.QOR };
  for (const [sym, id] of Object.entries(tokenFeed)) {
    await step(`oracle token ${sym}`, () =>
      adminCall(d.oracle, oracleAbi, "setTokenFeed", "setTokenFeed", enc("address, uint16", [d.tokens[sym], id]), [d.tokens[sym], id]));
  }
  await step("oracle first round", () => submitRound(d.oracle));

  await step("deploy reserve", async () => { d.reserve = await deploy("deployer", "DarwinReserve", [admin, d.oracle, 30]); });
  const reserveAbi = artifact("DarwinReserve").abi;
  for (const sym of ["fUSD", "fETH", "fBTC", "WQOR"]) {
    await step(`reserve list ${sym}`, () =>
      adminCall(d.reserve, reserveAbi, "listToken", "listToken", enc("address, bool", [d.tokens[sym], true]), [d.tokens[sym], true]));
  }

  d.baskets ??= {};
  for (const b of BASKETS) {
    await step(`deploy ${b.key}`, async () => {
      const comps = b.components.map((c) => d.tokens[c]);
      d.baskets[b.key] = {
        address: await deploy("deployer", "DarwinBasket", [
          b.name, b.key, b.description, d.oracle, d.reserve, admin, curator, admin, comps, b.weights,
        ]),
        name: b.name, display: b.display, description: b.description,
        components: b.components, weights: b.weights,
      };
    });
    await step(`reserve exempt ${b.key}`, () =>
      adminCall(d.reserve, reserveAbi, "setSpreadExempt", "setSpreadExempt",
        enc("address, bool", [d.baskets[b.key].address, true]), [d.baskets[b.key].address, true]));
  }

  await step("deploy router", async () => {
    d.router = await deploy("deployer", "DarwinRouter", [d.tokens.fUSD, d.reserve, 30, admin]);
  });

  // ---- seed the baskets at NAV 10 USD per share ----
  const prices = await fetchPrices();
  const usdOf: Record<string, number> = { fUSD: 1, fETH: prices.ETH, fBTC: prices.BTC, WQOR: prices.QOR };
  const qorNeeded = BASKETS.reduce((s, b) => {
    const i = (b.components as readonly string[]).indexOf("WQOR");
    return i < 0 ? s : s + (b.seedUsd * b.weights[i]) / 10_000 / prices.QOR;
  }, 0) + 10; // + 10 QOR of reserve inventory
  await step("wrap QOR", async () => {
    const wei = BigInt(Math.ceil(qorNeeded * 1e6)) * 10n ** 12n;
    console.log(`  wrapping ${qorNeeded.toFixed(2)} QOR`);
    await write("deployer", d.tokens.WQOR, erc20, "deposit", [], wei);
  });
  const basketAbi = artifact("DarwinBasket").abi;
  for (const b of BASKETS) {
    const addr = d.baskets[b.key].address as Address;
    for (const c of b.components) {
      await step(`approve ${c} for ${b.key}`, () => write("deployer", d.tokens[c], erc20, "approve", [addr, maxUint256]));
    }
    await step(`seed ${b.key}`, async () => {
      const amounts = b.components.map((c, i) => {
        const usd = (b.seedUsd * b.weights[i]) / 10_000;
        return BigInt(Math.floor((usd / usdOf[c]) * 10 ** DECIMALS[c]));
      });
      const shares = BigInt(Math.round((b.seedUsd / NAV_PER_SHARE) * 1e6)) * 10n ** 12n;
      console.log(`  ${b.key}: ${amounts.join(", ")} for ${Number(shares) / 1e18} shares`);
      await write("deployer", addr, basketAbi, "seed", [amounts, shares, admin]);
      d.baskets[b.key].seed = { amounts: amounts.map(String), shares: shares.toString(), prices: usdOf };
    });
  }

  // ---- reserve inventory: everything left, minus a small trading float for the demo account ----
  for (const sym of ["fBTC", "fETH", "fUSD", "WQOR"]) {
    await step(`fund reserve ${sym}`, async () => {
      const bal = (await publicClient.readContract({ address: d.tokens[sym], abi: erc20, functionName: "balanceOf", args: [admin] })) as bigint;
      const keep = sym === "fUSD" ? 150n * 10n ** 6n : 0n;
      if (bal > keep) await write("deployer", d.tokens[sym], erc20, "transfer", [d.reserve, bal - keep]);
      console.log(`  reserve <- ${bal - keep} ${sym}`);
    });
  }
  d.deployedAt ??= new Date().toISOString();
  saveDeployments(d);
  console.log("done:", JSON.stringify({ oracle: d.oracle, reserve: d.reserve, router: d.router, baskets: Object.fromEntries(Object.entries(d.baskets).map(([k, v]: any) => [k, v.address])) }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
