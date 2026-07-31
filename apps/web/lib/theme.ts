"use client";

/** Theme persistence + application. Cookie `hp_theme` is read server-side in app/layout.tsx. */

export type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

const COOKIE = "hp_theme";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** theme-color meta values — must match --bg-app in tokens.css per theme. */
const META_COLOR: Record<Theme, string> = { dark: "#07080C", light: "#F5F6F1" };

/** Fired on document whenever the applied theme changes. detail = resolved Theme. */
export const THEME_EVENT = "hp:theme";

/** Stored preference: explicit cookie value, else "system". */
export function getThemePreference(): ThemePreference {
  const m = document.cookie.match(/(?:^|; )hp_theme=(dark|light|system)(?:;|$)/);
  return (m?.[1] as ThemePreference | undefined) ?? "system";
}

/** Currently applied theme (html[data-theme]); falls back to dark. */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Persists the preference (cookie, 1y), applies the resolved theme to
 * html[data-theme], syncs the theme-color meta, and dispatches THEME_EVENT.
 */
export function setTheme(pref: ThemePreference): void {
  document.cookie = `${COOKIE}=${pref}; path=/; max-age=${MAX_AGE}; samesite=lax`;
  const resolved: Theme =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
      : pref;
  document.documentElement.dataset.theme = resolved;
  // Collapse any media-gated pair (system mode) into ONE meta for the explicit choice.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m, i) => { if (i > 0) m.remove(); });
  let meta = metas[0];
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.removeAttribute("media");
  meta.content = META_COLOR[resolved];
  document.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: resolved }));
}
