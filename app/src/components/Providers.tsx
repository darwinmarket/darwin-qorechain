"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QoreChainProvider } from "@qorechain/react";
import { useState, type ReactNode } from "react";
import { EVM_RPC, REST } from "@/lib/qore/chain";
import { WalletProvider } from "@/lib/qore/wallet";

/**
 * QoreChainProvider (@qorechain/react) backs the PQC key badge; it reads REST through Darwin's
 * proxy, since the public endpoint sends no CORS headers. Wallet connection stays with QoreX.
 */
const QORE = {
  network: "testnet" as const,
  endpoints: { rpc: "https://rpc-testnet.qore.host", rest: REST, evmRpc: EVM_RPC },
};

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 2 } } }));
  return (
    <QueryClientProvider client={qc}>
      <QoreChainProvider config={QORE}>
        <WalletProvider>{children}</WalletProvider>
      </QoreChainProvider>
    </QueryClientProvider>
  );
}
