import type { CSSProperties, ReactNode } from "react";

/**
 * Hero entrance for one copy item: rises 16px and fades in, staggered by
 * index. Pure CSS (globals.css `.hero-rise`), so it starts at first paint
 * without waiting for JavaScript and is skipped under reduced motion.
 */
export function Rise({
  index,
  children,
  className = "",
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hero-rise ${className}`} style={{ "--i": index } as CSSProperties}>
      {children}
    </div>
  );
}

/**
 * The chartreuse field settles from 0.98 to 1. Transform only: the LCP poster
 * inside it is never hidden or faded.
 */
export function FieldReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hero-field-reveal ${className}`}>{children}</div>;
}
