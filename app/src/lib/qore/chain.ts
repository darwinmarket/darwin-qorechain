import { createPublicClient, defineChain, http, type Address } from "viem";
import deployments from "@/config/deployments.json";

export const COSMOS_CHAIN_ID = "qorechain-diana";
/** The browser reads REST through /api/rest: the public endpoint sends no CORS headers. */
export const REST = process.env.NEXT_PUBLIC_QORE_REST ?? "/api/rest";
export const EVM_RPC = process.env.NEXT_PUBLIC_QORE_EVM ?? "https://evm-testnet.qore.host";
export const EXPLORER = "https://explore.qore.network";

export const diana = defineChain({
  id: 9800,
  name: "QoreChain Diana",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [EVM_RPC] } },
  testnet: true,
});

export const client = createPublicClient({
  chain: diana,
  transport: http(EVM_RPC, { batch: { wait: 16 }, retryCount: 3 }),
});

type Deployments = Omit<typeof deployments, "tokens" | "baskets">;
export const D = deployments as unknown as Deployments & {
  baskets: Record<string, { address: Address; name: string; display: string; description: string; components: string[]; weights: number[] }>;
  tokens: Record<string, Address>;
};

export const TOKENS = D.tokens as Record<string, Address>;
export const ROUTER = D.router as Address;
export const ORACLE = D.oracle as Address;
export const RESERVE = D.reserve as Address;
export const BASKET_KEYS = Object.keys(D.baskets);

/** What each component token tracks, its decimals and oracle feed. */
export const TOKEN_INFO: Record<string, { symbol: string; tracks: string; decimals: number; feed: number; denom?: string }> = {
  fUSD: { symbol: "fUSD", tracks: "USD", decimals: 6, feed: 1, denom: `erc20:${D.tokens.fUSD}` },
  fETH: { symbol: "fETH", tracks: "ETH", decimals: 18, feed: 2, denom: `erc20:${D.tokens.fETH}` },
  fBTC: { symbol: "fBTC", tracks: "BTC", decimals: 8, feed: 3, denom: `erc20:${D.tokens.fBTC}` },
  WQOR: { symbol: "WQOR", tracks: "QOR", decimals: 18, feed: 4 },
  QWAKK: { symbol: "QWAKK", tracks: "QWAKK", decimals: 6, feed: 5, denom: `erc20:${D.tokens.QWAKK}` },
};

export const tokenKeyOf = (address: string) =>
  Object.entries(D.tokens).find(([, a]) => a.toLowerCase() === address.toLowerCase())?.[0] ?? address;

/** Darwin's own transaction page: the public explorer opens on mainnet, these txs are on testnet. */
export const txUrl = (hash: string) => `/tx/${hash}`;
export const addressUrl = (a: string) => `${EXPLORER}/address/${a}`;
