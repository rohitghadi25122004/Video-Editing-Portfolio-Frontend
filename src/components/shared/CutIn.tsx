"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Phase = "static" | "armed" | "in";

/**
 * Media "cut-in" (DESIGN.md motion): opacity 0 to 1 and scale 0.98 to 1,
 * 420ms out-expo, once, when 30% visible. CSS does the animation
 * (globals.css `.cut-in`); this only flags state. Content is visible in the
 * server HTML and stays visible if JavaScript never runs; it is hidden
 * (armed) only when it starts below the fold, so nothing already on screen
 * flickers. Reduced motion is handled in CSS.
 */
export function CutIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (first) {
          first = false;
          if (visible) {
            io.disconnect();
            return;
          }
          setPhase("armed");
          return;
        }
        if (visible) {
          setPhase("in");
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-armed={phase === "static" ? undefined : ""}
      className={`cut-in ${phase === "in" ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
