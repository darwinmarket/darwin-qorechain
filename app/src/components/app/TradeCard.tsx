"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import type { Basket } from "@/lib/darwin/types";
import { basketTicker } from "@/lib/baskets";
import { txUrl } from "@/lib/qore/chain";
import { signAndBroadcast, QOREX_INSTALL_URL, type QorexResult } from "@/lib/qore/qorex";
import { buildBuy, buildRedeem, buildSell, quoteBuy, quoteRedeem, quoteSell } from "@/lib/qore/trade";
import { TOKEN_INFO, tokenKeyOf } from "@/lib/qore/chain";
import { useWallet } from "@/lib/qore/wallet";
import styles from "./app.module.css";

type Side = "buy" | "sell";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function TradeCard({ basket }: { basket: Basket }) {
  const { account, connect, connecting, balances, refresh, installed } = useWallet();
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [inKind, setInKind] = useState(false);
  const [quote, setQuote] = useState<{ out: bigint; fee: bigint } | null>(null);
  const [kindQuote, setKindQuote] = useState<{ symbol: string; amount: number }[] | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<(QorexResult & { side: Side; inKind?: boolean }) | null>(null);
  const ticker = basketTicker(basket.symbol);
  const debounced = useDebounced(amount);

  const fusd = balances ? balances.fusdBank + balances.fusdErc20 : 0n;
  const shares = balances?.shares[basket.symbol] ?? 0n;

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
    setKindQuote(null);
    setQuoteErr(null);
    if (!parsed) return;
    if (side === "sell" && inKind) {
      quoteRedeem(basket.address as Address, parsed)
        .then((amounts) => {
          if (!alive) return;
          setKindQuote(
            basket.legs.map((l, i) => {
              const info = TOKEN_INFO[tokenKeyOf(l.address)];
              return { symbol: info?.symbol ?? l.symbol, amount: Number(amounts[i]) / 10 ** (info?.decimals ?? 18) };
            }),
          );
        })
        .catch((e) => alive && setQuoteErr(String(e?.shortMessage ?? e?.message ?? e).slice(0, 160)));
      return () => {
        alive = false;
      };
    }
    const run = side === "buy"
      ? quoteBuy(basket.address as Address, parsed).then((q) => ({ out: q.shares, fee: q.fee }))
      : quoteSell(basket.address as Address, parsed).then((q) => ({ out: q.usdOut, fee: q.fee }));
    run
      .then((q) => alive && setQuote(q))
      .catch((e) => alive && setQuoteErr(String(e?.shortMessage ?? e?.message ?? e).slice(0, 160)));
    return () => {
      alive = false;
    };
  }, [parsed, side, inKind, basket.address, basket.legs]);

  const max = side === "buy" ? fusd : shares;
  const insufficient = parsed !== null && parsed > max;
  // The reserve sells the components at oracle prices from its inventory: a buy above what it can
  // deliver would revert on chain, so it is refused here first.
  const overCapacity = side === "buy" && parsed !== null && Number(parsed) / 1e6 > basket.capacityUsd * 0.98;
  const mintPaused = side === "buy" && basket.paused;

  async function submit() {
    if (!account || !parsed || !balances) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const built = side === "buy"
        ? await buildBuy(account, basket.address as Address, parsed, balances.fusdErc20, balances.fusdBank)
        : inKind
          ? buildRedeem(account, basket.address as Address, parsed)
          : await buildSell(account, basket.address as Address, parsed);
      const memo = side === "buy" ? `Darwin: buy ${ticker}` : inKind ? `Darwin: redeem ${ticker} in kind` : `Darwin: sell ${ticker}`;
      const res = await signAndBroadcast(built.msgs, memo, built.gas);
      setDone({ ...res, side, inKind: side === "sell" && inKind });
      setAmount("");
      setTimeout(refresh, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.tabs} role="tablist">
        {(["buy", "sell"] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={side === s}
            className={`${styles.tab} ${side === s ? styles.tabOn : ""}`}
            onClick={() => {
              setSide(s);
              setAmount("");
            }}
          >
            {s === "buy" ? `Buy ${ticker}` : `Sell ${ticker}`}
          </button>
        ))}
      </div>

      <div className={styles.field}>
        <div className={styles.fieldTop}>
          <span>{side === "buy" ? "You pay" : "You sell"}</span>
          {account && (
            <span>
              Balance {Number(formatUnits(max, side === "buy" ? 6 : 18)).toLocaleString("en-US", { maximumFractionDigits: 4 })}
            </span>
          )}
        </div>
        <div className={styles.inputWrap}>
          <input
            className={styles.input}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))}
            aria-label={side === "buy" ? "fUSD to pay" : `${ticker} to sell`}
          />
          {account && max > 0n && (
            <button type="button" className={styles.maxBtn} onClick={() => setAmount(formatUnits(max, side === "buy" ? 6 : 18))}>
              Max
            </button>
          )}
          <span className={styles.unit}>{side === "buy" ? "fUSD" : ticker}</span>
        </div>
      </div>

      {side === "sell" && (
        <div className={styles.tabs} role="radiogroup" aria-label="Receive" style={{ marginBottom: 12 }}>
          <button type="button" role="radio" aria-checked={!inKind} className={`${styles.tab} ${!inKind ? styles.tabOn : ""}`} onClick={() => setInKind(false)}>
            Receive fUSD
          </button>
          <button type="button" role="radio" aria-checked={inKind} className={`${styles.tab} ${inKind ? styles.tabOn : ""}`} onClick={() => setInKind(true)}>
            Receive the coins
          </button>
        </div>
      )}

      {kindQuote && (
        <div className={styles.quote}>
          {kindQuote.map((k) => (
            <div key={k.symbol}>
              <span>{k.symbol}</span>
              <strong>{k.amount.toPrecision(5)}</strong>
            </div>
          ))}
          <div>
            <span>Fee</span>
            <span>none: redemption in kind is free, needs no oracle and never pauses</span>
          </div>
        </div>
      )}

      {(quote || quoteErr) && (
        <div className={styles.quote}>
          {quote && (
            <>
              <div>
                <span>You receive (about)</span>
                <strong>
                  {side === "buy"
                    ? `${Number(formatUnits(quote.out, 18)).toFixed(4)} ${ticker}`
                    : `${Number(formatUnits(quote.out, 6)).toFixed(2)} fUSD`}
                </strong>
              </div>
              <div>
                <span>Darwin fee (0.30%)</span>
                <span>{Number(formatUnits(quote.fee, 6)).toFixed(4)} fUSD</span>
              </div>
              <div>
                <span>Priced at</span>
                <span>ML-DSA-87 signed oracle, 0.5% max slippage</span>
              </div>
            </>
          )}
          {quoteErr && <div className={styles.errorBox}>{quoteErr}</div>}
        </div>
      )}

      {!account ? (
        installed === false ? (
          <a className={styles.cta} style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={QOREX_INSTALL_URL} target="_blank" rel="noreferrer">
            Install QoreX to trade
          </a>
        ) : (
          <button type="button" className={styles.cta} onClick={() => void connect()} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect QoreX"}
          </button>
        )
      ) : (
        <button type="button" className={styles.cta} disabled={!parsed || !(quote || kindQuote) || insufficient || overCapacity || mintPaused || busy} onClick={() => void submit()}>
          {busy
            ? "Sign in QoreX…"
            : mintPaused
              ? "Minting is paused (selling and redeeming stay open)"
              : insufficient
              ? side === "buy" ? "Not enough fUSD" : `Not enough ${ticker}`
              : overCapacity
                ? `Above the reserve's liquidity (max ~${basket.capacityUsd.toFixed(2)} fUSD)`
              : side === "buy" ? `Buy ${ticker}` : inKind ? `Redeem ${ticker} in kind` : `Sell ${ticker}`}
        </button>
      )}

      {error && <div className={styles.errorBox} style={{ marginTop: 12 }}>{error}</div>}
      {done && (
        <div className={styles.okBox} style={{ marginTop: 12 }}>
          {done.side === "buy" ? "Bought" : done.inKind ? "Redeemed" : "Sold"}.{" "}
          {done.shield === "shielded" ? "QoreX confirms the ML-DSA-87 layer is in the committed transaction." : `Signature state: ${done.shield}.`}{" "}
          <a className={styles.a} href={txUrl(done.txHash)} target="_blank" rel="noreferrer">
            View transaction
          </a>
        </div>
      )}

      <div className={styles.pqLine}>
        <span className={styles.shield}>Q</span>
        <span>
          One transaction, one approval in QoreX, signed with secp256k1 <b>and</b> ML-DSA-87. Darwin calls its EVM contracts through a
          native cross-VM message, converting faucet fUSD on the way when needed.
        </span>
      </div>
    </section>
  );
}
