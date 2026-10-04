"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={`btn-icon ${className}`}
      aria-label={`Switch to ${next} theme`}
      onClick={() => applyTheme(next)}
    >
      {theme === "dark" ? <SunIcon size={18} weight="bold" aria-hidden /> : <MoonIcon size={18} weight="bold" aria-hidden />}
    </button>
  );
}
