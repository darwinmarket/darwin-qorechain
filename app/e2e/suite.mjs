// Browser end-to-end suite for the Darwin front on QoreChain (the mainnet front, with QoreX).
// The QoreX test double signs for real (secp256k1 + ML-DSA-87) and broadcasts to qorechain-diana;
// every trade is then checked on chain.
//
//   npm run build && npm start &          # port 3032
//   node e2e/suite.mjs                     # mnemonic from QORE_MNEMONIC or ~/.config/qorechain/testnet.mnemonic
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { chromium } from "playwright";
import { createPublicClient, http, parseAbi } from "viem";
import { createQorexMock } from "@qorechain/qorex-wallet-mock";

const BASE = process.env.APP_URL ?? "http://localhost:3032";
const REST = "https://api-testnet.qore.host";
const D = JSON.parse(readFileSync(new URL("../src/config/deployments.json", import.meta.url), "utf8"));
const file = `${homedir()}/.config/qorechain/testnet.mnemonic`;
const mnemonic = process.env.QORE_MNEMONIC ?? (existsSync(file) ? readFileSync(file, "utf8").trim() : null);
if (!mnemonic) throw new Error("set QORE_MNEMONIC");
const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const evm = createPublicClient({ transport: http("https://evm-testnet.qore.host") });
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const bal = (token, who) => evm.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [who] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAME = Object.fromEntries(Object.entries(D.baskets).map(([k, b]) => [k, b.name.replace(/^Darwin /, "")]));

function pb(fields) {
  const out = [];
  const varint = (n) => {
    while (n > 0x7f) {
      out.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    out.push(n);
  };
  for (const [f, v] of fields) {
    const b = typeof v === "string" ? new TextEncoder().encode(v) : v;
    varint((f << 3) | 2);
    varint(b.length);
    out.push(...b);
  }
  return out;
}

const results = [];
async function check(name, fn) {
  const t0 = Date.now();
  try {
    const detail = (await fn()) ?? "";
    results.push({ name, ok: true, detail, ms: Date.now() - t0 });
    console.log(`PASS  ${name}  ${detail}`);
  } catch (e) {
    const detail = String(e?.message ?? e).split("\n")[0].slice(0, 220);
    const skip = e instanceof Skip;
    results.push({ name, ok: false, skip, detail, ms: Date.now() - t0 });
    console.log(`${skip ? "SKIP" : "FAIL"}  ${name}  ${detail}`);
  }
}
/** A check that cannot run on the testnet's current state (not a failure of the app). */
class Skip extends Error {}
const assert = (c, m) => {
  if (!c) throw new Error(`assertion failed: ${m}`);
};

const mock = createQorexMock({ profile: "current", mnemonic, chainId: "qorechain-diana", rest: `${BASE}/api/rest` });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
await page.addInitScript({ content: mock.initScript() });

let me = null;
const tab = (name) => page.getByRole("button", { name, exact: true }).first().click();

async function lastBroadcast() {
  const reqs = await page.evaluate(() => window.__qorexMock.requests.filter((r) => r.method.endsWith("signAndBroadcast") && r.outcome === "ok"));
  return reqs.at(-1);
}
async function txInfo(hash) {
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs/${hash}`);
    if (r.ok) {
      const j = await r.json();
      return {
        types: j.tx.body.messages.map((m) => m["@type"].split(".").at(-1)),
        hybrid: j.tx_response.events.some((e) => e.type === "pqc_hybrid_verify" && e.attributes.some((a) => a.key === "status" && a.value === "verified")),
      };
    }
    await sleep(1500);
  }
  throw new Error(`tx ${hash} not found`);
}

async function openBasket(display) {
  await page.goto(`${BASE}/${display}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Your position", { timeout: 30000 });
}

async function trade({ display, key, side, amount }) {
  await openBasket(display);
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  if (side === "sell") await page.getByRole("button", { name: "Sell", exact: true }).click();
  await page.getByLabel(side === "buy" ? "You spend" : "You sell").fill(String(amount));
  const cta = page.getByRole("button", { name: `${side === "buy" ? "Buy" : "Sell"} ${NAME[key]}`, exact: true });
  await cta.waitFor({ timeout: 30000 });
  for (let i = 0; i < 40 && (await cta.isDisabled()); i++) await sleep(500); // quote arrives
  assert(!(await cta.isDisabled()), "CTA enabled after the quote");
  const before = (await page.evaluate(() => window.__qorexMock.requests.length));
  await cta.click();
  await page.waitForSelector(`text=${side === "buy" ? "Bought" : "Sold"} ${NAME[key]}`, { timeout: 150000 });
  await page.screenshot({ path: `${SHOTS}${display}-${side}.png` });
  const req = await lastBroadcast();
  assert(req && req.id > before - 1, "a new signAndBroadcast");
  assert(req.result.shield === "shielded", `shield ${req.result.shield}`);
  const tx = await txInfo(req.result.txHash);
  assert(tx.hybrid, "pqc_hybrid_verify verified on chain");
  return { hash: req.result.txHash, types: tx.types };
}

// ------------------------------------------------------------------------------- signed out
await check("home: the mainnet frame, four tabs, every basket with its index", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  for (const t of ["Baskets", "Portfolio", "Activity", "Security"]) await page.getByRole("button", { name: t, exact: true }).first().waitFor();
  await page.waitForSelector("text=One token, a", { timeout: 30000 });
  for (const n of Object.values(NAME)) await page.waitForSelector(`text=${n}`, { timeout: 30000 });
  await page.waitForSelector("text=Index base 100", { timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}home.png` });
  return `${Object.keys(NAME).length} baskets`;
});

await check("a basket URL opens its screen with the pre-connect trade card", async () => {
  await openBasket("BLUEdw");
  await page.waitForSelector("text=Index base 100 at launch", { timeout: 30000 });
  await page.getByRole("button", { name: "$50" }).click();
  await page.waitForSelector("text=/≈ \\$49\\.85/", { timeout: 10000 });
  await page.getByRole("button", { name: "Connect wallet" }).last().waitFor();
  return "$50 -> ≈ $49.85 after the 0.30% fee";
});

await check("QOR and QWAKK baskets chart market history; QWAKK replayed from its pool swaps since the pool opened", async () => {
  for (const d of ["DEGENdw", "QOREdw"]) {
    await openBasket(d);
    await page.waitForSelector("text=Index base 100 at launch", { timeout: 30000 });
    await sleep(4000);
    assert((await page.getByText("Price history unavailable.").count()) === 0, `${d} has a chart`);
  }
  const h = await (await fetch(`${BASE}/api/history?symbols=QOR-USD,QWAKK-USD,ETH-USD&range=3mo&interval=1h`)).json();
  assert(h.timestamps.length > 20 && h.closes["QOR-USD"] && h.closes["QWAKK-USD"], "market history served");
  assert(h.timestamps[0] >= Date.UTC(2026, 10, 18, 18) / 1000, "no QWAKK price before its pool existed");
  const ratios = h.closes["QWAKK-USD"].map((w, i) => (w / h.closes["QOR-USD"][i]).toPrecision(4));
  assert(new Set(ratios).size > 1, "the QWAKK/QOR ratio follows the pool's swaps");
  return `${h.timestamps.length} hourly bars since ${new Date(h.timestamps[0] * 1000).toISOString().slice(0, 16)}`;
});

await check("Security tab: oracle feeds, rounds, rules, the keeper's scoped window, contracts", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await tab("Security");
  await page.waitForSelector("text=Post-quantum oracle", { timeout: 30000 });
  await page.waitForSelector("text=QWAKK/USD", { timeout: 30000 });
  await page.waitForSelector("text=/^#\\d+$/", { timeout: 30000 });
  await page.waitForSelector("text=Who can do what");
  await page.waitForSelector("text=DarwinRouter", { timeout: 30000 });
  await page.waitForSelector(`text=${D.router}`, { timeout: 30000 });
  return "all sections";
});

await check("a round's link opens Darwin's transaction page with the decoded round and its PQ evidence", async () => {
  const href = await page.locator("a[href^='/tx/']").first().getAttribute("href");
  await page.goto(BASE + href, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/Oracle round #\\d+/", { timeout: 30000 });
  await page.waitForSelector("text=Admitted by a post-quantum EVM window", { timeout: 10000 });
  await page.waitForSelector("text=qorechain-diana (testnet)");
  return href;
});

await check("Portfolio and Activity ask to connect when signed out", async () => {
  await tab("Portfolio");
  await page.waitForSelector("text=Connect a wallet to see your holdings and positions.");
  await tab("Activity");
  await page.waitForSelector("text=Connect a wallet to see your transaction activity.");
  return "prompts shown";
});

await check("unknown basket URL is a 404", async () => {
  const r = await page.goto(`${BASE}/NOPEdw`);
  assert(r.status() === 404, `status ${r.status()}`);
  return "404";
});

// ------------------------------------------------------------------------------- connect
await check("Connect wallet connects QoreX; the account shows in the navbar", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  const addrs = await page.evaluate(() => window.__qorexMock.addresses());
  await page.waitForSelector(`text=${addrs.native.slice(0, 8)}`, { timeout: 30000 });
  me = { native: addrs.native };
  await tab("Portfolio");
  await page.waitForSelector("text=Portfolio value", { timeout: 30000 });
  return addrs.native;
});

// fUSD in ERC-20 form on the twin for the trades below
const twin = await (async () => {
  const words = me.native;
  const { bech32 } = await import("@scure/base").catch(() => ({ bech32: null }));
  if (bech32) return "0x" + Buffer.from(bech32.fromWords(bech32.decode(words).words)).toString("hex");
  throw new Error("@scure/base missing");
})();

/** What the vault can fill for this basket right now, as the trade card states it. */
async function vaultCapacity(display) {
  await openBasket(display);
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  // Just under the wallet's balance: above it, "Not enough fUSD" takes precedence over liquidity.
  const avail = Number((await page.getByText(/^Available /).first().innerText()).match(/([\d,.]+)/)[1].replace(/,/g, ""));
  await page.getByLabel("You spend").fill(String(Math.floor(avail * 0.99 * 100) / 100));
  const msg = page.getByText(/The vault can fill about \$/).first();
  if (!(await msg.waitFor({ timeout: 8000 }).then(() => true, () => false))) return Infinity;
  return Number((await msg.innerText()).match(/\$([\d,.]+)/)[1].replace(/,/g, ""));
}

// The QOR baskets are bounded by the reserve's QOR and QWAKK at their market prices (a testnet QOR
// is worth $0.003): the buy is sized to half of what the vault can fill, capped at the target.
for (const [display, key, target] of [["BLUEdw", "BLUEDW", 1], ["BALdw", "BALDW", 1], ["QOREdw", "QOREDW", 0.05], ["DEGENdw", "DEGENDW", 0.02]]) {
  await check(`buy ${display} (up to ${target} fUSD) in one QoreX approval`, async () => {
    const cap = await vaultCapacity(display);
    const usd = Math.min(target, Math.floor(cap * 0.5 * 1e4) / 1e4);
    if (usd < 0.002) throw new Skip(`the vault can fill only $${cap} of ${display}: refill the reserve (ops/src/refill.ts)`);
    const s0 = await bal(D.baskets[key].address, twin);
    const r = await trade({ display, key, side: "buy", amount: usd });
    const s1 = await bal(D.baskets[key].address, twin);
    assert(s1 > s0, `shares ${s0} -> ${s1}`);
    return `${usd} fUSD (vault capacity ${cap === Infinity ? "above the balance" : `$${cap}`}) -> +${(Number(s1 - s0) / 1e18).toFixed(4)} ${display}, msgs [${r.types.join(", ")}], ML-DSA-87 verified`;
  });
}

await check("the position shows on the trade card after a buy", async () => {
  await openBasket("BALdw");
  await page.waitForSelector("text=/ BALdw$/", { timeout: 30000 });
  return await page.locator("text=/ BALdw$/").first().innerText();
});

await check("sell half of BALdw for fUSD", async () => {
  const shares = await bal(D.baskets.BALDW.address, twin);
  const u0 = await bal(D.tokens.fUSD, twin);
  const r = await trade({ display: "BALdw", key: "BALDW", side: "sell", amount: (Number(shares) / 1e18 / 2).toFixed(6) });
  const u1 = await bal(D.tokens.fUSD, twin);
  assert(u1 > u0, `fUSD ${u0} -> ${u1}`);
  return `+${(Number(u1 - u0) / 1e6).toFixed(3)} fUSD, msgs [${r.types.join(", ")}]`;
});

await check("faucet fUSD (bank form) is converted in the same transaction as the buy", async () => {
  const erc = await bal(D.tokens.fUSD, twin);
  let setup = "already in bank form";
  if (erc > 0n) {
    const value = pb([[1, D.tokens.fUSD], [2, erc.toString()], [3, me.native], [4, me.native]]);
    const res = await page.evaluate(
      async ({ value }) =>
        window.qorex.native.signAndBroadcast({ chainId: "qorechain-diana", messages: [{ typeUrl: "/cosmos.evm.erc20.v1.MsgConvertERC20", value }], memo: "darwin e2e setup", gasLimit: 700000 }),
      { value },
    );
    assert(res.code === 0, `setup code ${res.code}`);
    setup = `setup ${res.txHash.slice(0, 12)}…`;
  }
  const r = await trade({ display: "BLUEdw", key: "BLUEDW", side: "buy", amount: 1 });
  assert(r.types[0] === "MsgConvertCoin" && r.types.at(-1) === "MsgCrossVMCall", `msgs ${r.types}`);
  return `${setup}, buy msgs [${r.types.join(", ")}]`;
});

await check("more fUSD than the balance disables the button", async () => {
  await openBasket("BALdw");
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  await page.getByLabel("You spend").fill("1000000");
  const btn = page.getByRole("button", { name: "Not enough fUSD" });
  await btn.waitFor({ timeout: 30000 });
  assert(await btn.isDisabled(), "disabled");
  return "Not enough fUSD";
});

await check("a buy above the vault's liquidity is refused before signing", async () => {
  await openBasket("DEGENdw");
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  await page.getByLabel("You spend").fill("5");
  const btn = page.getByRole("button", { name: "Above available liquidity" });
  await btn.waitFor({ timeout: 30000 });
  assert(await btn.isDisabled(), "disabled");
  return await page.locator("text=/The vault can fill about/").innerText();
});

await check("a signature declined in QoreX shows a toast and sends nothing", async () => {
  await openBasket("BALdw");
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  await page.evaluate(() => window.__qorexMock.rejectNext());
  await page.getByLabel("You spend").fill("0.5");
  const cta = page.getByRole("button", { name: `Buy ${NAME.BALDW}`, exact: true });
  for (let i = 0; i < 40 && (await cta.isDisabled()); i++) await sleep(500);
  await cta.click();
  await page.waitForSelector("text=/Trade cancelled|Trade failed/", { timeout: 30000 });
  const last = await page.evaluate(() => window.__qorexMock.requests.at(-1));
  assert(last.outcome !== "ok", `outcome ${last.outcome}`);
  return `outcome ${last.outcome}`;
});

await check("Activity lists the account's trades from the chain", async () => {
  await sleep(8000);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await tab("Activity");
  await page.waitForSelector("text=/^(Buy|Sell)$/", { timeout: 45000 });
  const n = await page.locator("text=/^(Buy|Sell)$/").count();
  await page.screenshot({ path: `${SHOTS}activity.png` });
  return `${n} trades`;
});

await check("Portfolio shows value, allocation and holdings (baskets and Cash)", async () => {
  await tab("Portfolio");
  await page.waitForSelector("text=Holdings", { timeout: 30000 });
  for (const n of [NAME.BLUEDW, NAME.QOREDW, "Cash"]) await page.waitForSelector(`text=${n}`, { timeout: 30000 });
  assert((await page.getByText("fBTC").count()) === 0, "no underlying coins listed");
  await page.screenshot({ path: `${SHOTS}portfolio.png`, fullPage: true });
  return "value + allocation + holdings";
});

await check("Recent activity shows on the Baskets tab once connected", async () => {
  await tab("Baskets");
  await page.waitForSelector("text=Recent activity", { timeout: 30000 });
  return "shown";
});

await check("disconnect from the account menu", async () => {
  await page.getByRole("button", { name: new RegExp(me.native.slice(0, 8)) }).click();
  await page.getByRole("menuitem", { name: "Disconnect" }).click();
  await page.getByRole("button", { name: "Connect wallet" }).first().waitFor({ timeout: 10000 });
  return "back to Connect wallet";
});

await check("no uncaught errors in the page", async () => {
  assert(consoleErrors.length === 0, consoleErrors.join(" | "));
  return "none";
});

await browser.close();
const passed = results.filter((r) => r.ok).length;
const skipped = results.filter((r) => r.skip).length;
console.log(`\n${passed}/${results.length} passed${skipped ? `, ${skipped} skipped` : ""}`);
const date = new Date().toISOString().slice(0, 16).replace(":", "");
const dir = new URL("../../docs/e2e/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(
  `${dir}browser-${date}.md`,
  [
    `# Browser E2E run, ${new Date().toISOString()}`,
    "",
    `The Darwin front (mainnet design) at ${BASE}, QoreX test double (real hybrid signing), qorechain-diana. Suite: \`app/e2e/suite.mjs\`. Result: **${passed}/${results.length} passed${skipped ? `, ${skipped} skipped` : ""}**.`,
    "",
    "| | Check | Detail | Time |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.ok ? "PASS" : r.skip ? "SKIP" : "FAIL"} | ${r.name} | ${String(r.detail).replace(/\|/g, "\\|")} | ${(r.ms / 1000).toFixed(1)}s |`),
    "",
  ].join("\n"),
);
console.log(`report: docs/e2e/browser-${date}.md`);
if (passed !== results.length) process.exitCode = 1;
