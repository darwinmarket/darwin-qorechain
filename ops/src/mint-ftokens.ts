/**
 * Mint more fQOR and fQWAKK into the reserve, each mint authorised by the admin's ML-DSA-87
 * signature (DarwinTestToken.mint).
 *
 *   tsx src/mint-ftokens.ts <usdEach>      e.g. 250000
 */
import { encodeAbiParameters, parseAbiParameters, type Hex } from "viem";
import { adminCall, artifact, loadDeployments } from "./evm.js";
import { fetchPrices } from "./prices.js";

const usdEach = Number(process.argv[2]);
if (!(usdEach > 0)) throw new Error("usage: mint-ftokens.ts <usdEach>");
const d = loadDeployments();
const p = await fetchPrices();
const abi = artifact("DarwinTestToken").abi;
for (const [sym, price, dec] of [["fQOR", p.QOR, 18], ["fQWAKK", p.QWAKK, 6]] as const) {
  if (!Number.isFinite(price)) throw new Error(`no ${sym} price right now`);
  const amount = BigInt(Math.floor((usdEach / price) * 1e6)) * 10n ** BigInt(dec - 6);
  const params = encodeAbiParameters(parseAbiParameters("address, uint256"), [d.reserve, amount]) as Hex;
  const r = await adminCall(d.tokens[sym], abi, "mint", "mint", params, [d.reserve, amount]);
  console.log(`reserve <- ${amount} ${sym} (~$${usdEach}, ML-DSA-87 admin signature, ${r.transactionHash})`);
}
