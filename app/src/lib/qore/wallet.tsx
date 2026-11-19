"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { erc20Abi } from "./abis";
import { client, D, REST, TOKEN_INFO, TOKENS } from "./chain";
import { connectQorex, qorex, waitForQorex, type Account } from "./qorex";

export type Balances = {
  qor: bigint; // bank uqor
  fusdBank: bigint; // faucet form
  fusdErc20: bigint; // ERC-20 form on the EVM twin
  shares: Record<string, bigint>;
  /** ERC-20 coins held on the EVM twin (what an in-kind redemption pays). */
  coins: Record<string, bigint>;
};

type WalletState = {
  account: Account | null;
  installed: boolean | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  balances: Balances | undefined;
  refresh: () => void;
};

const Ctx = createContext<WalletState | null>(null);
const STORAGE = "darwin-qore:account";

async function readBalances(acc: Account): Promise<Balances> {
  const bank = (await (await fetch(`${REST}/cosmos/bank/v1beta1/balances/${acc.address}`)).json()) as {
    balances?: { denom: string; amount: string }[];
  };
  const coin = (denom: string) => BigInt(bank.balances?.find((b) => b.denom === denom)?.amount ?? "0");
  const keys = Object.keys(D.baskets);
  const coinKeys = ["fBTC", "fETH", "WQOR", "QWAKK"];
  const [fusdErc20, ...rest] = await Promise.all([
    client.readContract({ address: TOKENS.fUSD, abi: erc20Abi, functionName: "balanceOf", args: [acc.evm] }),
    ...keys.map((k) => client.readContract({ address: D.baskets[k].address as Address, abi: erc20Abi, functionName: "balanceOf", args: [acc.evm] })),
    ...coinKeys.map((k) => client.readContract({ address: TOKENS[k], abi: erc20Abi, functionName: "balanceOf", args: [acc.evm] })),
  ]);
  const shares = rest.slice(0, keys.length);
  const coins = rest.slice(keys.length);
  return {
    qor: coin("uqor"),
    fusdBank: coin(TOKEN_INFO.fUSD.denom!),
    fusdErc20: fusdErc20 as bigint,
    shares: Object.fromEntries(keys.map((k, i) => [k, shares[i] as bigint])),
    coins: Object.fromEntries(coinKeys.map((k, i) => [k, coins[i] as bigint])),
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    void waitForQorex(2000).then(async (n) => {
      if (!alive) return;
      setInstalled(Boolean(n));
      // Reconnect silently if this site was connected before.
      if (n && localStorage.getItem(STORAGE)) {
        try {
          setAccount(await connectQorex());
        } catch {
          localStorage.removeItem(STORAGE);
        }
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      if (!qorex()) {
        setInstalled(false);
        throw new Error("Install the QoreX wallet to trade: it signs every Darwin trade with ML-DSA-87.");
      }
      const acc = await connectQorex();
      localStorage.setItem(STORAGE, "1");
      setAccount(acc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE);
    setAccount(null);
  }, []);

  const { data: balances } = useQuery({
    queryKey: ["balances", account?.address],
    queryFn: () => readBalances(account!),
    enabled: Boolean(account),
    refetchInterval: 12_000,
  });
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["balances"] });
    void qc.invalidateQueries({ queryKey: ["chain-state"] });
    void qc.invalidateQueries({ queryKey: ["activity"] });
  }, [qc]);

  const value = useMemo(
    () => ({ account, installed, connecting, error, connect, disconnect, balances, refresh }),
    [account, installed, connecting, error, connect, disconnect, balances, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}
