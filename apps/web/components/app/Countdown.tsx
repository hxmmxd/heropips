"use client";

import * as React from "react";

function remaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ticking time-to-expiry. SSR renders the initial value; client keeps it live. */
export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [text, setText] = React.useState(() => remaining(expiresAt));
  React.useEffect(() => {
    const id = setInterval(() => setText(remaining(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  // role="timer", not a bare labelled span: `aria-label` is prohibited on a
  // role-less element, and this readout ticks every second — timer is the role
  // that says so without announcing each tick.
  return (
    <span className="ap-note num" role="timer" aria-label="Time to expiry">
      {text === "expired" ? "expired" : `expires in ${text}`}
    </span>
  );
}
