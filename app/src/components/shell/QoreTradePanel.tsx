"use client";

/**
 * The trade panel on QoreChain, drawn with the mainnet front's TradeCard: deposit fUSD, receive the
 * basket token; sell the basket token, receive fUSD.
 *
 * QoreX does not sign cross-VM calls, so a trade is a plain-text message the user signs in QoreX
 * (secp256k1 + ML-DSA-87). Darwin's relayer submits it to the user's DarwinAccount, which checks the
 * ML-DSA-87 signature on chain with pqcVerify before calling the router (lib/qore/accountClient.ts).
 * No EVM window, no grant, no gas for the trade. fUSD still in the QoreX wallet is deposited onto
 * the account first, with one MsgSend QoreX displays.
 *
 * Shares bought before DarwinAccounts sit on the user's EVM twin; selling those still takes the
 * original path: an EVM window opened in QoreX and a grant to the relayer (lib/qore/relay.ts).
 */
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { SKIM_FEE_BPS, basketTicker } from "@/lib/baskets";
import { useBaskets } from "@/lib/darwin/store";
import { txUrl } from "@/lib/qore/chain";
import { isQorexRejection } from "@/lib/qore/qorex";
import { authorizeRelayer, relayTrade, useRelayStatus } from "@/lib/qore/relay";
import { depositFusd, readAccount, signAndExecute, tradeCalls } from "@/lib/qore/accountClient";
import { quoteBuy, quoteSell } from "@/lib/qore/trade";
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

/**
 * Quick amounts a buyer can always fill: $25 / $50 / $100 when the vault is deep, otherwise round
 * amounts within what it can fill now (the QOR baskets, at QOR's market price).
 */
function buyChips(capacityUsd: number | undefined): number[] {
  const cap = capacityUsd ?? Infinity;
  if (!(cap < 150)) return [25, 50, 100];
  const nice = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50];
  const fit = nice.filter((v) => v <= cap * 0.8);
  return fit.length >= 3 ? fit.slice(-3) : fit.length ? fit : [0.01];
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
  const acct = balances?.acct ?? null;
  const acctShares = acct?.shares[symbol] ?? 0n;
  const twinShares = balances?.shares[symbol] ?? 0n;
  // shares bought before DarwinAccounts: sold through the original, windowed path
  const legacySell = side === "sell" && acctShares === 0n && twinShares > 0n;
  const relay = useRelayStatus(legacySell ? account?.address : null);
  // what is still missing before a trade can go through
  const setup: "window" | "grant" | "offline" | null = !account || !balances
    ? null
    : !acct
      ? "offline"
      : !legacySell
        ? null
        : relay.error
          ? "offline"
          : !relay.data
            ? null
            : !relay.data.window.live
              ? "window"
              : !relay.data.grants.crossvm || !relay.data.grants.convert
                ? "grant"
                : null;

  // fUSD a buy can use: the account's, plus the wallet's bank fUSD (deposited first)
  const fusd = balances ? balances.fusdBank + (acct?.fusd ?? 0n) : 0n;
  const shares = legacySell ? twinShares : acctShares > 0n ? acctShares : twinShares;
  const heldShares = acctShares + twinShares;
  const sharePrice = basket?.sharePriceUsd ?? 0;
  const positionUsd = (Number(heldShares) / 1e18) * sharePrice;
  const needsDeposit = side === "buy" && acct != null && parsedNeedsDeposit();
  function parsedNeedsDeposit() {
    try {
      return Boolean(amount) && Number(amount) > 0 && parseUnits(amount, 6) > (acct?.fusd ?? 0n);
    } catch {
      return false;
    }
  }

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

  async function authorize() {
    if (!account || !relay.data) return;
    setProgress({ step: 0, tone: "working", label: "Approve the authorization in QoreX…" });
    try {
      await authorizeRelayer(account.address, relay.data.relayer, 24);
      setProgress({ step: 0, tone: "done", label: "Darwin's relayer is authorized for 24 hours" });
      await relay.refetch();
      setTimeout(() => setProgress(null), 2200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const declined = isQorexRejection(e) || /denied|declin|cancel/i.test(msg);
      setProgress({ step: 0, tone: "error", label: declined ? "Declined in QoreX" : "Authorization failed" });
      if (!declined) toast.push({ type: "error", title: "Authorization failed", message: msg.slice(0, 180) });
      setTimeout(() => setProgress(null), 2500);
    }
  }

  async function submit() {
    if (setup === "grant") return authorize();
    if (!account || !parsed || !basket || !quote) return;
    const min = (quote.out * 99n) / 100n;
    const withDeposit = needsDeposit;
    const signStep = withDeposit ? 1 : 0;
    try {
      let res: { txHash: string };
      if (legacySell) {
        setProgress({ step: 0, tone: "working", label: "Sign your trade in QoreX…" });
        res = await relayTrade({ account: account.address, action: side, basket: basket.address, amount: parsed, min }, () =>
          setProgress({ step: 1, tone: "working", label: "Darwin's relayer is executing it…" }),
        );
      } else {
        let info = acct!;
        if (withDeposit) {
          setProgress({ step: 0, tone: "working", label: "Approve the fUSD deposit in QoreX…" });
          await depositFusd(account.address, info.relayer.cosmos, parsed - info.fusd);
          info = await readAccount(account.address);
        }
        setProgress({ step: signStep, tone: "working", label: "Sign your trade in QoreX…" });
        const verb = side === "buy" ? `Buy ${fmt(Number(parsed) / 1e6)} fUSD of ${ticker}` : `Sell ${fmt(Number(parsed) / 1e18, 6)} ${ticker}`;
        res = await signAndExecute(
          account.address,
          info,
          tradeCalls(info, side, basket.address as Address, parsed, min),
          `Darwin: ${verb}, for at least ${side === "buy" ? `${fmt(Number(min) / 1e18, 6)} ${ticker}` : `${fmt(Number(min) / 1e6)} fUSD`}`,
          () => setProgress({ step: signStep + 1, tone: "working", label: "Your account checks the signature on chain…" }),
        );
      }
      setProgress({ step: legacySell ? 1 : signStep + 1, tone: "done", label: side === "buy" ? `Bought ${ticker}` : `Sold ${ticker}` });
      toast.push({
        type: "success",
        title: side === "buy" ? `Bought ${name}` : `Sold ${name}`,
        message: legacySell
          ? "Your intent, signed with secp256k1 and ML-DSA-87, was verified on chain keys and executed for you."
          : "Your Darwin account verified your ML-DSA-87 signature on chain (pqcVerify), then traded.",
        action: { label: "View transaction", onClick: () => window.open(txUrl(res.txHash), "_blank", "noreferrer") },
        duration: 9000,
      });
      setAmount("");
      setTimeout(refresh, 2500);
      setTimeout(() => setProgress(null), 2200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const declined = isQorexRejection(e) || /denied|declin|cancel/i.test(msg);
      setProgress({ step: 0, tone: "error", label: declined ? "Declined in QoreX" : "Trade failed" });
      toast.push({ type: declined ? "info" : "error", title: declined ? "Trade cancelled" : "Trade failed", message: declined ? undefined : msg.slice(0, 180) });
      setTimeout(() => setProgress(null), 2500);
    }
  }

  const chips =
    side === "buy"
      ? buyChips(basket?.capacityUsd).map((v) => ({ label: `$${v}`, onClick: () => setAmount(String(v)) }))
      : [25, 50, 100].map((p) => ({
          label: p === 100 ? "All" : `${p}%`,
          disabled: shares === 0n,
          onClick: () => setAmount(formatUnits((shares * BigInt(p)) / 100n, 18)),
        }));

  const ctaLabel = setup === "grant"
    ? "Authorize Darwin's relayer (24 h)"
    : setup === "window"
      ? "Open an EVM window in QoreX"
      : setup === "offline"
        ? "Relayer offline"
        : paused
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
      sellDisabled={heldShares === 0n}
      sellTitle={heldShares === 0n ? `You hold no ${ticker} yet` : undefined}
      position={heldShares > 0n ? { value: `$${fmt(positionUsd)}`, sub: `${fmt(Number(heldShares) / 1e18, 4)} ${ticker}` } : null}
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
        setup === "offline" && !legacySell
          ? "Darwin's relayer is not reachable right now."
          : legacySell && setup === "window"
          ? "These shares were bought before Darwin accounts, so selling them takes the original setup: open QoreX → EVM access window, and open one (it lasts about 7 hours). New trades need none of this."
          : setup === "window"
          ? "Setup: open QoreX → EVM access window, and open one (it lasts about 7 hours; the relayer's authorization, 24). QoreX does not sign EVM calls itself, so Darwin's relayer executes the trades you sign, and the chain admits them only while your window is open."
          : setup === "grant"
            ? "Next: let Darwin's relayer execute the trades you sign, for 24 hours. QoreX shows the authorization before you approve it."
            : setup === "offline"
              ? "Darwin's trade relayer is not reachable right now."
              : overCapacity && !over
          ? `The vault can fill about $${fmt(basket?.capacityUsd ?? 0, (basket?.capacityUsd ?? 0) < 1 ? 4 : 2)} right now.`
          : paused
            ? "New buys are paused. Selling stays open."
            : null
      }
      cta={{
        label: ctaLabel,
        onClick: () => void submit(),
        disabled:
          setup === "grant"
            ? progress != null
            : setup !== null || !parsed || !quote || over || overCapacity || paused || progress != null,
      }}
      progress={
        progress ? (
          <TradeProgress
            steps={setup === "grant" ? ["Authorize in QoreX"] : needsDeposit ? ["Deposit in QoreX", "Sign in QoreX", "Verified on chain"] : legacySell ? ["Sign in QoreX", "Darwin executes"] : ["Sign in QoreX", "Verified on chain"]}
            step={progress.step}
            tone={progress.tone}
            label={progress.label}
          />
        ) : undefined
      }
    />
  );
}
