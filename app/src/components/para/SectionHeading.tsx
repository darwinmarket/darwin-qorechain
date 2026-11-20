"use client";

/**
 * The product's one section heading, usable outside the `.darwin-ui` scope.
 *
 * "Explore baskets" is `.t-h2` inside `.darwin-ui`, which is where both halves of its look live:
 * the metrics in that class, and Instrument Sans on the wrapper. The Para tabs sit outside that
 * wrapper, so they had been setting their own sizes in inline styles and drifting — "Activity"
 * was Geist 24px while "Explore baskets" was Instrument Sans at clamp(22px, 2.2vw, 26px) with
 * −0.02em tracking. Close enough to look like a mistake rather than a choice.
 *
 * This carries the font variable with it, so the same heading reads the same anywhere.
 */
import type { ElementType, ReactNode } from "react";

import { instrumentSans } from "../darwin/shell";
import s from "./SectionHeading.module.css";

export function SectionHeading({
  children,
  as: Tag = "h2" as ElementType,
}: {
  children: ReactNode;
  /** `h1` for a tab's own title, `h2` for a section inside one. Looks identical either way. */
  as?: ElementType;
}) {
  return <Tag className={`${s.heading} ${instrumentSans.variable}`}>{children}</Tag>;
}
