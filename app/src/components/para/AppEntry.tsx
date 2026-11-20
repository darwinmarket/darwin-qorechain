"use client";

import dynamic from "next/dynamic";
import { LogoFull } from "../Logo";
import { HomeFallback } from "../darwin/HomeFallback";

/**
 * As on mainnet: the app mounts on the client (it reads the wallet and the URL), and while its
 * chunk loads the same frame is already on screen, so nothing shifts when it takes over.
 */
const QoreApp = dynamic(() => import("./QoreApp").then((m) => m.QoreApp), {
  ssr: false,
  loading: () => (
    <div className="frame-gradient" style={{ height: "100vh", display: "flex", flexDirection: "column", boxSizing: "border-box", fontFamily: "var(--font-sans-stack)", color: "var(--ink)" }}>
      <div style={{ flexShrink: 0, padding: "2px 10px 0" }}>
        <header className="relative z-50 px-4 md:pl-6 md:pr-[24px] py-3 md:py-[11px]">
          <div className="flex items-center" style={{ minHeight: 44 }}>
            <span className="nav-logo flex items-center shrink-0" style={{ filter: "invert(1) brightness(2)" }}>
              <LogoFull aria-label="Darwin" />
            </span>
          </div>
        </header>
      </div>
      <div className="frame-panel frame-panel-rounded" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", margin: "4px 10px 10px" }}>
        <HomeFallback />
      </div>
    </div>
  ),
});

export function AppEntry() {
  return <QoreApp />;
}
