import * as React from "react";
import { CopyButton } from "./CopyButton";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heropips.com";

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 18px",
  background: "var(--surface-3)",
  color: "var(--text-hi)",
  border: "1px solid var(--border-2)",
  borderRadius: "var(--r-full)",
  fontFamily: "var(--font-display)",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--weight-semibold)",
};

/** Prebuilt share intents for a referral code. Works in server and client trees. */
export function ShareRow({ code }: { code: string }) {
  const refUrl = `${SITE}/early-access?ref=${encodeURIComponent(code)}`;
  const text = "I'm in the HeroPips early access line — rule-based trading automation with prop-firm-grade risk guards. Join behind me:";
  const targets = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(refUrl)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(refUrl)}&text=${encodeURIComponent(text)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${refUrl}`)}` },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-2)", alignItems: "center" }}>
      {targets.map((t) => (
        <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {t.label}
        </a>
      ))}
      <CopyButton text={refUrl} label="Copy link" />
    </div>
  );
}
