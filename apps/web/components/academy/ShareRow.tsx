"use client";

/* =========================================================================
 * ShareRow — share intents for lessons, certificates and referral links.
 * Native share sheet when the browser offers one, plus X / Telegram /
 * WhatsApp / LinkedIn intents and a copy-link button with a 2s "Copied"
 * state. Icons: inline 16px strokes, consistent with app/icons.tsx.
 * ======================================================================= */

import * as React from "react";

const COPIED_MS = 2000;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...stroke}>
      {children}
    </svg>
  );
}

export function ShareRow({ url, text, label }: { url: string; text: string; label?: string }) {
  const [canNative, setCanNative] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copyTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const intents: { name: string; href: string; icon: React.ReactNode }[] = [
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      icon: <Icon><path d="M5 5l14 14M19 5 5 19" /></Icon>,
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      icon: <Icon><path d="m21 4-18 7 5 2 2 6 3-4 5 4 3-15Z" /></Icon>,
    },
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      icon: (
        <Icon>
          <path d="M20 12a8 8 0 1 0-3.1 6.3L20 19.5l-.9-3A8 8 0 0 0 20 12Z" />
          <path d="M9 10c.5 2.5 2.5 4.5 5 5l1.2-1.5" />
        </Icon>
      ),
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <Icon>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8.5 11v5M8.5 8.2v.1M12.5 16v-3a2 2 0 0 1 4 0v3" />
        </Icon>
      ),
    },
  ];

  return (
    <div className="ac-share">
      {label ? <span>{label}</span> : null}
      {canNative ? (
        <button
          type="button"
          className="ac-share-btn"
          onClick={() => {
            void navigator.share({ title: text, text, url }).catch(() => {
              /* user dismissed the sheet — nothing to do */
            });
          }}
        >
          <Icon>
            <path d="M12 3v12M8.5 6.5 12 3l3.5 3.5" />
            <path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7" />
          </Icon>
          Share
        </button>
      ) : null}
      {intents.map((intent) => (
        <a key={intent.name} className="ac-share-btn" href={intent.href} target="_blank" rel="noopener">
          {intent.icon}
          {intent.name}
        </a>
      ))}
      <button
        type="button"
        className="ac-share-btn"
        onClick={() => {
          void navigator.clipboard
            .writeText(url)
            .then(() => {
              setCopied(true);
              if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
              copyTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
            })
            .catch(() => {
              /* clipboard blocked — leave the label unchanged */
            });
        }}
      >
        {copied ? (
          <Icon><path d="m5 13 4 4L19 7" /></Icon>
        ) : (
          <Icon>
            <rect x="9" y="9" width="10" height="10" rx="2" />
            <path d="M15 5H7a2 2 0 0 0-2 2v8" />
          </Icon>
        )}
        <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
