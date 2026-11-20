"use client";

/**
 * The trade panel on QoreChain, drawn with the mainnet front's TradeCard: deposit fUSD, receive the
 * basket token; sell the basket token, receive fUSD. One QoreX approval per trade, signed with
 * secp256k1 and ML-DSA-87, carried to the EVM by a native cross-VM call.
 */
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { SKIM_FEE_BPS, basketTicker } from "@/lib/baskets";
import { useBaskets } from "@/lib/darwin/store";
import { txUrl } from "@/lib/qore/chain";
import { signAndBroadcast } from "@/lib/qore/qorex";
import { buildBuy, buildSell, quoteBuy, quoteSell } from "@/lib/qore/trade";
import { useWallet } from "@/lib/qore/wallet";
import { TradeCard } from "./TradeCard";
import { TradeProgress, type TradeTone } from "./TradeProgress";
import { useToast } from "./Toast";

type Side = "buy" | "sell";
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function QoreTradePanel({ symbol, name }: { symbol: string; name: string }) {
  const { account, balances, refresh } = useWallet();
  const { data: baskets } = useBaskets();
  const basket = baskets?.find((b) => b.symbol === symbol);
  const toast = useToast();
  const ticker = basketTicker(symbol);

  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<{ out: bigint; fee: bigint } | null>(null);
  const [progress, setProgress] = useState<{ step: number; tone: TradeTone; label: string } | null>(null);
  const debounced = useDebounced(amount);

  const fusd = balances ? balances.fusdBank + balances.fusdErc20 : 0n;
  const shares = balances?.shares[symbol] ?? 0n;
  const sharePrice = basket?.sharePriceUsd ?? 0;
  const positionUsd = (Number(shares) / 1e18) * sharePrice;

  const parsed = useMemo(() => {
    try {
      if (!debounced || Number(debounced) <= 0) return null;
      return parseUnits(debounced, side === "buy" ? 6 : 18);
    } catch {
      return null;
    }
  }, [debounced, side]);

  useEffect(() => {
    let alive = true;
    setQuote(null);
    if (!parsed || !basket) return;
    const run =
      side === "buy"
        ? quoteBuy(basket.address as Address, parsed).then((q) => ({ out: q.shares, fee: q.fee }))
        : quoteSell(basket.address as Address, parsed).then((q) => ({ out: q.usdOut, fee: q.fee }));
    run.then((q) => alive && setQuote(q)).catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
  }, [parsed, side, basket]);

  const max = side === "buy" ? fusd : shares;
  const over = parsed !== null && parsed > max;
  const overCapacity = side === "buy" && parsed !== null && basket != null && Number(parsed) / 1e6 > basket.capacityUsd * 0.98;
  const paused = side === "buy" && Boolean(basket?.paused);

  // What the user gets, in dollars, as on mainnet's card.
  const receiveUsd =
    side === "buy"
      ? quote
        ? (Number(quote.out) / 1e18) * sharePrice
        : parsed
          ? (Number(parsed) / 1e6) * (1 - SKIM_FEE_BPS / 10_000)
          : 0
      : quote
        ? Number(quote.out) / 1e6
        : 0;

  async function submit() {
    if (!account || !parsed || !balances || !basket) return;
    const steps = ["Approve in QoreX"];
    setProgress({ step: 0, tone: "working", label: "Approve in QoreX…" });
    try {
      const built =
        side === "buy"
          ? await buildBuy(account, basket.address as Address, parsed, balances.fusdErc20, balances.fusdBank)
          : await buildSell(account, basket.address as Address, parsed);
      const res = await signAndBroadcast(built.msgs, side === "buy" ? `Darwin: buy ${ticker}` : `Darwin: sell ${ticker}`, built.gas);
      setProgress({ step: 0, tone: "done", label: side === "buy" ? `Bought ${ticker}` : `Sold ${ticker}` });
      toast.push({
        type: "success",
        title: side === "buy" ? `Bought ${name}` : `Sold ${name}`,
        message:
          res.shield === "shielded"
            ? "Signed with secp256k1 and ML-DSA-87, verified by QoreChain."
            : `Settled on QoreChain (${res.shield}).`,
        action: { label: "View transaction", onClick: () => window.open(txUrl(res.txHash), "_blank", "noreferrer") },
        duration: 9000,
      });
      setAmount("");
      setTimeout(refresh, 2500);
      setTimeout(() => setProgress(null), 2200);
      void steps;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const declined = /reject|denied|declin|cancel/i.test(msg);
      setProgress({ step: 0, tone: "error", label: declined ? "Declined in QoreX" : "Trade failed" });
      toast.push({ type: declined ? "info" : "error", title: declined ? "Trade cancelled" : "Trade failed", message: declined ? undefined : msg.slice(0, 180) });
      setTimeout(() => setProgress(null), 2500);
    }
  }

  const chips =
    side === "buy"
      ? [25, 50, 100].map((v) => ({ label: `$${v}`, onClick: () => setAmount(String(v)) }))
      : [25, 50, 100].map((p) => ({
          label: p === 100 ? "All" : `${p}%`,
          disabled: shares === 0n,
          onClick: () => setAmount(formatUnits((shares * BigInt(p)) / 100n, 18)),
        }));

  const ctaLabel = paused
    ? "Buying is paused"
    : over
      ? side === "buy"
        ? "Not enough fUSD"
        : `Not enough ${ticker}`
      : overCapacity
        ? "Above available liquidity"
        : side === "buy"
          ? `Buy ${name}`
          : `Sell ${name}`;

  return (
    <TradeCard
      symbol={symbol}
      side={side}
      onSide={(s) => {
        setSide(s);
        setAmount("");
      }}
      sellDisabled={shares === 0n}
      sellTitle={shares === 0n ? `You hold no ${ticker} yet` : undefined}
      position={shares > 0n ? { value: `$${fmt(positionUsd)}`, sub: `${fmt(Number(shares) / 1e18, 4)} ${ticker}` } : null}
      spendLabel={side === "buy" ? "You spend" : "You sell"}
      amount={amount}
      onAmount={setAmount}
      amountUnit={side === "buy" ? "fUSD" : ticker}
      onMax={() => setAmount(formatUnits(max, side === "buy" ? 6 : 18))}
      maxDisabled={max === 0n}
      over={over}
      chips={chips}
      available={side === "buy" ? `${fmt(Number(fusd) / 1e6)} fUSD` : `${fmt(Number(shares) / 1e18, 4)} ${ticker}`}
      receiveValue={`$${fmt(receiveUsd)}`}
      receiveUnit={side === "buy" ? `of ${name}` : "fUSD"}
      fine={`Includes the ${(SKIM_FEE_BPS / 100).toFixed(2)}% fee`}
      warn={
        overCapacity && !over
          ? `The vault can fill about $${fmt(basket?.capacityUsd ?? 0, (basket?.capacityUsd ?? 0) < 1 ? 4 : 2)} right now.`
          : paused
            ? "New buys are paused. Selling stays open."
            : null
      }
      cta={{ label: ctaLabel, onClick: () => void submit(), disabled: !parsed || !quote || over || overCapacity || paused || progress != null }}
      progress={progress ? <TradeProgress steps={["Approve in QoreX"]} step={progress.step} tone={progress.tone} label={progress.label} /> : undefined}
    />
  );
}
