"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Connecting must not change the page under the reader. This is what makes that true.
 *
 * THE PROBLEM. Connecting replaces the whole tree: ConnectGate unmounts, the dynamic import's
 * backdrop mounts, then the wallet providers' backdrop while QoreX asks for approval, then the real
 * shell. Every one of them draws its own AppFrame, so each swap hands the reader brand new DOM
 * — which does two things it shouldn't.
 *
 * It starts at the top. The frame's cream panel is the app's only scroller, and a fresh panel has
 * scrollTop 0. Halfway down a basket, clicking Connect threw the reader back to its title: measured
 * on the recording, the page was at the top in the very next frame, 60ms after the click.
 *
 * And it plays its entrance again. BasketScreen's `.page` fades in from nothing and rises 6px, which
 * is right when a basket is opened and wrong when the same basket is merely re-rendered under a new
 * provider — the page the reader is already looking at washes out and slides. Measured: the whole
 * content area 6 grey levels brighter and 3px low, one frame after the click.
 *
 * So a handoff is opened on the click that starts the swap. While it is open, every frame that
 * mounts puts the scroll position back and skips its entrance, and the reader sees one continuous
 * page with only the button and the navbar changing.
 *
 * WHY THE RESTORE RETRIES. The panel's content (the chart, the composition, the other-baskets list)
 * lays out over the next few frames. Until it has, the panel is shorter than it will be and the
 * browser clamps scrollTop to that smaller height, so one assignment lands short.
 *
 * WHY THE BACKDROPS DON'T END IT. They are stand-ins; the shell is still coming and needs the same
 * treatment. Only a frame that is not `transient` consumes the handoff. Until then it survives the
 * whole connect, however long the reader leaves the wallet popup open — and their own wheel or touch
 * ends it immediately, because a position they have just left is not one to put them back to.
 */

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** A connect that is never completed shouldn't still be holding a position an hour later. */
const HANDOFF_MS = 120_000;
const RETRY_MS = 50;
const MAX_RETRIES = 20;
/**
 * How long the real shell keeps re-asserting the position after reaching it. Layout effects run
 * children first, so this frame restores BEFORE the shell around it runs its own — and the shell's
 * usePanelScroll sends a freshly opened basket to its title. It stands down while a handoff is
 * open, which is why the handoff must not close the instant the position lands; this window is
 * what keeps it open for the rest of the commit, and re-applies over anything late.
 */
const SETTLE_MS = 400;

let open: { top: number; until: number } | null = null;
let detachUserWatch: (() => void) | null = null;

function closeHandoff(): void {
  open = null;
  detachUserWatch?.();
  detachUserWatch = null;
}

/** Open a handoff on the click that is about to swap the tree, noting where the reader is. */
export function beginPanelHandoff(panel?: HTMLElement | null): void {
  closeHandoff();
  const el = panel ?? document.querySelector<HTMLElement>(".frame-panel");
  open = { top: el?.scrollTop ?? 0, until: Date.now() + HANDOFF_MS };

  // Their own scrolling outranks ours.
  const onUser = () => closeHandoff();
  window.addEventListener("wheel", onUser, { passive: true, capture: true });
  window.addEventListener("touchstart", onUser, { passive: true, capture: true });
  detachUserWatch = () => {
    window.removeEventListener("wheel", onUser, { capture: true });
    window.removeEventListener("touchstart", onUser, { capture: true });
  };
}

/** True while a swap is in flight — scroll resets and entrance animations must stand down. */
export function panelHandoffPending(): boolean {
  if (open && Date.now() > open.until) closeHandoff();
  return open !== null;
}

/**
 * Decided once, at mount, and never revised: whether this piece of UI is appearing because a swap
 * handed it over (so it should look like it was always there) or because the reader asked for it.
 * A value that flipped mid-life would start the entrance animation late, which is the flash it is
 * here to prevent.
 */
export function useHandedOver(): boolean {
  const [handedOver] = useState(panelHandoffPending);
  return handedOver;
}

/**
 * Put the carried position back on this frame's panel. `transient` marks the stand-in frames shown
 * during a connect, which restore but leave the handoff open for the shell that follows them.
 */
export function usePanelHandoff(panelRef: RefObject<HTMLElement | null>, transient: boolean): void {
  useIsomorphicLayoutEffect(() => {
    if (!panelHandoffPending()) return;
    const target = open!.top;
    const panel = panelRef.current;
    if (!panel) return;
    // Nothing to restore, but the handoff still has to stay open for the entrance animations and
    // for the shell behind this frame.
    if (target <= 0) {
      if (!transient) setTimeout(closeHandoff, SETTLE_MS);
      return;
    }

    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settledAt = Date.now() + (transient ? 0 : SETTLE_MS);
    const apply = () => {
      timer = null;
      if (!panelHandoffPending()) return; // the reader took over
      // Only when it actually differs: a redundant assignment re-triggers the overlay scrollbar,
      // which then sits there fading for a second — movement, in a routine that exists to stop it.
      if (panel.scrollTop !== target) panel.scrollTop = target;
      const reached = panel.scrollTop >= target;
      if (++tries >= MAX_RETRIES || (reached && Date.now() >= settledAt)) {
        if (!transient) closeHandoff(); // the real shell is up and in place
        return;
      }
      timer = setTimeout(apply, RETRY_MS);
    };
    apply();

    return () => {
      if (timer) clearTimeout(timer);
    };
    // Mount only: a frame restores once, when it appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
