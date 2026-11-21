/**
 * DarwinAccount (contracts/src/account): a QoreX user's Darwin account, controlled only by the
 * ML-DSA-87 key the user registered on QoreChain. The user signs a plain-text message in QoreX
 * (signArbitrary); Darwin's relayer submits it through the factory, and the account checks the
 * ML-DSA-87 signature on chain with pqcVerify before calling the router. No EVM window, no grant, no
 * gas for the user. Shared by the browser (building and signing) and the server (checking).
 */
import { bytesToHex, decodeFunctionData, encodeAbiParameters, encodeFunctionData, keccak256, maxUint256, parseAbi, parseTransaction, type Address, type Hex } from "viem";
import { D, ROUTER, TOKENS } from "./chain";

export type Call = { target: Address; data: Hex };
export const FACTORY = (D as any).accountFactory as Address;

export const factoryAbi = parseAbi([
  "function accountOf(address owner) view returns (address)",
  "function ownerOf(address account) view returns (address)",
  "function allowedTarget(address target) view returns (bool)",
  "function execute(address owner, (address target, bytes data)[] calls, string summary, uint256 deadline, bytes pqSignature)",
  "event AccountCreated(address indexed owner, address indexed account)",
]);
export const accountAbi = parseAbi([
  "function nonce() view returns (uint256)",
  "function owner() view returns (address)",
  "event Executed(uint256 indexed nonce, bytes32 indexed callsHash, address indexed submitter, uint256 calls)",
]);
const erc20 = parseAbi(["function approve(address, uint256) returns (bool)", "function transfer(address, uint256) returns (bool)"]);
const router = parseAbi([
  "function buy(address basket, uint256 usdIn, uint256 minShares, address to) returns (uint256)",
  "function sell(address basket, uint256 shares, uint256 minUsdOut, address to) returns (uint256)",
]);
const callsType = [{ type: "tuple[]", components: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }] }] as const;

/** The exact text the owner signs, as DarwinAccount.textFor rebuilds it. */
export function textFor(account: Address, calls: Call[], summary: string, nonce: bigint, deadline: bigint) {
  const h = keccak256(encodeAbiParameters(callsType, [calls]));
  return `${summary}\n\nDarwin account ${account.toLowerCase()}\nnonce ${nonce}\nvalid until ${deadline}\ncalls ${h}`;
}

/** Buy: approve the router once (max), then buy with the account as recipient. */
export function buyCalls(account: Address, basket: Address, usdIn: bigint, minShares: bigint, allowance: bigint): Call[] {
  const c: Call[] = [];
  if (allowance < usdIn) c.push({ target: TOKENS.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [ROUTER, maxUint256] }) });
  c.push({ target: ROUTER, data: encodeFunctionData({ abi: router, functionName: "buy", args: [basket, usdIn, minShares, account] }) });
  return c;
}

export function sellCalls(account: Address, basket: Address, shares: bigint, minUsd: bigint, allowance: bigint): Call[] {
  const c: Call[] = [];
  if (allowance < shares) c.push({ target: basket, data: encodeFunctionData({ abi: erc20, functionName: "approve", args: [ROUTER, maxUint256] }) });
  c.push({ target: ROUTER, data: encodeFunctionData({ abi: router, functionName: "sell", args: [basket, shares, minUsd, account] }) });
  return c;
}

/** Withdraw: the account hands the fUSD to the relayer, which returns it to the owner's QoreX wallet in its bank form. */
export function withdrawCalls(relayerEvm: Address, amount: bigint): Call[] {
  return [{ target: TOKENS.fUSD, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [relayerEvm, amount] }) }];
}

export { router as accountRouterAbi, erc20 as accountErc20Abi };

export type Execution = { owner: Hex; calls: Call[]; summary: string; deadline: bigint; signature: Hex; data: Hex; native: boolean };

/**
 * The factory.execute a committed transaction carries: a relayer's MsgCrossVMCall (the native lane,
 * hybrid-signed) or, for executions before it, an EVM transaction. Null for anything else.
 */
export function executionOf(tx: { body?: { messages?: any[] } } | undefined): Execution | null {
  for (const m of tx?.body?.messages ?? []) {
    let data: Hex | undefined;
    let native = false;
    if (m["@type"] === "/qorechain.crossvm.v1.MsgCrossVMCall" && String(m.target_contract).toLowerCase() === FACTORY?.toLowerCase() && m.payload) {
      data = bytesToHex(Uint8Array.from(atob(m.payload), (c) => c.charCodeAt(0)));
      native = true;
    } else if (m["@type"] === "/cosmos.evm.vm.v1.MsgEthereumTx" && m.raw) {
      try {
        const t = parseTransaction(m.raw as Hex);
        if (t.to?.toLowerCase() === FACTORY?.toLowerCase()) data = t.data;
      } catch {
        /* not an EVM tx we read */
      }
    }
    if (!data) continue;
    try {
      const call = decodeFunctionData({ abi: factoryAbi, data });
      if (call.functionName !== "execute") continue;
      const [owner, calls, summary, deadline, signature] = call.args;
      return { owner: owner as Hex, calls: calls as Call[], summary, deadline, signature: signature as Hex, data, native };
    } catch {
      /* not an execution */
    }
  }
  return null;
}
