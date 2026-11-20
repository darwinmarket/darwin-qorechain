"use client";

/**
 * A user's own Darwin trades, from /api/trades (the server reads the chain and sends a summary).
 * Works on any device, nothing is stored in the browser.
 */
import { useQuery } from "@tanstack/react-query";
import type { TradeEntry } from "./trades";

export type { TradeEntry };

async function readHistory(address: string): Promise<TradeEntry[]> {
  const r = await fetch(`/api/trades?account=${address}`);
  return r.ok ? r.json() : [];
}

export function useTradeHistory(address: string | null | undefined) {
  return useQuery({ queryKey: ["trade-history", address], queryFn: () => readHistory(address!), enabled: Boolean(address), refetchInterval: 15_000 });
}
