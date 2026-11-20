"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { LogoFull } from "../Logo";

/**
 * Agama's navbar, replicated with its EXACT markup + Tailwind classes (recolored to Darwin orange):
 * logo left · a centered rounded pill-bar of tabs · a right cluster (network pill + connect / account).
 * Renders on the orange frame gradient (AgamaFrame), so text is white/cream.
 */
export function AgamaNavbar({
  tabs,
  activeTab,
  onTab,
  onHome,
  right,
}: {
  tabs: string[];
  activeTab?: string;
  onTab?: (t: string) => void;
  /** Back to the baskets grid. Wired to the logo and to the Baskets tab. */
  onHome?: () => void;
  right: ReactNode;
}) {
  const logo = <LogoFull aria-label="Darwin" />;
  return (
    <header className="relative z-50 px-4 md:pl-6 md:pr-[24px] py-3 md:py-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: logo — the way home, as everywhere else on the web. */}
        <span className="nav-logo flex items-center shrink-0" style={{ filter: "invert(1) brightness(2)" }}>
          {onHome ? (
            <button type="button" onClick={onHome} aria-label="Darwin — all baskets" className="flex items-center cursor-pointer">
              {logo}
            </button>
          ) : (
            logo
          )}
        </span>

        {/* Center: pill-bar of tabs (exact Agama classes) */}
        {/*
         * This bar used to be `hidden md:flex`, which took the ONLY way between Baskets, Portfolio
         * and Activity off every phone. The buttons stayed in the DOM, so nothing looked broken,
         * but below 768px the logo — which goes to Baskets — was the sole working control, and
         * there is no hamburger or bottom bar to fall back on.
         *
         * Below md the header row wraps and the bar takes a line of its own, full width, the three
         * pills sharing it equally. From md it returns inline beside the logo with its original
         * classes, so the desktop header is unchanged.
         */}
        <nav className="order-last mt-1 flex w-full justify-between pill-bar items-center gap-1 rounded-full h-[47px] px-[3.5px] md:order-none md:mt-0 md:-mb-[3px] md:w-auto md:justify-start md:mr-auto md:ml-10">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => (t === "Baskets" && onHome ? onHome() : onTab?.(t))}
              className={clsx(
                "flex flex-1 items-center justify-center rounded-full text-white transition-colors h-10 px-4 text-[14px] md:flex-none md:justify-start md:px-5",
                t === activeTab ? "pill-active" : "hover:bg-white/10",
              )}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2 shrink-0">{right}</div>
      </div>
    </header>
  );
}

/** Connect / action pill button — Agama's exact button classes (pill-outline). */
/** One fixed width for the far-right slot, so it reads the same in all three states:
 *  "Connect wallet" on the landing, "Cancel" while signing in, the account pill once connected.
 *  135px is the Connect wallet width; the widest label (the account + power icon) measures 130. */
export const NAV_ACTION_WIDTH = "w-[135px] justify-center overflow-hidden";

/**
 * The header slot while the wallet's own popup is up. The popup already owns the decision
 * (Deny / Connect), so this reports state instead of offering a competing choice — but it stays
 * clickable, otherwise a popup lost behind the window would strand the user.
 */
export function SigningInPill({ onCancel }: { onCancel?: () => void }) {
  return (
    <NavPillButton onClick={onCancel} title="Cancel sign-in" className={`${NAV_ACTION_WIDTH} gap-2`}>
      <span
        className="toast-spin"
        aria-hidden
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          border: "2px solid rgba(253,248,237,0.35)",
          borderTopColor: "#fdf8ed",
          flex: "none",
        }}
      />
      Signing in…
    </NavPillButton>
  );
}

export function NavPillButton({
  children,
  onClick,
  title,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx("pill-outline inline-flex items-center rounded-full h-10 px-[17px] text-[14px] font-medium whitespace-nowrap text-white", className)}
    >
      {children}
    </button>
  );
}
