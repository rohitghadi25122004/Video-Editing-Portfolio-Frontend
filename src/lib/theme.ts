export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "vg-theme";

/**
 * Runs before first paint (inlined in <head>) so the stored theme is
 * applied without a flash. Light is the default; dark only when the visitor
 * picked it with the toggle. Kept dependency-free on purpose.
 */
export const themeInitScript = `(function(){document.documentElement.classList.add("js");try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="dark"){t="light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

export function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

const THEME_COLORS: Record<Theme, string> = { light: "#f4f4f1", dark: "#121316" };

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = THEME_COLORS[theme];
  });
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
}
