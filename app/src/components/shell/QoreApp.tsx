"use client";

/**
 * The Darwin app on QoreChain: the mainnet front's frame, navbar, home, basket screen and trade card,
 * with QoreX in place of the Miden wallet. Tabs: Baskets, Portfolio, Activity, and Security (the
 * post-quantum oracle and who can do what).
 */
import { useEffect, useState } from "react";
import { BASKETS, basketSymbolFromLocation, syncBasketUrl } from "@/lib/baskets";
import { QOREX_INSTALL_URL } from "@/lib/qore/links";
import { useWallet } from "@/lib/qore/wallet";
import { DarwinHome } from "../darwin/DarwinHome";
import { HeroActions, darwinContainer } from "../darwin/shell";
import { AccountMenu } from "./AccountMenu";
import { AppFrame } from "./AppFrame";
import { AppNavbar, NAV_ACTION_WIDTH, SigningInPill } from "./AppNavbar";
import AnimatedButton from "./AnimatedButton";
import { BasketScreen } from "./BasketScreen";
import { PreConnectCard } from "./PreConnectCard";
import { TradeHistory } from "./QoreActivity";
import dynamic from "next/dynamic";

// Loaded when opened: they bring the QoreChain SDK and its WASM, which the home page does not need.
const ActivityTab = dynamic(() => import("./QoreActivity").then((m) => m.ActivityTab), { ssr: false });
const QorePortfolio = dynamic(() => import("./QorePortfolio").then((m) => m.QorePortfolio), { ssr: false });
const QoreTradePanel = dynamic(() => import("./QoreTradePanel").then((m) => m.QoreTradePanel), { ssr: false });
const SecurityTab = dynamic(() => import("./SecurityTab").then((m) => m.SecurityTab), { ssr: false });
import { useToast } from "./Toast";
import { usePanelScroll } from "./usePanelScroll";

const TABS = ["Baskets", "Portfolio", "Activity", "Security"] as const;
type Tab = (typeof TABS)[number];

const short = (v: string) => `${v.slice(0, 8)}…${v.slice(-4)}`;
const nameOf = (symbol: string) => BASKETS.find((b) => b.symbol === symbol)?.name ?? symbol;

export function QoreApp() {
  const { account, connect, connecting, disconnect, installed, error } = useWallet();
  const toast = useToast();
  // `/?tab=Activity` opens a tab directly (the transaction page's navbar links here).
  const [tab, setTab] = useState<Tab>(() => {
    const t = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return (TABS as readonly string[]).includes(t ?? "") ? (t as Tab) : "Baskets";
  });
  const [openSymbol, setOpenSymbol] = useState<string | null>(() =>
    typeof window === "undefined" ? null : basketSymbolFromLocation(window.location),
  );

  useEffect(() => {
    syncBasketUrl(openSymbol);
  }, [openSymbol]);
  useEffect(() => {
    const onPop = () => setOpenSymbol(basketSymbolFromLocation(window.location));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  usePanelScroll(openSymbol);

  // QoreX missing or refusing: say so where the user looks, with the way to fix it.
  useEffect(() => {
    if (!error) return;
    toast.push({
      type: installed === false ? "info" : "error",
      title: installed === false ? "Install QoreX to trade" : "Couldn't connect QoreX",
      message: installed === false ? "Darwin trades are signed by QoreX, QoreChain's wallet, with secp256k1 and ML-DSA-87." : error,
      action: installed === false ? { label: "Get QoreX", onClick: () => window.open(QOREX_INSTALL_URL, "_blank", "noreferrer") } : undefined,
      duration: 9000,
    });
  }, [error, installed, toast]);

  const goHome = () => {
    setOpenSymbol(null);
    setTab("Baskets");
  };
  const open = (symbol: string) => {
    setTab("Baskets");
    setOpenSymbol(symbol);
  };

  const right = connecting ? (
    <SigningInPill onCancel={disconnect} />
  ) : account ? (
    <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
      <AccountMenu label={short(account.address)} accountId={account.address} onDisconnect={disconnect} className={`${NAV_ACTION_WIDTH} !font-mono !text-[12px]`} />
    </span>
  ) : (
    <AnimatedButton onClick={() => void connect()} className={`h-10 px-[17px] text-[14px] font-medium ${NAV_ACTION_WIDTH}`}>
      Connect wallet
    </AnimatedButton>
  );

  const connectPrompt = (what: string, line: string) => (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "clamp(60px, 14vh, 160px) 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{what}</h1>
      <p style={{ marginTop: 10, color: "var(--ink-3)" }}>{line}</p>
      <span style={{ display: "inline-flex", marginTop: 22 }}>
        <AnimatedButton variant="primary" onClick={() => void connect()} className="h-11 px-6 text-[15px] font-medium">
          Connect wallet
        </AnimatedButton>
      </span>
    </main>
  );

  return (
    <AppFrame
      nav={<AppNavbar tabs={[...TABS]} activeTab={tab} onTab={(t) => setTab(t as Tab)} onHome={goHome} right={right} />}
    >
      {tab === "Baskets" && (
        <main style={openSymbol ? { ...darwinContainer, display: "none" } : darwinContainer}>
          <DarwinHome onOpen={(symbol: string) => setOpenSymbol(symbol)} actions={<HeroActions />} />
          <TradeHistory address={account?.address ?? null} limit={5} onViewAll={() => setTab("Activity")} />
        </main>
      )}

      {tab === "Baskets" && openSymbol && (
        <BasketScreen symbol={openSymbol} name={nameOf(openSymbol)} onClose={() => setOpenSymbol(null)} onOpen={setOpenSymbol}>
          {account ? (
            <QoreTradePanel key={openSymbol} symbol={openSymbol} name={nameOf(openSymbol)} />
          ) : (
            <PreConnectCard symbol={openSymbol} name={nameOf(openSymbol)} onConnect={() => void connect()} connecting={connecting} />
          )}
        </BasketScreen>
      )}

      {tab === "Portfolio" &&
        (account ? <QorePortfolio onOpen={open} onGoBaskets={goHome} /> : connectPrompt("Portfolio", "Connect a wallet to see your holdings and positions."))}

      {tab === "Activity" &&
        (account ? <ActivityTab address={account.address} /> : connectPrompt("Activity", "Connect a wallet to see your transaction activity."))}

      {tab === "Security" && <SecurityTab />}
    </AppFrame>
  );
}
