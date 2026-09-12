import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type FadeInProps = {
  children: ReactNode;
  /** Stagger, in seconds (0.06 ≈ one card step). Mapped to a scroll-range offset. */
  delay?: number;
  className?: string;
  /** Slide-in direction before the fade settles. */
  from?: "up" | "left" | "right" | "none";
};

// Quiet scroll-in entrance (UI guide §14), implemented as a CSS scroll-driven
// animation — see `.fade-in` in globals.css. No JS, no observers: content is
// visible at rest, anything already on screen renders settled, and browsers
// without `animation-timeline` simply skip the effect. (Replaces the Motion
// `whileInView` version, which left below-the-fold image blocks stuck hidden.)
export function FadeIn({ children, delay = 0, className, from = "up" }: FadeInProps) {
  const style = {
    "--fi-shift": `${Math.round(delay * 100)}%`,
  } as CSSProperties;

  return (
    <div className={cn("fade-in", `fade-in--${from}`, className)} style={style}>
      {children}
    </div>
  );
}
