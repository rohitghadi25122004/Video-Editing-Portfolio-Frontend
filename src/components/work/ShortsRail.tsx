"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Phones: the vertical shorts as a scroll-snap row. The native scrollbar is
 * hidden (phone browsers ignore scrollbar styling) and replaced by a slim
 * chartreuse progress bar that tracks the row, updated through refs on the
 * row's own scroll events (not the window's), never React state. The row is a named region and
 * joins the tab order only while it overflows, so keyboard users can scroll
 * it with the arrow keys.
 */
export function ShortsRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const bar = barRef.current;
    const thumb = thumbRef.current;
    if (!el || !bar || !thumb) return;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const overflow = el.scrollWidth > el.clientWidth + 1;
      if (overflow) el.setAttribute("tabindex", "0");
      else el.removeAttribute("tabindex");
      bar.style.visibility = overflow ? "visible" : "hidden";
      if (!overflow) return;
      const visible = el.clientWidth / el.scrollWidth;
      const max = el.scrollWidth - el.clientWidth;
      const progress = max > 0 ? el.scrollLeft / max : 0;
      thumb.style.width = `${visible * 100}%`;
      thumb.style.transform = `translateX(${progress * ((1 - visible) / visible) * 100}%)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // Scroll events already arrive at most once per frame: paint directly.
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    el.addEventListener("scroll", paint, { passive: true });
    paint();
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", paint);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div>
      <div
        ref={ref}
        role="region"
        aria-label="Short videos"
        className="scroll-rail -mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain px-4 pt-2 pb-4 focus-visible:outline-offset-[-2px]"
      >
        <ul role="list" className="flex gap-4">
          {children}
        </ul>
      </div>
      <div ref={barRef} aria-hidden="true" className="relative h-1 overflow-hidden rounded-pill bg-line">
        <div ref={thumbRef} className="absolute inset-y-0 left-0 w-1/3 rounded-pill bg-field" />
      </div>
    </div>
  );
}
