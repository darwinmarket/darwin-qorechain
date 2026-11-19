/**
 * Fund Darwin's EVM role accounts from the treasury (hybrid-signed native txs).
 *
 *   tsx src/fund.ts qor   <deployer> <reporter> <curator>   QOR to send to each role
 *   tsx src/fund.ts tokens                                  convert every Fest token the treasury holds
 *                                                            into ERC-20 on the deployer's 0x address
 */
import { evmAccount } from "./accounts.js";
import { treasuryClient } from "./nativeClient.js";
import { CONVERT_COIN_TYPE_URL } from "./erc20Msgs.js";
import { REST } from "./net.js";

const FEST = [
  "erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA", // fUSD
  "erc20:0x02292293c13880a26242690eb70a0e42B8E91c28", // fETH
  "erc20:0x4604e7E45b2ecdbfbDc157103f5B2b62cb16451A", // fBTC
];

const [cmd, ...args] = process.argv.slice(2);
const { client, address } = await treasuryClient();

if (cmd === "qor") {
  const roles = ["deployer", "reporter", "curator"] as const;
  const msgs = [];
  for (let i = 0; i < roles.length; i++) {
    const qor = Number(args[i] ?? 0);
    if (!qor) continue;
    const to = (await evmAccount(roles[i])).cosmos;
    msgs.push({
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: { fromAddress: address, toAddress: to, amount: [{ denom: "uqor", amount: String(Math.round(qor * 1e6)) }] },
    });
    console.log(`${roles[i]}: ${qor} QOR -> ${to}`);
  }
  const res = await client.signAndBroadcast(msgs, "auto", "darwin: fund role accounts");
  console.log("tx", (res as any).transactionHash ?? res);
} else if (cmd === "tokens") {
  const receiver = (await evmAccount("deployer")).evm;
  const bal = (await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${address}`)).json()) as { balances: { denom: string; amount: string }[] };
  const msgs = bal.balances
    .filter((b) => FEST.includes(b.denom) && BigInt(b.amount) > 0n)
    .map((b) => ({ typeUrl: CONVERT_COIN_TYPE_URL, value: { coin: { denom: b.denom, amount: b.amount }, receiver, sender: address } }));
  if (!msgs.length) {
    console.log("no Fest tokens to convert");
  } else {
    msgs.forEach((m) => console.log(`convert ${m.value.coin.amount} ${m.value.coin.denom} -> ${receiver}`));
    const res = await client.signAndBroadcast(msgs, { amount: [{ denom: "uqor", amount: "250000" }], gas: "2000000" }, "darwin: Fest tokens to EVM");
    console.log("tx", (res as any).transactionHash ?? res);
  }
} else {
  console.error("usage: fund.ts qor <deployer> <reporter> <curator> | tokens");
  process.exit(1);
}
