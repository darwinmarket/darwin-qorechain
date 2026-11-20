"use client";

/**
 * Trading with QoreX through Darwin's relayer (ops/src/relayer.ts).
 *
 * QoreX signs only the messages it can show its user, and it cannot show MsgCrossVMCall or the
 * ERC-20 conversions. So:
 *   - setup: the user opens an EVM access window in QoreX, then signs here, in QoreX, authz grants
 *     to Darwin's relayer for those two message types, for 24 hours;
 *   - each trade: the user signs a trade intent with QoreX's signArbitrary (secp256k1 + ML-DSA-87);
 *     the relayer verifies it against the user's on-chain key and executes it as the user.
 */
import { useQuery } from "@tanstack/react-query";
import { COSMOS_CHAIN_ID } from "./chain";
import { qorex, signAndBroadcast, withUnlock, type QorexResult } from "./qorex";
import type { EncodedMsg } from "./proto";

export type RelayStatus = {
  relayer: string;
  grants: { crossvm: string | null; convert: string | null };
  window: { live: boolean; remainingTxs?: string; remainingBlocks?: string };
};

export function useRelayStatus(account: string | null | undefined) {
  return useQuery({
    queryKey: ["relay-status", account],
    enabled: Boolean(account),
    refetchInterval: 15_000,
    queryFn: async (): Promise<RelayStatus> => {
      const r = await fetch(`/api/relay/status?account=${account}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `relayer ${r.status}`);
      return j;
    },
  });
}

// ---- MsgGrant, hand-encoded (no SDK in the bundle) ----------------------------------------------
class W {
  private c: number[] = [];
  private v(n: number) {
    while (n > 0x7f) {
      this.c.push((n & 0x7f) | 0x80);
      n = Math.floor(n / 128);
    }
    this.c.push(n);
  }
  bytes(f: number, b: Uint8Array) {
    this.v((f << 3) | 2);
    this.v(b.length);
    for (const x of b) this.c.push(x);
    return this;
  }
  string(f: number, s: string) {
    return this.bytes(f, new TextEncoder().encode(s));
  }
  varint(f: number, n: number) {
    this.v(f << 3);
    this.v(n);
    return this;
  }
  done() {
    return Uint8Array.from(this.c);
  }
}

export const RELAYED_TYPES = ["/qorechain.crossvm.v1.MsgCrossVMCall", "/cosmos.evm.erc20.v1.MsgConvertCoin"] as const;

/** cosmos.authz.v1beta1.MsgGrant { granter, grantee, Grant { GenericAuthorization{msg}, expiration } } */
function grantMsg(granter: string, grantee: string, msgType: string, expiresUnix: number): EncodedMsg {
  const auth = new W().string(1, "/cosmos.authz.v1beta1.GenericAuthorization").bytes(2, new W().string(1, msgType).done()).done();
  const grant = new W().bytes(1, auth).bytes(2, new W().varint(1, expiresUnix).done()).done();
  return { typeUrl: "/cosmos.authz.v1beta1.MsgGrant", value: new W().string(1, granter).string(2, grantee).bytes(3, grant).done() };
}

/** Sign in QoreX: Darwin's relayer may send these two message types as the user, for `hours`. */
export async function authorizeRelayer(account: string, relayer: string, hours = 24): Promise<QorexResult> {
  const expires = Math.floor(Date.now() / 1000) + hours * 3600;
  return signAndBroadcast(
    RELAYED_TYPES.map((t) => grantMsg(account, relayer, t, expires)),
    `Darwin: let the trade relayer execute your signed trades for ${hours} hours`,
    400_000,
  );
}

// ---- a trade intent ----------------------------------------------------------------------------
export type TradeRequest = { account: string; action: "buy" | "sell"; basket: string; amount: bigint; min: bigint };

export async function relayTrade(req: TradeRequest, onSigned?: () => void): Promise<{ txHash: string; intent: string; messages: string[] }> {
  const n = qorex() as unknown as { signArbitrary?: (chainId: string, signer: string, data: string) => Promise<unknown> } | null;
  if (!n?.signArbitrary) throw new Error("This QoreX cannot sign a trade intent (signArbitrary); update QoreX");
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  const intent = JSON.stringify({
    darwin: "trade-v1",
    chainId: COSMOS_CHAIN_ID,
    account: req.account,
    action: req.action,
    basket: req.basket,
    amount: req.amount.toString(),
    min: req.min.toString(),
    nonce,
    expires: Math.floor(Date.now() / 1000) + 300,
  });
  // secp256k1 (ADR-36) and ML-DSA-87 over these exact bytes, by the user's own keys in QoreX
  // a locked QoreX is opened for the user to unlock, then asked again (withUnlock)
  const signature = await withUnlock(() => n.signArbitrary!(COSMOS_CHAIN_ID, req.account, intent));
  onSigned?.();
  const r = await fetch("/api/relay/trade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ intent, signature }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `relayer ${r.status}`);
  return j;
}
