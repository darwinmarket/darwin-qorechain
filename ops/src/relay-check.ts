/**
 * End-to-end check of the relayer path, signing as QoreX would (the treasury account is a QoreX
 * account: same mnemonic, coin 118):
 *   1. grant the relayer MsgCrossVMCall and MsgConvertCoin for 24 hours (MsgGrant, hybrid-signed);
 *   2. sign a buy intent with QoreSign's signMessage (message-signing-v1: ADR-36 + ML-DSA-87);
 *   3. the relayer verifies it and executes it through MsgExec; then a forged and a replayed intent
 *      must be refused.
 *
 *   tsx src/relay-check.ts [basketKey=BALDW] [fUSD=1]
 */
import { randomBytes } from "node:crypto";
import { parseUnits, type Address } from "viem";
import { deriveCanonicalPqKey, deriveClassicalKey, signMessage } from "@qorechain/qoresign";
import { mnemonic } from "./accounts.js";
import { artifact, loadDeployments } from "./evm.js";
import { publicClient } from "./net.js";
import { treasuryClient } from "./nativeClient.js";
import { evmTwin } from "./crossvm.js";
import { status, trade, type Intent } from "./relayer.js";

const [key = "BALDW", usd = "1"] = process.argv.slice(2);
/** cosmos.authz.v1beta1.GenericAuthorization { msg = 1 }, hand-encoded */
const genericAuthorization = (msg: string) => {
  const b = Buffer.from(msg);
  return Uint8Array.from([0x0a, b.length, ...b]);
};
const d = loadDeployments();
const { client, address } = await treasuryClient();
const st0 = await status(address);

if (!st0.grants.crossvm || !st0.grants.convert) {
  const expiration = new Date(Date.now() + 24 * 3600 * 1000);
  const grant = (msg: string) => ({
    typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
    value: { granter: address, grantee: st0.relayer, grant: { authorization: { typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization", value: genericAuthorization(msg) }, expiration: { seconds: BigInt(Math.floor(expiration.getTime() / 1000)), nanos: 0 } } },
  });
  const r: any = await client.signAndBroadcast([grant("/qorechain.crossvm.v1.MsgCrossVMCall"), grant("/cosmos.evm.erc20.v1.MsgConvertCoin")], "auto", "Darwin: authorize the trade relayer for 24 hours");
  console.log("grants", r.code, r.transactionHash);
  await new Promise((res) => setTimeout(res, 5000));
}
console.log("status", JSON.stringify(await status(address)));

const basket = d.baskets[key].address as Address;
const routerAbi = artifact("DarwinRouter").abi;
const amount = parseUnits(usd, 6);
const [shares] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, amount] })) as [bigint];
const intent: Intent = {
  darwin: "trade-v1", chainId: "qorechain-diana", account: address, action: "buy", basket,
  amount: amount.toString(), min: ((shares * 99n) / 100n).toString(), nonce: randomBytes(12).toString("hex"),
  expires: Math.floor(Date.now() / 1000) + 300,
};
const text = JSON.stringify(intent);
const m = mnemonic();
const classicalKey = deriveClassicalKey({ mnemonic: m });
const pqKey = deriveCanonicalPqKey({ mnemonic: m, address });
const signature = signMessage({ chainId: "qorechain-diana", signer: address, data: text, classicalKey, pqKey });

const twin = evmTwin(address) as Address;
const bal = async () => (await publicClient.readContract({ address: basket, abi: artifact("WQOR").abi, functionName: "balanceOf", args: [twin] })) as bigint;
const before = await bal();
const r = await trade(text, signature);
await new Promise((res) => setTimeout(res, 5000));
console.log(`buy ${usd} fUSD of ${key}: ${r.txHash} [${r.messages.join(", ")}], shares ${Number(before) / 1e18} -> ${Number(await bal()) / 1e18}`);

const refuse = async (label: string, t: string, s: typeof signature) => {
  try {
    await trade(t, s);
    console.log(`FAIL ${label}: accepted`);
  } catch (e: any) {
    console.log(`refused ${label}: ${String(e?.message ?? e).slice(0, 120)}`);
  }
};
await refuse("replay of the same intent", text, signature);
await refuse("intent with a different amount, same signature", JSON.stringify({ ...intent, amount: (amount * 10n).toString(), nonce: randomBytes(12).toString("hex") }), signature);
