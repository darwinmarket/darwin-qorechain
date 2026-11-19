// End-to-end: buy and sell a basket from the browser, signed by the QoreX mock (real hybrid
// secp256k1 + ML-DSA-87 signing, real broadcast to qorechain-diana).
//
//   QORE_MNEMONIC=... node e2e/trade.mjs [BASKET_DISPLAY] [fUSD]
//   (or put the testnet mnemonic in ~/.config/qorechain/testnet.mnemonic)
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { chromium } from "playwright";
import { createQorexMock } from "@qorechain/qorex-wallet-mock";

const BASE = process.env.APP_URL ?? "http://localhost:3032";
const basket = process.argv[2] ?? "BLUEdw";
const usd = process.argv[3] ?? "2";
const file = `${homedir()}/.config/qorechain/testnet.mnemonic`;
const mnemonic = process.env.QORE_MNEMONIC ?? (existsSync(file) ? readFileSync(file, "utf8").trim() : null);
if (!mnemonic) throw new Error("set QORE_MNEMONIC");

const mock = createQorexMock({ profile: "current", mnemonic, chainId: "qorechain-diana", rest: `${BASE}/api/rest` });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 200)));
await page.addInitScript({ content: mock.initScript() });

await page.goto(`${BASE}/basket/${basket}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Connect QoreX" }).first().click();
await page.waitForSelector("text=/Balance/", { timeout: 30000 });
console.log("connected:", await page.evaluate(() => window.__qorexMock.addresses()));

// ---- buy ----
await page.getByLabel("fUSD to pay").fill(usd);
await page.waitForSelector("text=You receive (about)", { timeout: 30000 });
await page.getByRole("button", { name: new RegExp(`^Buy ${basket}$`) }).last().click();
const ok = await page.waitForSelector("text=/^Bought\\./", { timeout: 120000 }).catch(() => null);
const err = await page.$("text=/failed|Error|error/");
console.log("buy:", ok ? (await ok.innerText()).slice(0, 200) : `no confirmation ${err ? await err.innerText() : ""}`);
await page.screenshot({ path: "/tmp/darwin-shots/e2e-buy.png" });

// ---- sell half ----
await page.waitForTimeout(4000);
await page.getByRole("tab", { name: `Sell ${basket}` }).click();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Max" }).click();
const max = await page.getByLabel(`${basket} to sell`).inputValue();
await page.getByLabel(`${basket} to sell`).fill(String(Number(max) / 2));
await page.waitForSelector("text=You receive (about)", { timeout: 30000 });
await page.getByRole("button", { name: new RegExp(`^Sell ${basket}$`) }).last().click();
const sold = await page.waitForSelector("text=/^Sold\\./", { timeout: 120000 }).catch(() => null);
console.log("sell:", sold ? (await sold.innerText()).slice(0, 200) : "no confirmation");
await page.screenshot({ path: "/tmp/darwin-shots/e2e-sell.png" });

const reqs = await page.evaluate(() => window.__qorexMock.requests.filter((r) => r.method.endsWith("signAndBroadcast")).map((r) => ({ outcome: r.outcome, result: r.result })));
console.log(JSON.stringify(reqs, null, 1).slice(0, 1500));
await browser.close();
