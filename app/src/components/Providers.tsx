"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WalletProvider } from "@/lib/qore/wallet";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 2 } } }));
  return (
    <QueryClientProvider client={qc}>
      <WalletProvider>{children}</WalletProvider>
    </QueryClientProvider>
  );
}
