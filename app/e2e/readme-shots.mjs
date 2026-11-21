// The README's screenshots, taken from production and the QoreChain explorer (headless Chromium,
// 2x). Each image is cropped to one section of a page.
//
//   node e2e/readme-shots.mjs [tradeHash] [roundHash]     -> docs/img/*.png
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "https://darwin.market/qorechain";
const TRADE = process.argv[2] ?? "26B978E8CC71556015E2801A3D2BFA839538FC11E2D17BACDDAF9585C7F0989C";
const ROUND = process.argv[3] ?? "FA81D6D17FA4BC40FD1C3F027204EF79A0DD5253782DC8489E9B8A29B601D720";
const OUT = new URL("../../docs/img/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/** The box of the element whose own text is exactly `text` (the smallest one). */
const textBox = (page, text) =>
  page.evaluate((t) => {
    const all = [...document.querySelectorAll("body *")].filter((e) => e.textContent?.trim() === t && e.getBoundingClientRect().height > 0);
    const el = all.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height };
  }, text);

/** The box of the card that holds `text`: its nearest ancestor drawn as a rounded panel. */
const cardBox = (page, text) =>
  page.evaluate((t) => {
    const all = [...document.querySelectorAll("body *")].filter((e) => e.textContent?.trim().startsWith(t) && e.getBoundingClientRect().height > 0);
    let el = all.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
    while (el && el !== document.body) {
      const s = getComputedStyle(el);
      if (parseFloat(s.borderTopLeftRadius) >= 8 && el.getBoundingClientRect().height > 60 && (s.borderTopWidth !== "0px" || s.backgroundColor !== "rgba(0, 0, 0, 0)")) break;
      el = el.parentElement;
    }
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height };
  }, text);

/** The section under heading `text`: everything down to the next heading, its last card included. */
const afterHeading = (page, text) =>
  page.evaluate((t) => {
    const hs = [...document.querySelectorAll("h1,h2,h3")].filter((e) => e.getBoundingClientRect().height > 0);
    const i = hs.findIndex((e) => e.textContent?.trim() === t);
    const h = hs[i];
    const top = h.getBoundingClientRect().bottom;
    const limit = hs[i + 1]?.getBoundingClientRect().top ?? Infinity;
    // the lowest bottom of any visible element between the heading and the next one
    let bottom = top;
    for (const e of document.querySelectorAll("body *")) {
      const r = e.getBoundingClientRect();
      if (r.height > 0 && r.top >= top - 1 && r.bottom <= limit && r.bottom > bottom && r.height < 2000) bottom = r.bottom;
    }
    const r = h.getBoundingClientRect();
    return { x: r.x, y: top + scrollY, w: h.parentElement.getBoundingClientRect().width, h: bottom - top };
  }, text);

/** Screenshot from the top of box `a` to the bottom of box `b`, padded. */
async function shot(page, name, a, b, pad = 18) {
  const x = Math.min(a.x, b.x) - pad;
  const y = a.y - pad;
  const w = Math.max(a.x + a.w, b.x + b.w) - x + pad;
  const h = b.y + b.h - y + pad;
  await page.screenshot({ path: `${OUT}${name}.png`, clip: { x, y, width: w, height: h }, fullPage: true });
  console.log(`docs/img/${name}.png  ${Math.round(w)}x${Math.round(h)}`);
}

// ---- Darwin: the Security tab, a round, a trade ------------------------------------------------
const app = await browser.newPage({ viewport: { width: 1280, height: 4200 }, deviceScaleFactor: 2 });
await app.goto(APP, { waitUntil: "domcontentloaded" });
await app.getByRole("button", { name: "Security", exact: true }).first().click();
await app.waitForSelector("text=How Darwin signs", { timeout: 60000 });
await app.waitForSelector("text=/^#\\d+$/", { timeout: 60000 });
await app.waitForTimeout(4000);
await shot(app, "security-oracle", await textBox(app, "Post-quantum oracle"), await afterHeading(app, "Recent rounds"));
const signsNote = await app.evaluate(() => {
  const h = [...document.querySelectorAll("h1,h2,h3")].find((e) => e.textContent?.trim() === "How Darwin signs");
  let el = h?.parentElement;
  while (el && !el.textContent?.includes("cannot move anything")) el = el.parentElement;
  const n = [...(el ?? document.body).querySelectorAll("*")].filter((e) => e.textContent?.includes("cannot move anything") && e.children.length === 0)[0];
  const r = (n ?? h).getBoundingClientRect();
  return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height };
});
await shot(app, "security-rules", await textBox(app, "Who can do what"), signsNote);

await app.goto(`${APP}/tx/${ROUND}`, { waitUntil: "domcontentloaded" });
await app.waitForSelector("[data-browser-check]", { timeout: 90000 });
await app.waitForTimeout(1500);
await shot(app, "round-evidence", await textBox(app, "What it did"), await afterHeading(app, "Post-quantum evidence"));

await app.goto(`${APP}/tx/${TRADE}`, { waitUntil: "domcontentloaded" });
await app.waitForSelector("[data-browser-check]", { timeout: 90000 });
await app.waitForTimeout(1500);
await shot(app, "tx-what", await textBox(app, "Transaction"), await afterHeading(app, "What it did"));
await shot(app, "tx-evidence", await textBox(app, "Post-quantum evidence"), await afterHeading(app, "Post-quantum evidence"));

// ---- the same trade on the QoreChain explorer (testnet, dark) ----------------------------------
const ctx = await browser.newContext({ viewport: { width: 1280, height: 2400 }, deviceScaleFactor: 2, colorScheme: "dark" });
await ctx.addCookies([{ name: "qore-network", value: "testnet", domain: "explore.qore.network", path: "/" }]);
const ex = await ctx.newPage();
await ex.goto(`https://explore.qore.network/tx/${TRADE}`, { waitUntil: "domcontentloaded" });
await ex.waitForSelector("text=Signature security", { timeout: 60000 });
await ex.waitForTimeout(3000);
const summary = await cardBox(ex, "Hash");
await shot(ex, "explorer-summary", summary, summary, 6);
const msg = await cardBox(ex, "Messages (1)");
await shot(ex, "explorer-message", msg, msg, 6);
const sig = await cardBox(ex, "Signature security");
await shot(ex, "explorer-signature", sig, sig, 6);

await browser.close();
