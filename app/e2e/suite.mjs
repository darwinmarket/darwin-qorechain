// Browser end-to-end suite: the real app, the QoreX test double (real hybrid secp256k1 + ML-DSA-87
// signing, real broadcast to qorechain-diana) and on-chain assertions after every action.
//
//   npm run build && npm start &          # port 3032
//   node e2e/suite.mjs                     # mnemonic from QORE_MNEMONIC or ~/.config/qorechain/testnet.mnemonic
//
// Writes a report to ../docs/e2e/browser-<date>.md and screenshots to e2e/shots/.
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

// ---- tiny protobuf writer for the setup message (MsgConvertERC20) ----
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
    results.push({ name, ok: false, detail, ms: Date.now() - t0 });
    console.log(`FAIL  ${name}  ${detail}`);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(`assertion failed: ${m}`);
};

const mock = createQorexMock({ profile: "current", mnemonic, chainId: "qorechain-diana", rest: `${BASE}/api/rest` });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
await page.addInitScript({ content: mock.initScript() });

let me = null; // { native, twin }

async function lastSignAndBroadcast() {
  const reqs = await page.evaluate(() => window.__qorexMock.requests.filter((r) => r.method.endsWith("signAndBroadcast") && r.outcome === "ok"));
  return reqs.at(-1);
}
async function txMessages(hash) {
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

async function trade({ display, side, amount, inKind = false }) {
  await page.goto(`${BASE}/basket/${display}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/Balance/", { timeout: 30000 });
  if (side === "sell") {
    await page.getByRole("tab", { name: `Sell ${display}` }).click();
    if (inKind) await page.getByRole("radio", { name: "Receive the coins" }).click();
    await page.getByLabel(`${display} to sell`).fill(String(amount));
  } else {
    await page.getByLabel("fUSD to pay").fill(String(amount));
  }
  await page.waitForSelector(inKind ? "text=/redemption in kind is free/" : "text=You receive (about)", { timeout: 30000 });
  const label = side === "buy" ? `Buy ${display}` : inKind ? `Redeem ${display} in kind` : `Sell ${display}`;
  await page.getByRole("button", { name: new RegExp(`^${label}$`) }).last().click();
  const done = await page.waitForSelector("text=/^(Bought|Sold|Redeemed)\\./", { timeout: 150000 });
  const text = await done.innerText();
  await page.screenshot({ path: `${SHOTS}${display}-${side}${inKind ? "-kind" : ""}.png` });
  const req = await lastSignAndBroadcast();
  const hash = req?.result?.txHash;
  assert(hash, "a signAndBroadcast result");
  assert(req.result.shield === "shielded", `shield ${req.result.shield}`);
  const tx = await txMessages(hash);
  assert(tx.hybrid, "pqc_hybrid_verify verified on chain");
  return { text, hash, types: tx.types };
}

// ------------------------------------------------------------------------------- pages
await check("home: three baskets with live NAV, oracle pill and activity", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  for (const b of Object.values(D.baskets)) await page.waitForSelector(`text=${b.name}`, { timeout: 30000 });
  await page.waitForSelector("text=/PQ oracle round \\d+/", { timeout: 30000 });
  await page.waitForSelector("text=/Oracle round \\d+: 4 prices, ML-DSA-87 verified/", { timeout: 30000 });
  const navs = await page.locator("text=/^\\$\\d+\\.\\d\\d$/").allInnerTexts();
  assert(navs.length >= 3, `NAVs shown: ${navs.join(", ")}`);
  await page.screenshot({ path: `${SHOTS}home.png` });
  return `NAVs ${navs.slice(0, 3).join(", ")}`;
});

await check("security page lists every contract with its address", async () => {
  await page.goto(`${BASE}/security`, { waitUntil: "networkidle" });
  for (const a of [D.oracle, D.reserve, D.router, ...Object.values(D.baskets).map((b) => b.address)]) {
    await page.waitForSelector(`text=${a}`, { timeout: 10000 });
  }
  return "7 addresses shown";
});

await check("unknown basket URL is a 404", async () => {
  const r = await page.goto(`${BASE}/basket/NOPEdw`);
  assert(r.status() === 404, `status ${r.status()}`);
  return "404";
});

// ------------------------------------------------------------------------------- wallet
await check("connect QoreX from the navbar; the portfolio shows the account", async () => {
  await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Connect QoreX" }).first().click();
  const addrs = await page.evaluate(() => window.__qorexMock.addresses());
  await page.waitForSelector(`text=${addrs.native}`, { timeout: 30000 });
  const twin = await page.locator("text=/EVM 0x[0-9a-f]{40}/").first().innerText();
  me = { native: addrs.native, twin: twin.match(/0x[0-9a-f]{40}/)[0] };
  await page.screenshot({ path: `${SHOTS}portfolio-before.png` });
  return `${me.native} / ${me.twin}`;
});

// ------------------------------------------------------------------------------- trades
for (const [display, key, usd] of [["BLUEdw", "BLUEDW", 1], ["BALdw", "BALDW", 1], ["QOREdw", "QOREDW", 0.2]]) {
  await check(`buy ${display} with ${usd} fUSD (one hybrid-signed tx)`, async () => {
    const s0 = await bal(D.baskets[key].address, me.twin);
    const r = await trade({ display, side: "buy", amount: usd });
    const s1 = await bal(D.baskets[key].address, me.twin);
    assert(s1 > s0, `shares ${s0} -> ${s1}`);
    return `+${(Number(s1 - s0) / 1e18).toFixed(4)} shares, msgs [${r.types.join(", ")}], tx ${r.hash.slice(0, 12)}…`;
  });
}

await check("sell BALdw for fUSD", async () => {
  const shares = await bal(D.baskets.BALDW.address, me.twin);
  const u0 = await bal(D.tokens.fUSD, me.twin);
  const r = await trade({ display: "BALdw", side: "sell", amount: (Number(shares) / 1e18 / 2).toFixed(6) });
  const u1 = await bal(D.tokens.fUSD, me.twin);
  assert(u1 > u0, `fUSD ${u0} -> ${u1}`);
  return `+${(Number(u1 - u0) / 1e6).toFixed(3)} fUSD, msgs [${r.types.join(", ")}]`;
});

await check("redeem BLUEdw in kind: fBTC and fETH arrive, no fee", async () => {
  const b0 = await bal(D.tokens.fBTC, me.twin);
  const e0 = await bal(D.tokens.fETH, me.twin);
  const shares = await bal(D.baskets.BLUEDW.address, me.twin);
  const r = await trade({ display: "BLUEdw", side: "sell", amount: (Number(shares) / 1e18 / 4).toFixed(6), inKind: true });
  const b1 = await bal(D.tokens.fBTC, me.twin);
  const e1 = await bal(D.tokens.fETH, me.twin);
  assert(b1 > b0 && e1 > e0, `fBTC ${b0}->${b1}, fETH ${e0}->${e1}`);
  return `+${b1 - b0} fBTC sats, +${(Number(e1 - e0) / 1e18).toExponential(3)} fETH, msgs [${r.types.join(", ")}]`;
});

await check("faucet fUSD (bank form) is converted in the same transaction as the buy", async () => {
  // Setup: move all ERC-20 fUSD of the account to its bank form, signed through the mock.
  const erc = await bal(D.tokens.fUSD, me.twin);
  let setup = "already in bank form";
  if (erc > 0n) {
  const value = pb([[1, D.tokens.fUSD], [2, erc.toString()], [3, me.native], [4, me.native]]);
  const res = await page.evaluate(
    async ({ value }) =>
      window.qorex.native.signAndBroadcast({
        chainId: "qorechain-diana",
        messages: [{ typeUrl: "/cosmos.evm.erc20.v1.MsgConvertERC20", value }],
        memo: "darwin e2e setup: fUSD to bank form",
        gasLimit: 700000,
      }),
    { value },
  );
  assert(res.code === 0, `setup code ${res.code}`);
  setup = `setup ${res.txHash.slice(0, 12)}…`;
  }
  assert((await bal(D.tokens.fUSD, me.twin)) === 0n, "ERC-20 fUSD emptied");
  const r = await trade({ display: "BLUEdw", side: "buy", amount: 1 });
  assert(r.types[0] === "MsgConvertCoin" && r.types.at(-1) === "MsgCrossVMCall", `msgs ${r.types}`);
  return `${setup}, buy msgs [${r.types.join(", ")}]`;
});

await check("an amount above the balance disables the button", async () => {
  await page.goto(`${BASE}/basket/BALdw`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/Balance/", { timeout: 30000 });
  await page.getByLabel("fUSD to pay").fill("1000000");
  const btn = page.getByRole("button", { name: "Not enough fUSD" });
  await btn.waitFor({ timeout: 30000 });
  assert(await btn.isDisabled(), "disabled");
  return "Not enough fUSD (disabled)";
});

await check("a rejected signature in QoreX shows an error and sends nothing", async () => {
  await page.evaluate(() => window.__qorexMock.rejectNext());
  await page.getByLabel("fUSD to pay").fill("0.5");
  await page.waitForSelector("text=You receive (about)", { timeout: 30000 });
  const before = (await page.evaluate(() => window.__qorexMock.requests.length));
  await page.getByRole("button", { name: /^Buy BALdw$/ }).last().click();
  await page.waitForSelector(`[class*=errorBox]`, { timeout: 30000 });
  const last = await page.evaluate(() => window.__qorexMock.requests.at(-1));
  assert(last.outcome !== "approved", `outcome ${last.outcome}`);
  return `error shown, outcome ${last.outcome}, ${(await page.evaluate(() => window.__qorexMock.requests.length)) - before} request`;
});

await check("activity feed shows QoreX trades with their verified hybrid signature", async () => {
  await sleep(12000);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/from QoreX · ML-DSA-87 \\+ secp256k1, verified/", { timeout: 45000 });
  const n = await page.locator("text=/from QoreX/").count();
  await page.screenshot({ path: `${SHOTS}home-after.png`, fullPage: true });
  return `${n} QoreX trades listed`;
});

await check("portfolio lists the positions and the redeemed coins", async () => {
  await page.goto(`${BASE}/portfolio`, { waitUntil: "networkidle" });
  for (const t of ["Darwin Blue Chip", "Darwin Qore Ecosystem", "fBTC", "fETH"]) await page.waitForSelector(`text=${t}`, { timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}portfolio-after.png`, fullPage: true });
  return "positions + coins shown";
});

await check("disconnect forgets the account", async () => {
  await page.getByRole("button", { name: /^qor1/ }).click();
  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.waitForSelector("text=Connect QoreX to see your baskets and coins.", { timeout: 10000 });
  return "back to connect";
});

await check("no uncaught errors in the page", async () => {
  const real = consoleErrors.filter((e) => !/Failed to load resource/.test(e));
  assert(real.length === 0, real.join(" | "));
  return `${consoleErrors.length} network-level console messages ignored`;
});

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
const date = new Date().toISOString().slice(0, 16).replace(":", "");
const dir = new URL("../../docs/e2e/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(
  `${dir}browser-${date}.md`,
  [
    `# Browser E2E run, ${new Date().toISOString()}`,
    "",
    `App ${BASE}, QoreX test double (\`@qorechain/qorex-wallet-mock\`, real hybrid signing), qorechain-diana. Suite: \`app/e2e/suite.mjs\`. Result: **${passed}/${results.length} passed**.`,
    "",
    "| | Check | Detail | Time |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.ok ? "PASS" : "FAIL"} | ${r.name} | ${String(r.detail).replace(/\|/g, "\\|")} | ${(r.ms / 1000).toFixed(1)}s |`),
    "",
  ].join("\n"),
);
console.log(`report: docs/e2e/browser-${date}.md`);
if (passed !== results.length) process.exitCode = 1;
