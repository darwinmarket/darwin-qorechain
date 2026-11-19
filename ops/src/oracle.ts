/**
 * Oracle reporter: fetch reference prices, sign the round with the reporter's ML-DSA-87 key and
 * relay it. The relayer (the deployer account) needs an EVM window; the reporter never sends an EVM
 * transaction at all, its key only signs.
 *
 *   tsx src/oracle.ts            submit one round
 */
import type { Address, Hex } from "viem";
import { artifact, loadDeployments, pqSign, write } from "./evm.js";
import { publicClient } from "./net.js";
import { FEED, fetchPrices, toWad } from "./prices.js";

const abi = artifact("DarwinOracle").abi;

export async function submitRound(oracle?: Address) {
  const address = (oracle ?? loadDeployments().oracle) as Address;
  const p = await fetchPrices();
  const ids = [FEED.USD, FEED.ETH, FEED.BTC, FEED.QOR];
  const prices = [toWad(p.USD), toWad(p.ETH), toWad(p.BTC), toWad(p.QOR)];
  const [round, last] = await Promise.all([
    publicClient.readContract({ address, abi, functionName: "round" }) as Promise<bigint>,
    publicClient.readContract({ address, abi, functionName: "lastTimestamp" }) as Promise<bigint>,
  ]);
  const block = await publicClient.getBlock();
  let ts = block.timestamp;
  if (ts <= last) ts = last + 1n;
  const msg = (await publicClient.readContract({
    address, abi, functionName: "roundMessage", args: [round + 1n, ts, ids, prices],
  })) as Hex;
  const sig = await pqSign("reporter", msg);
  const receipt = await write("deployer", address, abi, "submit", [ts, ids, prices, sig]);
  console.log(
    `round ${round + 1n}: BTC ${p.BTC} ETH ${p.ETH} QOR ${p.QOR.toFixed(5)} ` +
      `(${(sig.length - 2) / 2}-byte ML-DSA-87 sig, gas ${receipt.gasUsed}, tx ${receipt.transactionHash})`,
  );
  return receipt;
}

if (import.meta.url === `file://${process.argv[1]}`) await submitRound();
