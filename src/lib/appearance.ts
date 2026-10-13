import type { Accent, Theme } from "./settings";

/** Reads the OS preference. Kept here so "system" resolves the same way in
 *  both windows. */
export const prefersDark = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Paints the theme and accent onto <html>, where index.css reads them. */
export const applyAppearance = (theme: Theme, accent: Accent) => {
  const root = document.documentElement;
  root.dataset.theme =
    theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
  root.dataset.accent = accent;
};

/** Re-applies "system" when the OS flips, so the setting stays honest. */
export const watchSystemTheme = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
