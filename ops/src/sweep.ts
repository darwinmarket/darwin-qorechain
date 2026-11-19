/**
 * Sweep a faucet-funded coin-118 account (derived from the same mnemonic) into Darwin:
 *   - registers its ML-DSA-87 key first if needed (the one tx allowed classically),
 *   - converts its Fest tokens to ERC-20 on the deployer (hybrid-signed),
 *   - sends its QOR, minus a small fee buffer, to the deployer (hybrid-signed).
 *
 *   tsx src/sweep.ts <accountIndex>      e.g. 5 for qor1n6kym8em9zdzdpt8hkw4vchwuy7akd26nhxjw3
 */
import {
  TxClient, buildRegisterPqcKeyMsg, deriveNativeAccount, derivePqcCanonical, directSignerFromPrivateKey,
  fetchPqcStatus, qorechainRegistry, signProofOfPossession,
} from "@qorechain/sdk";
import { evmAccount, mnemonic } from "./accounts.js";
import { CONVERT_COIN_TYPE_URL, ERC20_REGISTRY_TYPES } from "./erc20Msgs.js";
import { CHAIN_ID, REST, RPC } from "./net.js";

const index = Number(process.argv[2]);
if (!Number.isInteger(index) || index < 1) throw new Error("usage: sweep.ts <accountIndex>=1..");

const m = mnemonic();
const acc = await deriveNativeAccount(m, { accountIndex: index } as any);
const pqc = derivePqcCanonical(acc.address, m);
const signer = await directSignerFromPrivateKey(acc.privateKey, "qor");
const registry = qorechainRegistry(ERC20_REGISTRY_TYPES);

const balances = async () =>
  ((await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${acc.address}`)).json()) as { balances: { denom: string; amount: string }[] }).balances;

console.log(`account ${index}: ${acc.address}`);
let bal = await balances();
if (!bal.length) throw new Error("nothing to sweep yet: the faucet has not paid this address");
console.log("holds:", bal.map((b) => `${b.amount} ${b.denom.slice(0, 22)}`).join(", "));

const st = await fetchPqcStatus({ rest: REST, address: acc.address });
if (!st.registered) {
  const classical = await TxClient.connect({ rpcEndpoint: RPC, signer, registry });
  const pop = signProofOfPossession({ chainId: CHAIN_ID, account: acc.address, keypair: pqc });
  const r: any = await classical.signAndBroadcast([buildRegisterPqcKeyMsg(acc.address, { pqcKeypair: pqc, proofOfPossession: pop })], { amount: [{ denom: "uqor", amount: "70000" }], gas: "700000" }, "register ML-DSA-87 key");
  if (r.code) throw new Error(`register failed: ${r.rawLog}`);
  console.log(`registered ML-DSA-87 key (${r.transactionHash})`);
  await new Promise((res) => setTimeout(res, 4000));
}

const client = await TxClient.connect({ rpcEndpoint: RPC, signer, registry, pqcKeypair: pqc, rest: REST });
const deployer = await evmAccount("deployer");
bal = await balances();
const fest = bal.filter((b) => b.denom.startsWith("erc20:") && BigInt(b.amount) > 0n);
if (fest.length) {
  const r: any = await client.signAndBroadcast(
    fest.map((b) => ({ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: b.denom, amount: b.amount }, receiver: deployer.evm, sender: acc.address } })),
    { amount: [{ denom: "uqor", amount: "250000" }], gas: "2000000" }, "darwin: sweep Fest tokens",
  );
  if (r.code) throw new Error(`convert failed: ${r.rawLog}`);
  console.log(`tokens -> deployer ${deployer.evm} (${r.transactionHash})`);
}

bal = await balances();
const uqor = BigInt(bal.find((b) => b.denom === "uqor")?.amount ?? "0");
const keep = 500_000n; // 0.5 QOR for the fee
if (uqor > keep) {
  const r: any = await client.signAndBroadcast(
    [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: acc.address, toAddress: deployer.cosmos, amount: [{ denom: "uqor", amount: (uqor - keep).toString() }] } }],
    "auto", "darwin: sweep QOR",
  );
  if (r.code) throw new Error(`send failed: ${r.rawLog}`);
  console.log(`${Number(uqor - keep) / 1e6} QOR -> deployer ${deployer.cosmos} (${r.transactionHash})`);
}
