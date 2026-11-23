"use client";

/**
 * The account menu's "ML-DSA-87 key registered" line, from @qorechain/react. Loaded only when the
 * menu opens (the SDK is heavy); QoreChainProvider reads REST through Darwin's proxy, since the
 * public endpoint sends no CORS headers.
 */
import { PqcStatusBadge, QoreChainProvider } from "@qorechain/react";
import { EVM_RPC, REST } from "@/lib/qore/chain";

const QORE = {
  network: "testnet" as const,
  endpoints: { rpc: "https://rpc-testnet.qore.host", rest: REST, evmRpc: EVM_RPC },
};

export default function PqcBadge({ address }: { address: string }) {
  return (
    <QoreChainProvider config={QORE}>
      <PqcStatusBadge address={address}>
        {({ isRegistered, isLoading }) => (
          <div
            data-pqc-badge={isLoading ? "loading" : String(isRegistered)}
            className="account-menu__item"
            style={{ cursor: "default", fontSize: 12, color: isRegistered ? "var(--green)" : "var(--ink-3)" }}
            title="Read from the chain's PQC module: transactions from this account carry an ML-DSA-87 signature"
          >
            {isLoading ? "Checking PQC key…" : isRegistered ? "● ML-DSA-87 key registered" : "○ No ML-DSA-87 key yet"}
          </div>
        )}
      </PqcStatusBadge>
    </QoreChainProvider>
  );
}
