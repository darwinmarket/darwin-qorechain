"use client";

/**
 * The connected-account pill in the navbar. A click opens a small menu instead of disconnecting
 * outright (that was too easy to trigger by accident): Copy address + Disconnect. Closes on
 * outside-click or Escape. The trigger keeps the navbar's pill-outline look; the full account id is
 * copied (and kept in the title), while the pill shows the shortened label.
 */
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export function AccountMenu({
  label,
  accountId,
  onDisconnect,
  className,
}: {
  label: string;
  accountId: string;
  onDisconnect: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard denied — nothing to do */
    }
  }

  return (
    <div ref={ref} className="account-menu">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={accountId}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          "pill-outline inline-flex items-center gap-1 rounded-full h-10 px-[15px] text-[14px] font-medium whitespace-nowrap text-white",
          className,
        )}
      >
        {label}
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="account-menu__pop">
          <button type="button" role="menuitem" className="account-menu__item" onClick={copy}>
            {copied ? "Copied ✓" : "Copy address"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="account-menu__item account-menu__item--danger"
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
