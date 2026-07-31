"use client";

import * as React from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 44,
        padding: "0 16px",
        background: copied ? "var(--volt-tint)" : "var(--surface-3)",
        color: copied ? "var(--volt-400)" : "var(--text-hi)",
        border: "1px solid var(--border-2)",
        borderRadius: "var(--r-full)",
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-semibold)",
        cursor: "pointer",
        transition: "background var(--dur-fast), color var(--dur-fast)",
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
