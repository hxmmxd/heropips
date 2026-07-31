"use client";

import { useEffect, useState } from "react";
import { getThemePreference, setTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/** 3-option segmented control (System / Dark / Light) for /app/settings. */
export function ThemePicker() {
  /* null until mounted: the cookie is unreadable during SSR of this client tree. */
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPref(getThemePreference());
  }, []);

  return (
    <div className="hp-theme-picker" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((opt) => {
        const active = pref === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`hp-tp-opt${active ? " is-active" : ""}`}
            onClick={() => {
              setTheme(opt.value);
              setPref(opt.value);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
