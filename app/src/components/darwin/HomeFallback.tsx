"use client";

/**
 * The whole Baskets page, rendered while the app's (ssr:false) chunk downloads. The react-query
 * provider sits in the root layout, so this light copy can fetch prices and history itself: the
 * hero, the NAV figures and the Explore grid are all on screen before the heavy bundle lands,
 * and the mounted app finds every query already in cache. Same components and container as the
 * real thing, so nothing moves when it takes over.
 */

import { useEffect } from "react";

import { warmPrices } from "@/lib/darwin/store";
import { DarwinHome } from "./DarwinHome";
import { HeroActions, darwinContainer } from "./shell";

export function HomeFallback() {
  useEffect(() => {
    // Starts the price request a beat before the query mounts; the query adopts this promise.
    void warmPrices();
    // The shader's chunk (1.4 MB) is pulled by HeroShader itself, after the page and its prices.
  }, []);

  return (
    <main style={darwinContainer}>
      {/* No shader: the app mounts its own moments later. Baskets open nothing yet, so they
          render as the same buttons the app uses rather than links to a route we don't have. */}
      <DarwinHome shader={false} onOpen={() => {}} actions={<HeroActions />} />
    </main>
  );
}
