"use client";

/**
 * Re-verify Darwin's post-quantum signatures in the browser, without trusting the chain's own
 * verdict or Darwin's servers:
 *
 *  - a native transaction (a QoreX trade): QoreSign reads the committed tx and checks its ML-DSA-87
 *    layer and its secp256k1 signature against the keys the signer registered on chain;
 *  - an oracle round: the exact message DarwinOracle checks is rebuilt here from the transaction's
 *    calldata, and the reporter's ML-DSA-87 signature is verified over it with @qorechain/pqc,
 *    against the key the reporter registered (with proof of possession). The same signature is then
 *    checked against the message of a neighbouring round, which must fail.
 */
import { useQuery } from "@tanstack/react-query";
import { mldsa87 } from "@qorechain/pqc";
import { addressFromBytes } from "@qorechain/qoresign";
import { fetchPqKeyStatus, inspectTransaction } from "@qorechain/qoresign/network";
import { decodeEventLog, decodeFunctionData, encodeAbiParameters, encodePacked, hexToBytes, keccak256, parseAbi, type Hex } from "viem";
import { client, COSMOS_CHAIN_ID, D, ORACLE, REST } from "./chain";

/** qoresign builds `${rest}/path`: in the browser that is Darwin's read-only REST proxy. */
const rest = () => (REST.startsWith("/") ? `${window.location.origin}${REST}` : REST);

export type BrowserCheck =
  | { kind: "native"; pqVerified: boolean; signBytes?: string; classicalVerified?: boolean; tier: string; signer?: string; reason?: string }
  | { kind: "round"; round: bigint; verified: boolean; tamperedRejected: boolean; reporter: string; keyBytes: number; sigBytes: number; proven: boolean }
  | { kind: "none" };

const oracleAbi = parseAbi([
  "function submit(uint64 timestamp, uint16[] ids, uint128[] prices, bytes signature)",
  "event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)",
]);

/** DarwinOracle.roundMessage, rebuilt off chain. */
export function roundMessage(round: bigint, timestamp: bigint, ids: readonly number[], prices: readonly bigint[]): Hex {
  const inner = keccak256(
    encodeAbiParameters([{ type: "uint64" }, { type: "uint64" }, { type: "uint16[]" }, { type: "uint128[]" }], [round, timestamp, ids, prices]),
  );
  return encodePacked(["string", "uint256", "address", "bytes32"], ["DarwinOracle:round:v1", 9800n, ORACLE, inner]);
}

/** Verify an oracle round's ML-DSA-87 signature from its EVM transaction. */
export async function verifyRound(evmHash: Hex): Promise<BrowserCheck> {
  const [tx, receipt] = await Promise.all([client.getTransaction({ hash: evmHash }), client.getTransactionReceipt({ hash: evmHash })]);
  if (tx.to?.toLowerCase() !== ORACLE.toLowerCase()) return { kind: "none" };
  const call = decodeFunctionData({ abi: oracleAbi, data: tx.input });
  if (call.functionName !== "submit") return { kind: "none" };
  const [timestamp, ids, prices, sig] = call.args;
  let round: bigint | null = null;
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: oracleAbi, data: log.data, topics: log.topics as any });
      if (ev.eventName === "RoundSubmitted") round = ev.args.round;
    } catch {
      /* a PriceUpdated */
    }
  }
  if (round == null) return { kind: "none" };
  const reporter = addressFromBytes(hexToBytes(D.roles.reporter as Hex)).bech32;
  const key = await fetchPqKeyStatus({ rest: rest(), address: reporter });
  if (!key.publicKey) throw new Error(`${reporter} has no ML-DSA-87 key on chain`);
  const signature = hexToBytes(sig);
  return {
    kind: "round",
    round,
    verified: mldsa87.verify(key.publicKey, hexToBytes(roundMessage(round, timestamp, ids, prices)), signature),
    tamperedRejected: !mldsa87.verify(key.publicKey, hexToBytes(roundMessage(round + 1n, timestamp, ids, prices)), signature),
    reporter,
    keyBytes: key.publicKey.length,
    sigBytes: signature.length,
    proven: Boolean(key.possessionProven),
  };
}

/** Verify a native transaction's hybrid signature with QoreSign. */
export async function verifyNative(cosmosHash: string): Promise<BrowserCheck> {
  const t = await inspectTransaction({ rest: rest(), txhash: cosmosHash, chainId: COSMOS_CHAIN_ID });
  if (!t?.pqLayer.present) return { kind: "none" };
  return {
    kind: "native",
    pqVerified: Boolean(t.pqLayer.verified),
    signBytes: t.pqLayer.signBytesVersion,
    classicalVerified: t.classicalSignatureValid,
    tier: String(t.tier),
    signer: t.signer?.address,
    reason: t.pqLayer.reason,
  };
}

export function useBrowserCheck(tx: { cosmosHash: string; evmHash?: string; hybridVerified: boolean; actions: { kind: string }[] } | undefined) {
  return useQuery({
    queryKey: ["browser-check", tx?.cosmosHash],
    enabled: Boolean(tx),
    staleTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<BrowserCheck> => {
      if (!tx) return { kind: "none" };
      if (tx.hybridVerified) return verifyNative(tx.cosmosHash);
      if (tx.evmHash && tx.actions.some((a) => a.kind === "round")) return verifyRound(tx.evmHash as Hex);
      return { kind: "none" };
    },
  });
}
