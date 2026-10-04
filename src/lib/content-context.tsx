"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { items as builtInItems, parseItems, type PortfolioItem } from "./content";

type ContentState = {
  items: PortfolioItem[];
  /** False until the backend answered, failed or timed out (or no backend is set). */
  settled: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
/** Past this the page stops waiting (the globe mounts); a late answer still updates the list. */
const SETTLE_MS = 2500;

const ContentContext = createContext<ContentState>({ items: builtInItems, settled: true });

/**
 * The work list. The static build renders content/vasant.json; on page open
 * the browser asks the backend (NEXT_PUBLIC_API_URL) for the current list,
 * so videos added in the admin panel appear without a rebuild. If the
 * backend is unset, down or not seeded yet, the built-in list stays.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentState>({ items: builtInItems, settled: !API_URL });

  useEffect(() => {
    if (!API_URL) return;
    const controller = new AbortController();
    const settle = () => setState((s) => (s.settled ? s : { ...s, settled: true }));
    const timer = window.setTimeout(settle, SETTLE_MS);

    fetch(`${API_URL}/api/content`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: unknown } | null) => {
        const next = parseItems(data?.items);
        setState((s) => ({ items: next ?? s.items, settled: true }));
      })
      .catch(() => {
        if (!controller.signal.aborted) settle();
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return <ContentContext value={state}>{children}</ContentContext>;
}

export function useContent() {
  return useContext(ContentContext);
}

export function useItems() {
  return useContext(ContentContext).items;
}
