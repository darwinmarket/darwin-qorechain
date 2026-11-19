import { createPublicClient, defineChain, http } from "viem";

export const CHAIN_ID = "qorechain-diana";
export const REST = process.env.QORE_REST_URL ?? "https://api-testnet.qore.host";
export const RPC = process.env.QORE_RPC_URL ?? "https://rpc-testnet.qore.host";
export const EVM_RPC = process.env.QORE_EVM_URL ?? "https://evm-testnet.qore.host";

export const diana = defineChain({
  id: 9800,
  name: "QoreChain Diana",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
  blockExplorers: { default: { name: "QoreChain Explorer", url: "https://explore.qore.network" } },
  testnet: true,
});

export const publicClient = createPublicClient({ chain: diana, transport: http(EVM_RPC, { retryCount: 4, retryDelay: 1500 }) });
