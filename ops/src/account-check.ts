/**
 * The windowless path end to end on the testnet, through the app's API (APP, default localhost:3032):
 * the test wallet (as QoreX: same mnemonic, coin 118) holds a DarwinAccount controlled by its
 * ML-DSA-87 key, with no EVM window and no grant.
 *
 *   1. deposit: a MsgSend of fUSD to the relayer, converted onto the account
 *   2. buy a basket by signing one message (QoreSign signMessage = what QoreX signArbitrary signs)
 *   3. sell half of it, same way
 *   4. withdraw fUSD back to the wallet's bank balance
 *   5. refusals: the same signature replayed (answered with its own transaction, nothing sent), calls changed after signing, another key, a target
 *      outside Darwin; and the forged call submitted on chain directly, refused by the account
 *
 *   tsx src/account-check.ts [BASKET=BLUEDW] [usd=2]
 */
import { deriveCanonicalPqKey, deriveClassicalKey, parseAddress, signMessage } from "@qorechain/qoresign";
import { encodeFunctionData, parseAbi, parseUnits, type Address, type Hex } from "viem";
import { mnemonic } from "./accounts.js";
import { artifact, loadDeployments } from "./evm.js";
import { publicClient } from "./net.js";
import { treasuryClient } from "./nativeClient.js";

const APP = process.env.APP ?? "http://localhost:3032";
const [key = "BLUEDW", usd = "2"] = process.argv.slice(2);
const d = loadDeployments();
const { client, address } = await treasuryClient();
const m = mnemonic();
const classicalKey = deriveClassicalKey({ mnemonic: m });
const pqKey = deriveCanonicalPqKey({ mnemonic: m, address });
const basket = d.baskets[key].address as Address;
const routerAbi = artifact("DarwinRouter").abi;
const factoryAbi = artifact("DarwinAccountFactory").abi;
const erc20 = parseAbi([
  "function approve(address, uint256) returns (bool)",
  "function transfer(address, uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);
const callsType = [{ type: "tuple[]", components: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }] }] as const;
type Call = { target: Address; data: Hex };

const results: [string, boolean, string][] = [];
const check = async (name: string, fn: () => Promise<string>) => {
  try {
    const detail = await fn();
    results.push([name, true, detail]);
    console.log(`PASS  ${name}  ${detail}`);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).slice(0, 220);
    results.push([name, false, msg]);
    console.log(`FAIL  ${name}  ${msg}`);
  }
};
const api = async (path: string, body?: unknown) => {
  const r = await fetch(`${APP}/api/relay/${path}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const j: any = await r.json();
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
};
const refused = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (e) {
    return String((e as Error).message).slice(0, 120);
  }
  throw new Error("was accepted");
};

const { keccak256, encodeAbiParameters } = await import("viem");
const textFor = (acc: Address, calls: Call[], summary: string, nonce: bigint, deadline: bigint) =>
  `${summary}\n\nDarwin account ${acc.toLowerCase()}\nnonce ${nonce}\nvalid until ${deadline}\ncalls ${keccak256(encodeAbiParameters(callsType, [calls]))}`;

async function signed(calls: Call[], summary: string, signer = { classicalKey, pqKey }) {
  const info = await api(`account?account=${address}`);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  const text = textFor(info.account, calls, summary, BigInt(info.nonce), deadline);
  const signature = signMessage({ chainId: "qorechain-diana", signer: address, data: text, ...signer });
  return { owner: address, calls, summary, deadline: String(deadline), signature };
}

let info = await api(`account?account=${address}`);
const acc = info.account as Address;
console.log(`owner ${address}  account ${acc}  exists ${info.exists}  nonce ${info.nonce}`);

// 1. deposit
const amount = parseUnits(usd, 6);
await check("deposit: one MsgSend of fUSD lands on the account as ERC-20", async () => {
  const before = BigInt(info.fusd);
  const r: any = await client.signAndBroadcast(
    [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: address, toAddress: info.relayer.cosmos, amount: [{ denom: `erc20:${d.tokens.fUSD}`, amount: String(amount) }] } }],
    "auto",
    "Darwin: deposit fUSD to your Darwin account",
  );
  if (r.code) throw new Error(`send failed ${r.code}`);
  const dep = await api("deposit", { owner: address, txHash: r.transactionHash });
  const again = await api("deposit", { owner: address, txHash: r.transactionHash });
  if (!again.already) throw new Error("a deposit was credited twice");
  info = await api(`account?account=${address}`);
  const after = BigInt(info.fusd);
  if (after - before !== amount) throw new Error(`account fUSD ${before} -> ${after}`);
  return `+${usd} fUSD (send ${r.transactionHash.slice(0, 10)}…, convert ${String(dep.txHash).slice(0, 10)}…), credited once`;
});

// 2. buy. Like the app on a quiet day: prices older than 30 minutes are refused (PriceStale), so ask
// the server for a round first, as the page does when a visitor finds them stale.
await fetch(`${APP}/api/relay/refresh`, { method: "POST" }).catch(() => null);
const spend = amount / 2n;
let bought = 0n;
await check(`buy ${key} by one signed message (no window, no grant)`, async () => {
  const [q] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteBuy", args: [basket, spend] })) as [bigint];
  const calls: Call[] = [];
  if (BigInt(info.allowance.fUSD) < spend) calls.push({ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, 2n ** 256n - 1n] }) });
  calls.push({ target: d.router, data: encodeFunctionData({ abi: routerAbi, functionName: "buy", args: [basket, spend, (q * 99n) / 100n, acc] }) });
  const before = BigInt(info.shares[key]);
  const r = await api("execute", await signed(calls, `Buy ${Number(spend) / 1e6} fUSD of ${key}`));
  info = await api(`account?account=${address}`);
  bought = BigInt(info.shares[key]) - before;
  if (bought <= 0n) throw new Error("no shares");
  return `+${Number(bought) / 1e18} ${key}, tx ${r.txHash} (gas ${r.gasUsed})`;
});

// 5. refusals (before selling, while there is something to protect)
await check("the same signature replayed executes nothing (answered with its own transaction)", async () => {
  const calls: Call[] = [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 1n] }) }];
  const req = await signed(calls, "Withdraw 0.000001 fUSD");
  const ok = await api("execute", req);
  await new Promise((r) => setTimeout(r, 4000));
  const n0 = (await api(`account?account=${address}`)).nonce;
  // the relayer is idempotent: a replay (or a retry after a cut answer) gets the transaction that
  // already carried the message, and nothing is sent again; the account's nonce does not move
  const again = await api("execute", req).catch((e: Error) => ({ error: e.message }));
  const n1 = (await api(`account?account=${address}`)).nonce;
  if (n1 !== n0) throw new Error(`the replay executed: nonce ${n0} -> ${n1}`);
  if ("error" in again) return `first ${ok.txHash.slice(0, 10)}…, replay refused: ${again.error}`;
  if (!again.already || again.txHash !== ok.txHash) throw new Error(`replay answered ${JSON.stringify(again).slice(0, 160)}`);
  return `first ${ok.txHash.slice(0, 10)}…, replay answered with the same transaction, nonce unchanged (${n1})`;
});
await check("calls changed after signing are refused", async () => {
  const signedCalls: Call[] = [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 1n] }) }];
  const req = await signed(signedCalls, "Withdraw 0.000001 fUSD");
  req.calls = [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 1_000_000n] }) }];
  return refused(() => api("execute", req));
});
await check("another key's signature is refused", async () => {
  // the ML-DSA-87 key the same mnemonic gives another address: not the one registered for this owner
  const otherPq = deriveCanonicalPqKey({ mnemonic: m, address: "qor1pzkqj8xadyhlqtpplps8jl5xmccf664s554wvf" });
  const calls: Call[] = [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 1n] }) }];
  return refused(async () => api("execute", await signed(calls, "Withdraw", { classicalKey, pqKey: otherPq })));
});
await check("a target outside Darwin is refused", async () => {
  const calls: Call[] = [{ target: d.tokens.fETH, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 1n] }) }];
  return refused(async () => api("execute", await signed(calls, "Move fETH")));
});
await check("the forged call submitted on chain directly is refused by the account (pqcVerify)", async () => {
  const req = await signed([{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 1n] }) }], "Withdraw 0.000001 fUSD");
  const forged: Call[] = [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, 10n ** 6n] }) }];
  const sig = ("0x" + Buffer.from(req.signature.pq!.signature, "base64").toString("hex")) as Hex;
  const owner = parseAddress(address).hex as Address;
  return refused(() =>
    publicClient.simulateContract({ address: d.accountFactory, abi: factoryAbi, functionName: "execute", args: [owner, forged, req.summary, BigInt(req.deadline), sig], account: info.relayer.evm }),
  );
});

// 3. sell half
await check(`sell half of the ${key} by one signed message`, async () => {
  const shares = bought / 2n;
  const [q] = (await publicClient.readContract({ address: d.router, abi: routerAbi, functionName: "quoteSell", args: [basket, shares] })) as [bigint];
  const calls: Call[] = [];
  if (BigInt(info.allowance[key]) < shares) calls.push({ target: basket, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [d.router, 2n ** 256n - 1n] }) });
  calls.push({ target: d.router, data: encodeFunctionData({ abi: routerAbi, functionName: "sell", args: [basket, shares, (q * 99n) / 100n, acc] }) });
  const before = BigInt(info.fusd);
  const r = await api("execute", await signed(calls, `Sell ${Number(shares) / 1e18} ${key}`));
  info = await api(`account?account=${address}`);
  return `+${(Number(BigInt(info.fusd) - before) / 1e6).toFixed(4)} fUSD, tx ${r.txHash}`;
});

// 4. withdraw
await check("withdraw fUSD back to the QoreX wallet (bank form)", async () => {
  const bank = async () => BigInt(((await (await fetch(`https://api-testnet.qore.host/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=erc20:${d.tokens.fUSD}`)).json()) as any).balance.amount);
  const before = await bank();
  const out = parseUnits("0.5", 6);
  const calls: Call[] = [{ target: d.tokens.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [info.relayer.evm, out] }) }];
  const r = await api("execute", await signed(calls, "Withdraw 0.5 fUSD to your QoreX wallet"));
  await new Promise((res) => setTimeout(res, 4000));
  const after = await bank();
  if (after - before !== out) throw new Error(`bank fUSD ${before} -> ${after}`);
  return `+0.5 fUSD in the wallet (evm ${r.txHash.slice(0, 10)}…, returned ${String(r.returned).slice(0, 10)}…)`;
});

const ok = results.filter((r) => r[1]).length;
console.log(`\n${ok}/${results.length} passed`);
process.exit(ok === results.length ? 0 : 1);
