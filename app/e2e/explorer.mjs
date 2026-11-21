// What the QoreChain explorer says about each kind of Darwin transaction. For every kind, the
// latest one on chain is opened at explore.qore.network (cookie qore-network=testnet: the explorer
// opens on mainnet otherwise), and its page must read "Signature security quantum-safe verified
// on-chain" with ML-DSA-87. An old EVM transaction (ECDSA alone, before the native lane) is the
// control: the explorer must NOT call it quantum-safe.
//
//   node e2e/explorer.mjs            # no key needed: public REST and the public explorer
//
// Report: docs/e2e/explorer-<date>.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const REST = "https://api-testnet.qore.host";
const EXPLORER = "https://explore.qore.network";
// Darwin's public accounts (coin 60): the deployer (keeper, admin) and the four relayers
const DEPLOYER = "qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p";
const RELAYERS = [
  "qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf",
  "qor1cuvn9meqz0ysflpkc3fql52nq7lrmvgnj3u4zg",
  "qor1rsp00u4r2vpd96hkcuwxl8w7ch3lfxj2z2tzjf",
  "qor1ljnamh3un2jyt5hq2kf832gt4wugf77v2yku3f",
];
// the control: the deployer's last EVM transaction (an ECDSA-only test, sent on purpose just
// before the EVM windows were closed on 2026-11-21)
const CONTROL = process.env.CONTROL ?? null;

async function txsOf(sender, pages = 5) {
  const out = [];
  for (let page = 1; page <= pages; page++) {
    const qs = new URLSearchParams({ query: `message.sender='${sender}'`, order_by: "ORDER_BY_DESC", "pagination.limit": "100", page: String(page) });
    const j = await (await fetch(`${REST}/cosmos/tx/v1beta1/txs?${qs}`)).json();
    out.push(...(j.tx_responses ?? []));
    if ((j.tx_responses ?? []).length < 100) break;
  }
  return out;
}
const types = (t) => t.tx.body.messages.map((m) => m["@type"].split(".").at(-1));
const memo = (t) => String(t.tx.body.memo ?? "");
const ok = (t) => t.code === 0;

const dep = await txsOf(DEPLOYER, 30);
const rel = (await Promise.all(RELAYERS.map((r) => txsOf(r, 2)))).flat().sort((a, b) => Number(b.height) - Number(a.height));
const withdrawExec = new Set(rel.map((t) => /^darwin withdraw ([0-9A-F]{64})$/.exec(memo(t))?.[1]).filter(Boolean));
const pick = (list, f) => list.find((t) => ok(t) && f(t))?.txhash;
const control = CONTROL ?? dep.find((t) => ok(t) && types(t).includes("MsgEthereumTx"))?.txhash;
const depositConv = rel.find((t) => ok(t) && /^darwin deposit [0-9A-F]{64}$/.test(memo(t)));

const kinds = [
  ["trade (buy or sell) through a DarwinAccount, relayer", pick(rel, (t) => memo(t).startsWith("darwin execute ") && !withdrawExec.has(t.txhash))],
  ["withdrawal from a DarwinAccount, relayer (account -> relayer)", pick(rel, (t) => withdrawExec.has(t.txhash))],
  ["withdrawal conversion back to the wallet, relayer (MsgConvertERC20)", pick(rel, (t) => memo(t).startsWith("darwin withdraw "))],
  ["deposit conversion onto the account, relayer (MsgConvertCoin)", depositConv?.txhash],
  ["deposit sent by the user (MsgSend, QoreX-style hybrid)", depositConv && memo(depositConv).split(" ")[2]],
  ["oracle round, keeper (deployer)", pick(dep, (t) => /^darwin round \d+$/.test(memo(t)))],
  ["rebalance, keeper (deployer)", pick(dep, (t) => /^darwin rebalance\b/.test(memo(t)))],
  ["admin call, deployer (PQ-admin signed, native lane)", pick(dep, (t) => types(t).includes("MsgCrossVMCall") && !/^darwin (round|rebalance)/.test(memo(t)))],
  ["funds: gas and fUSD sent by the deployer (MsgSend)", pick(dep, (t) => types(t).every((x) => x === "MsgSend"))],
  ["funds: ERC-20 to bank conversion, deployer (MsgConvertERC20)", pick(dep, (t) => types(t).includes("MsgConvertERC20"))],
].map(([kind, hash]) => ({ kind, hash, expect: true }));
kinds.push({ kind: "CONTROL: an old EVM transaction (ECDSA alone)", hash: control, expect: false });

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies([{ name: "qore-network", value: "testnet", domain: "explore.qore.network", path: "/" }]);
const page = await ctx.newPage();
const rows = [];
for (const k of kinds) {
  if (!k.hash) {
    rows.push({ ...k, safe: null, ok: false, detail: "no such transaction found on chain" });
    continue;
  }
  let text = "";
  for (let i = 0; i < 3 && !/Signature security/i.test(text); i++) {
    await page.goto(`${EXPLORER}/tx/${k.hash}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForSelector("text=Signature security", { timeout: 30000 }).catch(() => {});
    text = (await page.innerText("body").catch(() => "")).replace(/\s+/g, " ");
  }
  const safe = /Signature security quantum-safe verified on-chain/i.test(text) && /ML-DSA-87/.test(text);
  const verdict = /Signature security ([a-z-]+(?: [a-z-]+)?)/i.exec(text)?.[1] ?? "page not read";
  rows.push({ ...k, safe, ok: safe === k.expect, detail: verdict });
  console.log(`${safe === k.expect ? "PASS" : "FAIL"}  ${k.kind}  ${k.hash}  ${verdict}`);
}
await browser.close();

const passed = rows.filter((r) => r.ok).length;
console.log(`\n${passed}/${rows.length} as expected`);
const date = new Date().toISOString().slice(0, 19).replace(/:/g, "");
const dir = new URL("../../docs/e2e/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
writeFileSync(
  `${dir}explorer-${date}.md`,
  [
    `# Explorer check, ${new Date().toISOString()}`,
    "",
    `Suite \`app/e2e/explorer.mjs\`: the latest Darwin transaction of each kind on qorechain-diana, opened at ${EXPLORER} (testnet). Each must read *Signature security: quantum-safe, verified on-chain* with ML-DSA-87; the control, an old EVM transaction, must not. Result: **${passed}/${rows.length} as expected**.`,
    "",
    "| | Kind | Transaction | Explorer says |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.ok ? "PASS" : "FAIL"} | ${r.kind} | ${r.hash ? `[${r.hash.slice(0, 12)}…](${EXPLORER}/tx/${r.hash})` : "-"} | ${r.detail} |`),
    "",
  ].join("\n"),
);
console.log(`report: docs/e2e/explorer-${date}.md`);
if (passed !== rows.length) process.exitCode = 1;
