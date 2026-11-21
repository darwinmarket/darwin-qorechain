// Browser end-to-end suite for the Darwin front on QoreChain (the mainnet front, with QoreX).
// The QoreX test double signs for real (secp256k1 + ML-DSA-87) and broadcasts to qorechain-diana;
// every trade is then checked on chain.
//
//   npm run build && npm start &          # port 3032
//   node e2e/suite.mjs                     # mnemonic from QORE_MNEMONIC or ~/.config/qorechain/testnet.mnemonic
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { chromium } from "playwright";
import { createPublicClient, encodeAbiParameters, encodeFunctionData, http, keccak256, maxUint256, parseAbi } from "viem";
import { deriveCanonicalPqKey, deriveClassicalKey, signMessage } from "@qorechain/qoresign";
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
/** ONLY=<regex> runs the matching checks alone (each trade costs testnet QOR in fees). */
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, "i") : null;
async function check(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  const t0 = Date.now();
  try {
    const detail = (await fn()) ?? "";
    results.push({ name, ok: true, detail, ms: Date.now() - t0 });
    console.log(`PASS  ${name}  ${detail}`);
  } catch (e) {
    let detail = String(e?.message ?? e).split("\n")[0].slice(0, 220);
    const skip = e instanceof Skip;
    if (!skip) {
      // what the page showed: a screenshot, and any toast or error text on screen
      const shot = `fail-${results.length + 1}.png`;
      await page.screenshot({ path: `${SHOTS}${shot}` }).catch(() => {});
      const said = await page.locator("[role=status], [role=alert], .toast").allInnerTexts().catch(() => []);
      detail += ` [screen: e2e/shots/${shot}${said.length ? `; toasts: ${said.join(" / ").replace(/\s+/g, " ").slice(0, 200)}` : ""}]`;
    }
    results.push({ name, ok: false, skip, detail, ms: Date.now() - t0 });
    console.log(`${skip ? "SKIP" : "FAIL"}  ${name}  ${detail}`);
  }
}
/** A check that cannot run on the testnet's current state (not a failure of the app). */
class Skip extends Error {}
const assert = (c, m) => {
  if (!c) throw new Error(`assertion failed: ${m}`);
};

// "planned" adds signArbitrary, which today's QoreX has. Trades are plain-text messages it signs;
// Darwin's relayer submits them to the user's DarwinAccount, which checks the ML-DSA-87 signature on
// chain. No EVM window and no grant: nothing is set up for the account before the suite runs.
const mock = createQorexMock({ profile: "planned", mnemonic, chainId: "qorechain-diana", rest: `${BASE}/api/rest` });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
await page.addInitScript({ content: mock.initScript() });

let me = null;
/** Connected for the checks that follow (null when signed out on purpose). */
let connected = false;
const tab = (name) => page.getByRole("button", { name, exact: true }).first().click({ timeout: 15000 });

/**
 * After a goto or a reload the wallet does not always reconnect by itself: click the visible
 * Connect button (short timeout, never failing the check), then wait until the navbar shows the
 * account rather than Connect. Up to three times.
 */
async function ensureConnected() {
  if (!connected || !me) return;
  const pill = page.getByText(me.native.slice(0, 8)).first();
  for (let i = 0; i < 3; i++) {
    if (await pill.isVisible().catch(() => false)) return;
    const connect = page.getByRole("button", { name: "Connect wallet" });
    for (const b of await connect.all().catch(() => [])) {
      if (await b.isVisible().catch(() => false)) {
        await b.click({ timeout: 3000 }).catch(() => {});
        break;
      }
    }
    if (await pill.waitFor({ timeout: 10000 }).then(() => true, () => false)) return;
  }
  throw new Error("the wallet did not reconnect after three tries");
}

/** Poll `read` until `ok(value)` (the RPC is load-balanced: a read can lag a block). */
async function until(read, ok, what, timeout = 45000) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeout) {
    v = await read().catch(() => undefined);
    if (v !== undefined && ok(v)) return v;
    await sleep(1500);
  }
  throw new Error(`timed out waiting for ${what} (last ${v})`);
}

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

/** The user's DarwinAccount, as the app's server reads it. */
async function acctInfo() {
  const r = await fetch(`${BASE}/api/relay/account?account=${me.native}`);
  if (!r.ok) throw new Error(`account info ${r.status}`);
  return r.json();
}

/**
 * The newest DarwinAccount trade for the user since `since` (ms), from the app's Activity API, then
 * checked on chain: a MsgCrossVMCall to the account factory, executed, hybrid-signed (secp256k1 +
 * ML-DSA-87, verified by the chain) by one of Darwin's relayers, never by the user.
 */
async function accountTx(since) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${BASE}/api/trades?account=${me.native}`);
    const list = r.ok ? await r.json() : [];
    const t = (Array.isArray(list) ? list : list.trades ?? []).find((x) => x.ts >= since && x.account);
    if (t) {
      const c = (await (await fetch(`${REST}/cosmos/tx/v1beta1/txs/${t.tx}`)).json()).tx_response;
      assert(c && c.code === 0, `${t.tx} committed`);
      const attr = (type, key) => c.events.find((e) => e.type === type && e.attributes.some((a) => a.key === key))?.attributes.find((a) => a.key === key)?.value;
      return {
        hash: t.tx,
        recipient: attr("crossvm_request", "target_contract"),
        executed: attr("crossvm_response", "status") === "executed",
        hybridSigner: c.events.find((e) => e.type === "pqc_hybrid_verify" && e.attributes.some((a) => a.key === "status" && a.value === "verified"))?.attributes.find((a) => a.key === "address")?.value,
        window: attr("pqc_evm_window_used", "address"),
      };
    }
    await sleep(2000);
  }
  throw new Error("no account trade found");
}

/** The newest trade Darwin's relayer executed for `account` since `since` (ms). */
async function relayedTx(account, since) {
  const q = encodeURIComponent(`crossvm_request.sender='${account}'`);
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${REST}/cosmos/tx/v1beta1/txs?query=${q}&order_by=ORDER_BY_DESC&pagination.limit=5`);
    const t = r.ok ? (await r.json()).tx_responses?.find((x) => Date.parse(x.timestamp) >= since) : null;
    if (t) {
      const outer = t.tx.body.messages.map((m) => m["@type"].split(".").at(-1));
      const inner = t.tx.body.messages.flatMap((m) => (m["@type"].endsWith("MsgExec") ? m.msgs : [m])).map((m) => m["@type"].split(".").at(-1));
      const ev = (type) => t.events.find((e) => e.type === type);
      return {
        hash: t.txhash,
        outer,
        types: inner,
        hybrid: t.events.some((e) => e.type === "pqc_hybrid_verify" && e.attributes.some((a) => a.key === "status" && a.value === "verified")),
        window: ev("pqc_evm_window_used")?.attributes.find((a) => a.key === "address")?.value,
      };
    }
    await sleep(2000);
  }
  throw new Error("no relayed trade found on chain");
}

async function openBasket(display) {
  // the page keeps polling balances and prices: "networkidle" may never come
  await page.goto(`${BASE}/${display}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("text=Your position", { timeout: 45000 });
  await ensureConnected();
}

async function trade({ display, key, side, amount }) {
  await openBasket(display);
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  if (side === "sell") await page.getByRole("button", { name: "Sell", exact: true }).click({ timeout: 15000 });
  await page.getByLabel(side === "buy" ? "You spend" : "You sell").fill(String(amount));
  const cta = page.getByRole("button", { name: `${side === "buy" ? "Buy" : "Sell"} ${NAME[key]}`, exact: true });
  await cta.waitFor({ timeout: 30000 });
  for (let i = 0; i < 40 && (await cta.isDisabled()); i++) await sleep(500); // quote arrives
  assert(!(await cta.isDisabled()), "CTA enabled after the quote");
  const t0 = Date.now() - 5000;
  await cta.click({ timeout: 15000 });
  // the outcome: done, or a failure toast (reported with its message, not waited out)
  await page.waitForSelector(`text=/^(${side === "buy" ? "Bought" : "Sold"} ${NAME[key]}|Trade failed)/`, { timeout: 150000 });
  if (await page.getByText("Trade failed").count()) {
    const said = (await page.locator("text=Trade failed").first().locator("..").innerText().catch(() => "")).replace(/\s+/g, " ");
    throw new Error(`the app said: ${said.slice(0, 220)}`);
  }
  await page.screenshot({ path: `${SHOTS}${display}-${side}.png` });
  // the user signed one message (signArbitrary); the account checked it on chain and traded
  const signed = await page.evaluate(() => window.__qorexMock.requests.filter((r) => r.method.endsWith("signArbitrary") && r.outcome === "ok").length);
  assert(signed > 0, "the message was signed in QoreX");
  const tx = await accountTx(t0);
  assert(tx.recipient?.toLowerCase() === D.accountFactory.toLowerCase(), `sent to the account factory (${tx.recipient})`);
  assert(tx.executed, "the cross-VM call executed");
  assert(tx.hybridSigner && tx.hybridSigner !== me.native, `hybrid-signed (ML-DSA-87) by a relayer, not the user (${tx.hybridSigner})`);
  assert(!tx.window, "no EVM window involved");
  return { hash: tx.hash, types: ["DarwinAccountFactory.execute"] };
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
  await page.getByRole("button", { name: "$50" }).click({ timeout: 15000 });
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

await check("Security tab: oracle feeds, rounds, rules, how Darwin signs (no EVM window), contracts", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await tab("Security");
  await page.waitForSelector("text=Post-quantum oracle", { timeout: 30000 });
  await page.waitForSelector("text=QWAKK/USD", { timeout: 30000 });
  await page.waitForSelector("text=/^#\\d+$/", { timeout: 30000 });
  await page.waitForSelector("text=Who can do what");
  await page.waitForSelector("text=How Darwin signs");
  await page.waitForSelector("text=no EVM window open", { timeout: 30000 });
  await page.waitForSelector("text=DarwinRouter", { timeout: 30000 });
  await page.waitForSelector(`text=${D.router}`, { timeout: 30000 });
  return "all sections";
});

await check("a round's link opens Darwin's transaction page with the decoded round and its PQ evidence", async () => {
  // Darwin's own tx page (not the external explorer); the href carries the base path, if any
  const href = await page.locator("a[href*='/tx/']:not([href^='http'])").first().getAttribute("href");
  await page.goto(new URL(href, page.url()).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=/Oracle round #\\d+/", { timeout: 30000 });
  // the keeper's round is a MsgCrossVMCall hybrid-signed by the chain's verdict, with no EVM window
  await page.waitForSelector("text=secp256k1 + ML-DSA-87, verified", { timeout: 15000 });
  await page.waitForSelector("text=qorechain-diana (testnet)");
  // the reporter's ML-DSA-87 signature, re-verified in the page with @qorechain/pqc
  await page.waitForSelector("[data-browser-check]", { timeout: 60000 });
  assert((await page.locator("[data-browser-check]").getAttribute("data-browser-check")) === "true", "round verified in the browser, next round rejected");
  return `${href}, ML-DSA-87 re-verified in the browser`;
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
  const addrs = await page.evaluate(() => window.__qorexMock.addresses());
  me = { native: addrs.native };
  connected = true;
  await ensureConnected();
  await tab("Portfolio");
  await page.waitForSelector("text=Portfolio value", { timeout: 30000 });
  return addrs.native;
});

await check("the account menu shows the account's registered ML-DSA-87 key (@qorechain/react)", async () => {
  await page.locator(".account-menu > button").first().click({ timeout: 15000 });
  await page.waitForSelector("[data-pqc-badge=true]", { timeout: 30000 });
  const text = await page.locator("[data-pqc-badge]").innerText();
  await page.keyboard.press("Escape");
  return text;
});

// the user's DarwinAccount: where the trades below settle
// (null in a subset run without the connect check: the trade checks then need it in ONLY too)
const acct = !me ? null : (await acctInfo()).account;

/** The wallet's fUSD, as the trade card showed it during the last vaultCapacity(). */
let lastAvailable = Infinity;

/** What the vault can fill for this basket right now, as the trade card states it. */
async function vaultCapacity(display) {
  await openBasket(display);
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  // Just under the wallet's balance: above it, "Not enough fUSD" takes precedence over liquidity.
  // the balances load after the card: wait for a non-zero balance (up to 20 s)
  let avail = 0;
  for (let i = 0; i < 40 && !(avail > 0); i++) {
    avail = Number((await page.getByText(/^Available /).first().innerText()).match(/([\d,.]+)/)[1].replace(/,/g, ""));
    if (!(avail > 0)) await sleep(500);
  }
  await page.getByLabel("You spend").fill(String(Math.floor(avail * 0.99 * 100) / 100));
  const msg = page.getByText(/The vault can fill about \$/).first();
  lastAvailable = avail;
  if (!(await msg.waitFor({ timeout: 8000 }).then(() => true, () => false))) return Infinity;
  return Number((await msg.innerText()).match(/\$([\d,.]+)/)[1].replace(/,/g, ""));
}

// The QOR baskets are bounded by the reserve's QOR and QWAKK at their market prices (a testnet QOR
// is worth $0.003): the buy is sized to half of what the vault can fill, capped at the target.
for (const [display, key, target] of [["BLUEdw", "BLUEDW", 1], ["BALdw", "BALDW", 1], ["QOREdw", "QOREDW", 10], ["DEGENdw", "DEGENDW", 5]]) {
  await check(`buy ${display} (up to ${target} fUSD) in one QoreX approval`, async () => {
    const cap = await vaultCapacity(display);
    const usd = Math.min(target, Math.floor(cap * 0.5 * 1e4) / 1e4, Math.floor(lastAvailable * 0.4 * 100) / 100);
    if (usd < 0.002) throw new Skip(`the vault can fill only $${cap} of ${display}: refill the reserve (ops/src/refill.ts)`);
    const s0 = await bal(D.baskets[key].address, acct);
    const r = await trade({ display, key, side: "buy", amount: usd });
    const s1 = await until(() => bal(D.baskets[key].address, acct), (v) => v > s0, `${display} shares above ${s0}`);
    return `${usd} fUSD (vault capacity ${cap === Infinity ? "above the balance" : `$${cap}`}) -> +${(Number(s1 - s0) / 1e18).toFixed(4)} ${display} on the Darwin account, one message signed in QoreX, ML-DSA-87 checked on chain, the transaction hybrid-signed by the relayer, no window, tx ${r.hash}`;
  });
}

await check("the position shows on the trade card after a buy", async () => {
  await openBasket("BALdw");
  // the position comes from EVM reads in the browser, after the page itself
  await page.waitForSelector("text=/ BALdw$/", { timeout: 60000 });
  return await page.locator("text=/ BALdw$/").first().innerText();
});

await check("sell half of BALdw for fUSD", async () => {
  const shares = await bal(D.baskets.BALDW.address, acct);
  const u0 = await bal(D.tokens.fUSD, acct);
  const r = await trade({ display: "BALdw", key: "BALDW", side: "sell", amount: (Math.floor(Number(shares) / 1e18 / 2 * 1e6) / 1e6).toFixed(6) });
  const u1 = await until(() => bal(D.tokens.fUSD, acct), (v) => v > u0, `fUSD above ${u0}`);
  return `+${(Number(u1 - u0) / 1e6).toFixed(3)} fUSD on the Darwin account, tx ${r.hash}`;
});

await check("a trade's page re-verifies the user's ML-DSA-87 signature in the browser", async () => {
  const last = results.filter((x) => x.ok && /tx (0x[0-9a-f]{64}|[0-9A-F]{64})$/.test(x.detail)).at(-1);
  assert(last, "a trade hash from an earlier check");
  const hash = last.detail.match(/tx (0x[0-9a-f]{64}|[0-9A-F]{64})$/)[1];
  await page.goto(`${BASE}/tx/${hash}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-browser-check]", { timeout: 60000 });
  const text = await page.locator("[data-browser-check]").innerText();
  assert((await page.locator("[data-browser-check]").getAttribute("data-browser-check")) === "true", text);
  return `${hash.slice(0, 12)}…: ${text}`;
});

await check("a buy above the account's fUSD deposits the rest from QoreX first (one MsgSend), then one signature", async () => {
  const before = BigInt((await acctInfo()).fusd);
  const amount = Math.ceil(Number(before) / 1e6 + 1);
  const sends0 = await page.evaluate(() => window.__qorexMock.requests.filter((r) => r.method.endsWith("signAndBroadcast") && r.outcome === "ok").length);
  const r = await trade({ display: "BLUEdw", key: "BLUEDW", side: "buy", amount });
  const sends = await page.evaluate(() => window.__qorexMock.requests.filter((r) => r.method.endsWith("signAndBroadcast") && r.outcome === "ok"));
  assert(sends.length === sends0 + 1, `one QoreX transaction (${sends.length - sends0})`);
  const msgs = (sends.at(-1).params?.[0]?.messages ?? sends.at(-1).request?.messages ?? []).map((m) => m.typeUrl);
  assert(!msgs.length || msgs.every((t) => t === "/cosmos.bank.v1beta1.MsgSend"), `the deposit is a MsgSend (${msgs})`);
  return `account had ${(Number(before) / 1e6).toFixed(2)} fUSD, bought ${amount}: deposit (MsgSend) + one signed message, tx ${r.hash}`;
});

await check("Portfolio withdraws the account's fUSD back to QoreX with one signed message", async () => {
  const info = await acctInfo();
  if (BigInt(info.fusd) === 0n) throw new Skip("no fUSD on the Darwin account");
  await tab("Portfolio");
  const link = page.getByRole("button", { name: /^Withdraw .* fUSD to QoreX$/ });
  await link.waitFor({ timeout: 30000 });
  await link.click({ timeout: 15000 });
  await page.waitForSelector("text=/^(Withdrew |Withdrawal failed)/", { timeout: 120000 });
  if (await page.getByText("Withdrawal failed").count()) {
    await page.screenshot({ path: `${SHOTS}withdraw-failed.png` });
    throw new Error(`withdrawal failed: ${(await page.locator("text=Withdrawal failed").locator("..").innerText()).slice(0, 300)}`);
  }
  await until(async () => BigInt((await acctInfo()).fusd), (v) => v === 0n, "the account's fUSD at 0");
  return `${(Number(info.fusd) / 1e6).toFixed(2)} fUSD back in the QoreX wallet`;
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
  // the guard only shows when a vault can fill less than this wallet holds
  const cap = await vaultCapacity("QOREdw");
  if (cap === Infinity) throw new Skip("every vault can fill more than the test wallet holds (QOREdw's reserve is the shallowest)");
  await page.getByLabel("You spend").fill(String(Math.ceil(cap * 102) / 100));
  const btn = page.getByRole("button", { name: "Above available liquidity" });
  await btn.waitFor({ timeout: 30000 });
  assert(await btn.isDisabled(), "disabled");
  return await page.locator("text=/The vault can fill about/").innerText();
});

await check("a signature declined in QoreX shows a toast and sends nothing", async () => {
  await openBasket("BALdw");
  await page.waitForSelector("text=/^Available /", { timeout: 30000 });
  const before = await acctInfo();
  await page.evaluate(() => window.__qorexMock.rejectNext());
  await page.getByLabel("You spend").fill("0.5");
  const cta = page.getByRole("button", { name: `Buy ${NAME.BALDW}`, exact: true });
  for (let i = 0; i < 40 && (await cta.isDisabled()); i++) await sleep(500);
  await cta.click({ timeout: 15000 });
  await page.waitForSelector("text=/Trade cancelled|Trade failed/", { timeout: 30000 });
  const last = await page.evaluate(() => window.__qorexMock.requests.at(-1));
  assert(last.outcome !== "ok", `outcome ${last.outcome}`);
  // nothing sent: the account's nonce and balances are what they were before (not "zero":
  // the test wallet's account holds funds from earlier runs)
  await sleep(6000);
  const after = await acctInfo();
  assert(after.nonce === before.nonce && after.fusd === before.fusd && after.shares.BALDW === before.shares.BALDW, `account unchanged (nonce ${before.nonce} -> ${after.nonce}, fUSD ${before.fusd} -> ${after.fusd})`);
  return `outcome ${last.outcome}; nonce ${after.nonce} and balances unchanged`;
});

await check("Activity lists the account's trades from the chain", async () => {
  await sleep(8000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await ensureConnected();
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
  await ensureConnected();
  await page.getByRole("button", { name: new RegExp(me.native.slice(0, 8)) }).first().click({ timeout: 15000 });
  await page.getByRole("menuitem", { name: "Disconnect" }).click({ timeout: 15000 });
  connected = false;
  await page.getByRole("button", { name: "Connect wallet" }).first().waitFor({ timeout: 10000 });
  return "back to Connect wallet";
});

/**
 * Leave the test wallet as it was: every position on its DarwinAccount sold for fUSD and the fUSD
 * withdrawn to the wallet, each by one message signed like QoreX's signArbitrary (the wallet's own
 * keys, from the mnemonic), so the suite can run again and again without topping it up.
 */
await check("exit: sell every position and withdraw the fUSD to the wallet (signed messages)", async () => {
  if (!me) throw new Skip("not connected in this run");
  const classicalKey = deriveClassicalKey({ mnemonic });
  const pqKey = deriveCanonicalPqKey({ mnemonic, address: me.native });
  const callsType = [{ type: "tuple[]", components: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }] }];
  const routerAbi = parseAbi(["function sell(address basket, uint256 shares, uint256 minUsdOut, address to) returns (uint256)", "function quoteSell(address basket, uint256 shares) view returns (uint256, uint256)"]);
  const tokAbi = parseAbi(["function approve(address, uint256) returns (bool)", "function transfer(address, uint256) returns (bool)"]);
  const execute = async (calls, summary) => {
    const a = await acctInfo();
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
    const text = `${summary}\n\nDarwin account ${a.account.toLowerCase()}\nnonce ${a.nonce}\nvalid until ${deadline}\ncalls ${keccak256(encodeAbiParameters(callsType, [calls]))}`;
    const signature = signMessage({ chainId: "qorechain-diana", signer: me.native, data: text, classicalKey, pqKey });
    const r = await fetch(`${BASE}/api/relay/execute`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: me.native, calls, summary, deadline: String(deadline), signature }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${summary}: ${j.error ?? r.status}`);
    // the next message needs the next nonce: wait for it (load-balanced RPC)
    await until(async () => BigInt((await acctInfo()).nonce), (n) => n > BigInt(a.nonce), "the account's nonce to move");
    return j;
  };
  const out = [];
  for (const [key, b] of Object.entries(D.baskets)) {
    const a = await acctInfo();
    const shares = BigInt(a.shares[key] ?? 0);
    if (shares === 0n) continue;
    const [q] = await evm.readContract({ address: D.router, abi: routerAbi, functionName: "quoteSell", args: [b.address, shares] });
    const calls = [];
    if (BigInt(a.allowance[key] ?? 0) < shares) calls.push({ target: b.address, data: encodeFunctionData({ abi: tokAbi, functionName: "approve", args: [D.router, maxUint256] }) });
    calls.push({ target: D.router, data: encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [b.address, shares, (q * 98n) / 100n, a.account] }) });
    await execute(calls, `Darwin: Sell ${(Number(shares) / 1e18).toFixed(6)} ${key}`);
    out.push(`${key} sold`);
  }
  const a = await acctInfo();
  if (BigInt(a.fusd) > 0n) {
    await execute([{ target: D.tokens.fUSD, data: encodeFunctionData({ abi: tokAbi, functionName: "transfer", args: [a.relayer.evm, BigInt(a.fusd)] }) }], `Darwin: Withdraw ${(Number(a.fusd) / 1e6).toFixed(2)} fUSD to QoreX`);
    out.push(`${(Number(a.fusd) / 1e6).toFixed(2)} fUSD withdrawn`);
  }
  const bank = async () => BigInt((await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${me.native}`)).json()).balances.find((x) => x.denom === `erc20:${D.tokens.fUSD}`)?.amount ?? 0);
  const after = await until(bank, (v) => v > 0n, "fUSD back in the wallet");
  return `${out.join(", ") || "nothing to sell"}; the wallet holds ${(Number(after) / 1e6).toFixed(2)} fUSD`;
});

await check("no uncaught errors in the page", async () => {
  assert(consoleErrors.length === 0, consoleErrors.join(" | "));
  return "none";
});

await browser.close();
const passed = results.filter((r) => r.ok).length;
const skipped = results.filter((r) => r.skip).length;
console.log(`\n${passed}/${results.length} passed${skipped ? `, ${skipped} skipped` : ""}`);
// seconds in the name, and a subset run (ONLY=...) never takes a full run's name
const date = new Date().toISOString().slice(0, 19).replace(/:/g, "");
const reportFile = `browser-${date}${ONLY ? "-subset" : ""}.md`;
const dir = new URL("../../docs/e2e/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(
  `${dir}${reportFile}`,
  [
    `# Browser E2E run, ${new Date().toISOString()}`,
    "",
    `The Darwin front (mainnet design) at ${BASE}, QoreX test double (real hybrid signing), qorechain-diana. Suite: \`app/e2e/suite.mjs\`. Result: **${passed}/${results.length} passed${skipped ? `, ${skipped} skipped` : ""}**${ONLY ? ` (subset: \`ONLY=${process.env.ONLY}\`)` : ""}.`,
    "",
    "| | Check | Detail | Time |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.ok ? "PASS" : r.skip ? "SKIP" : "FAIL"} | ${r.name} | ${String(r.detail).replace(/\|/g, "\\|")} | ${(r.ms / 1000).toFixed(1)}s |`),
    "",
  ].join("\n"),
);
console.log(`report: docs/e2e/${reportFile}`);
if (passed !== results.length) process.exitCode = 1;
