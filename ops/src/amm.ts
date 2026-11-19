/**
 * Swap on QoreChain's native AMM (x/amm) from the treasury, hybrid-signed, and move the result to
 * the EVM side. The EVM cannot call the native AMM, so this is how Darwin sources a token that only
 * trades there (QWAKK for the degen basket).
 *
 *   tsx src/amm.ts quote <poolId> <uqorIn>
 *   tsx src/amm.ts buy <poolId> <QOR in> [minOutBase]     QOR -> the pool's other token (bank form)
 *   tsx src/amm.ts to-evm <denom>                          bank coin -> ERC-20 on the deployer
 */
import { evmAccount } from "./accounts.js";
import { treasuryClient } from "./nativeClient.js";
import { CONVERT_COIN_TYPE_URL } from "./erc20Msgs.js";
import { REST } from "./net.js";

interface Pool { id: string; token_a: string; token_b: string; reserve_a: string; reserve_b: string }

export async function pool(id: string): Promise<Pool> {
  return ((await (await fetch(`${REST}/qorechain/amm/v1/pools/${id}`)).json()) as { pool: Pool }).pool;
}

/** Constant-product quote with the module's 30 bps swap fee. */
export function quote(p: Pool, denomIn: string, amountIn: bigint): { denomOut: string; out: bigint } {
  const aIn = p.token_a === denomIn;
  const [rIn, rOut] = aIn ? [BigInt(p.reserve_a), BigInt(p.reserve_b)] : [BigInt(p.reserve_b), BigInt(p.reserve_a)];
  const inNet = (amountIn * 9970n) / 10_000n;
  return { denomOut: aIn ? p.token_b : p.token_a, out: (inNet * rOut) / (rIn + inNet) };
}

export async function bankBalance(address: string, denom: string): Promise<bigint> {
  const j = (await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${address}`)).json()) as { balances: { denom: string; amount: string }[] };
  return BigInt(j.balances.find((b) => b.denom === denom)?.amount ?? "0");
}

export async function buy(poolId: string, qor: number, minOut?: bigint) {
  const p = await pool(poolId);
  const amountIn = BigInt(Math.round(qor * 1e6));
  const q = quote(p, "uqor", amountIn);
  const min = minOut ?? (q.out * 98n) / 100n;
  const { client, address } = await treasuryClient();
  const before = await bankBalance(address, q.denomOut);
  const res: any = await client.signAndBroadcast(
    [{ typeUrl: "/qorechain.amm.v1.MsgSwapExactIn", value: { sender: address, poolId, tokenIn: { denom: "uqor", amount: amountIn.toString() }, denomOut: q.denomOut, minOut: min.toString() } }],
    "auto", `darwin: buy on AMM pool ${poolId}`,
  );
  if (res.code) throw new Error(`swap failed: ${res.rawLog}`);
  const got = (await bankBalance(address, q.denomOut)) - before;
  console.log(`swapped ${qor} QOR on pool ${poolId}: +${got} ${q.denomOut} (quoted ${q.out}), hybrid-signed tx ${res.transactionHash}`);
  return { denom: q.denomOut, got, tx: res.transactionHash as string };
}

export async function toEvm(denom: string, amount?: bigint) {
  const { client, address } = await treasuryClient();
  const amt = amount ?? (await bankBalance(address, denom));
  const receiver = (await evmAccount("deployer")).evm;
  const res: any = await client.signAndBroadcast(
    [{ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom, amount: amt.toString() }, receiver, sender: address } }],
    { amount: [{ denom: "uqor", amount: "80000" }], gas: "700000" }, "darwin: AMM proceeds to EVM",
  );
  if (res.code) throw new Error(`convert failed: ${res.rawLog}`);
  console.log(`converted ${amt} ${denom} -> ${receiver} (tx ${res.transactionHash})`);
  return res.transactionHash as string;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "quote") console.log(quote(await pool(a), "uqor", BigInt(b)));
  else if (cmd === "buy") await buy(a, Number(b));
  else if (cmd === "to-evm") await toEvm(a);
  else console.error("usage: amm.ts quote <pool> <uqor> | buy <pool> <QOR> | to-evm <denom>");
}
