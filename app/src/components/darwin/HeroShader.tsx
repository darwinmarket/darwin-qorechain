"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { HeroPalette } from "./HeroShaderCanvas";

type CanvasComponent = ComponentType<{ className?: string; palette?: HeroPalette }>;

/** Loads the WebGPU hero background lazily; a plain placeholder until then (or for reduced motion). */
export function HeroShader({ className, palette }: { className?: string; palette?: HeroPalette }) {
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    // 1.4 MB of WebGPU code: wait until the page and its first data are in, then load it when idle
    const start = () => {
      if (cancelled) return;
      import("./HeroShaderCanvas").then(({ default: component }) => {
        if (!cancelled) setCanvas(() => component);
      });
    };
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 1500);
    const t = window.setTimeout(() => idle(start), 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  return Canvas ? <Canvas className={className} palette={palette} /> : <div className={className} aria-hidden="true" />;
}
