/**
 * Put a QoreX account in the state a user reaches through Darwin's setup, for tests: an open EVM
 * access window (what QoreX's "EVM access window" screen does) and the 24-hour authz grants to
 * Darwin's relayer (what the app's "Authorize" button asks QoreX to sign). Both hybrid-signed.
 * Does nothing that is already in place.
 *
 *   tsx src/relay-setup.ts            for the treasury account (the browser suite's QoreX account)
 */
import { openEvmWindowMsg } from "@qorechain/sdk";
import { evmWindowCost } from "@qorechain/evm";
import { treasuryClient } from "./nativeClient.js";
import { status } from "./relayer.js";

/** cosmos.authz.v1beta1.GenericAuthorization { msg = 1 }, hand-encoded */
const genericAuthorization = (msg: string) => {
  const b = Buffer.from(msg);
  return Uint8Array.from([0x0a, b.length, ...b]);
};

export async function ensureRelaySetup() {
  const { client, address } = await treasuryClient();
  let st = await status(address);
  const done: string[] = [];
  if (!st.window.live || Number(st.window.remainingBlocks ?? 0) < 300 || Number(st.window.remainingTxs ?? 0) < 20) {
    const maxTxs = 200n;
    const maxValue = evmWindowCost({ gas: 3_000_000n, maxFeePerGas: 250_000_000_000n }) * maxTxs;
    const r: any = await client.signAndBroadcast([openEvmWindowMsg({ sender: address, blocks: 17_000n, maxTxs, maxValue } as any)], "auto", "EVM access window for Darwin trades");
    if (r.code) throw new Error(`window: ${r.rawLog}`);
    done.push(`window ${r.transactionHash}`);
  }
  if (!st.grants.crossvm || !st.grants.convert) {
    const expiration = BigInt(Math.floor(Date.now() / 1000) + 24 * 3600);
    const grant = (msg: string) => ({
      typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
      value: { granter: address, grantee: st.relayer, grant: { authorization: { typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization", value: genericAuthorization(msg) }, expiration: { seconds: expiration, nanos: 0 } } },
    });
    const r: any = await client.signAndBroadcast([grant("/qorechain.crossvm.v1.MsgCrossVMCall"), grant("/cosmos.evm.erc20.v1.MsgConvertCoin")], "auto", "Darwin: authorize the trade relayer for 24 hours");
    if (r.code) throw new Error(`grants: ${r.rawLog}`);
    done.push(`grants ${r.transactionHash}`);
  }
  if (done.length) await new Promise((res) => setTimeout(res, 6000));
  st = await status(address);
  return { address, done, status: st };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await ensureRelaySetup();
  console.log(JSON.stringify(r));
}
