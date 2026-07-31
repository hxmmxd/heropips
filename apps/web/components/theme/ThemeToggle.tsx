"use client";

import { useEffect, useState } from "react";
import { getTheme, setTheme, THEME_EVENT, type Theme } from "@/lib/theme";

/**
 * 44px icon button cycling dark <-> light. The visible glyph is gated by
 * html[data-theme] in CSS (sun in dark = "switch to light", moon in light),
 * so first paint never mismatches SSR. Choosing here writes an explicit
 * cookie — the user leaves "system" once they pick.
 */
export function ThemeToggle() {
  /* null until mounted: SSR can't know the applied theme. */
  const [theme, setLocal] = useState<Theme | null>(null);

  useEffect(() => {
    setLocal(getTheme());
    const onChange = (e: Event) => setLocal((e as CustomEvent<Theme>).detail);
    document.addEventListener(THEME_EVENT, onChange);
    return () => document.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const next: Theme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className="hp-theme-toggle"
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === "light"}
      onClick={() => setTheme(next)}
    >
      <svg className="hp-tt-sun" width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx={12} cy={12} r={4.2} fill="none" stroke="currentColor" strokeWidth={1.6} />
        <path
          d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"
          fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"
        />
      </svg>
      <svg className="hp-tt-moon" width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M20 13.6A8 8 0 1 1 10.4 4a6.4 6.4 0 0 0 9.6 9.6Z"
          fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
