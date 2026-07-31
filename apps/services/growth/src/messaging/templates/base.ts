/* =========================================================================
 * Email rendering engine — HeroPips ink/volt identity as bulletproof HTML.
 *
 * Constraints email clients impose (and this renderer respects):
 *   - tables + inline styles only; no flex/grid, no external CSS
 *   - explicit bgcolor attributes so Outlook/Gmail dark themes behave
 *   - padding-based CTA buttons (render everywhere, incl. Outlook)
 *   - a hidden preheader, and a plain-text alternate built from the same
 *     blocks so text/plain is never an afterthought
 * ======================================================================= */

/* ---------- palette (mirrors packages/ui/tokens.css, hardcoded on purpose:
 * emails cannot reference CSS custom properties) ---------- */
export const INK = {
  bg: "#07080C", // ink-950
  card: "#0B0D13", // ink-900
  well: "#10131B", // ink-850
  line: "#171B25", // ink-800
  textHi: "#F3F5FA",
  textMid: "#9BA4B8",
  textLow: "#7A849C",
  volt: "#C6FF2E",
  voltSoft: "#D3FF57",
  onVolt: "#0D0F07",
} as const;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

/* ---------- block model ---------- */
export type Block =
  | { kind: "kicker"; text: string }
  | { kind: "h1"; text: string }
  | { kind: "p"; text: string }
  | { kind: "button"; label: string; url: string }
  | { kind: "linkline"; label: string; url: string }
  | { kind: "stats"; rows: ReadonlyArray<{ label: string; value: string }> }
  | { kind: "code"; value: string; caption?: string }
  | { kind: "list"; items: readonly string[] }
  | { kind: "progress"; label: string; done: number; total: number }
  | { kind: "divider" }
  | { kind: "note"; text: string };

export type RenderInput = {
  subject: string;
  preheader: string;
  blocks: readonly Block[];
  /** Footer line explaining why this email arrived (CAN-SPAM/GDPR courtesy). */
  reason: string;
  /** Absent for transactional mail — no unsubscribe link is rendered. */
  unsubscribeUrl?: string;
  /** 1×1 tracking pixel URL; omitted when open tracking is off. */
  openPixelUrl?: string;
  /** Wraps CTA/link URLs through the click-tracking redirect. */
  wrapLink?: (url: string) => string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- HTML fragments ---------- */

function button(label: string, url: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>
<td bgcolor="${INK.volt}" style="border-radius:10px;mso-padding-alt:14px 32px;">
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;letter-spacing:.02em;color:${INK.onVolt};text-decoration:none;border-radius:10px;">${esc(label)}</a>
</td></tr></table>`;
}

function stats(rows: ReadonlyArray<{ label: string; value: string }>): string {
  const tr = rows
    .map(
      (r) => `<tr>
<td style="padding:10px 16px;border-top:1px solid ${INK.line};font-family:${FONT};font-size:13px;color:${INK.textLow};">${esc(r.label)}</td>
<td align="right" style="padding:10px 16px;border-top:1px solid ${INK.line};font-family:${MONO};font-size:14px;font-weight:600;color:${INK.textHi};white-space:nowrap;">${esc(r.value)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${INK.well}" style="border-radius:12px;border:1px solid ${INK.line};margin:20px 0;"><tr><td colspan="2" style="height:2px;line-height:2px;font-size:2px;">&nbsp;</td></tr>${tr}</table>`;
}

function codeBlock(value: string, caption?: string): string {
  // Short values are codes people retype (a 6-digit OTP, a referral code) and
  // deserve display size; long ones are ids that would wrap on a phone.
  const size = value.length <= 10 ? 32 : 20;
  const cap = caption
    ? `<div style="font-family:${FONT};font-size:12px;color:${INK.textLow};padding-top:10px;">${esc(caption)}</div>`
    : "";
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr>
<td align="center" bgcolor="${INK.well}" style="border:1px dashed ${INK.volt};border-radius:12px;padding:18px 16px;">
<div style="font-family:${MONO};font-size:${size}px;font-weight:600;letter-spacing:.14em;color:${INK.volt};">${esc(value)}</div>${cap}
</td></tr></table>`;
}

function progress(label: string, done: number, total: number): string {
  const safeTotal = Math.max(1, total);
  const pct = Math.max(0, Math.min(100, Math.round((done / safeTotal) * 100)));
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;">
<tr><td style="font-family:${FONT};font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${INK.textLow};padding-bottom:8px;">${esc(label)} — ${done}/${total}</td></tr>
<tr><td bgcolor="${INK.line}" style="border-radius:6px;font-size:0;line-height:0;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${pct}%"><tr><td bgcolor="${INK.volt}" height="8" style="border-radius:6px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr></table>`;
}

function renderBlock(b: Block, wrap: (u: string) => string): string {
  switch (b.kind) {
    case "kicker":
      return `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${INK.volt};padding:0 0 12px;">${esc(b.text)}</div>`;
    case "h1":
      return `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:700;color:${INK.textHi};">${esc(b.text)}</h1>`;
    case "p":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK.textMid};">${esc(b.text)}</p>`;
    case "button":
      return button(b.label, wrap(b.url));
    case "linkline":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:1.6;"><a href="${esc(wrap(b.url))}" target="_blank" style="color:${INK.voltSoft};text-decoration:underline;">${esc(b.label)}</a></p>`;
    case "stats":
      return stats(b.rows);
    case "code":
      return codeBlock(b.value, b.caption);
    case "list":
      return b.items
        .map(
          (it) => `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 10px;"><tr>
<td valign="top" style="font-family:${MONO};font-size:14px;color:${INK.volt};padding-right:10px;line-height:1.6;">&#8594;</td>
<td style="font-family:${FONT};font-size:15px;line-height:1.6;color:${INK.textMid};">${esc(it)}</td>
</tr></table>`,
        )
        .join("");
    case "progress":
      return progress(b.label, b.done, b.total);
    case "divider":
      return `<div style="border-top:1px solid ${INK.line};margin:24px 0;font-size:0;line-height:0;">&nbsp;</div>`;
    case "note":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${INK.textLow};">${esc(b.text)}</p>`;
  }
}

/* ---------- plain-text alternate ---------- */
function blockText(b: Block): string {
  switch (b.kind) {
    case "kicker":
      return b.text.toUpperCase();
    case "h1":
      return `${b.text}\n${"=".repeat(Math.min(b.text.length, 60))}`;
    case "p":
    case "note":
      return b.text;
    case "button":
    case "linkline":
      return `${b.label}:\n${b.url}`;
    case "stats":
      return b.rows.map((r) => `  ${r.label}: ${r.value}`).join("\n");
    case "code":
      return `  ${b.value}${b.caption ? `\n  (${b.caption})` : ""}`;
    case "list":
      return b.items.map((i) => `  - ${i}`).join("\n");
    case "progress":
      return `${b.label}: ${b.done}/${b.total}`;
    case "divider":
      return "----";
  }
}

const WORDMARK = `<span style="font-family:${FONT};font-size:18px;font-weight:700;letter-spacing:.04em;color:${INK.textHi};">HERO<span style="color:${INK.volt};">PIPS</span></span>`;

export function renderEmail(input: RenderInput): RenderedEmail {
  const wrap = input.wrapLink ?? ((u: string): string => u);
  const body = input.blocks.map((b) => renderBlock(b, wrap)).join("");
  const unsub = input.unsubscribeUrl
    ? ` &nbsp;&middot;&nbsp; <a href="${esc(input.unsubscribeUrl)}" target="_blank" style="color:${INK.textLow};text-decoration:underline;">Unsubscribe</a>`
    : "";
  const pixel = input.openPixelUrl
    ? `<img src="${esc(input.openPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;" />`
    : "";

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${esc(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${INK.bg};" bgcolor="${INK.bg}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(input.preheader)}${"&nbsp;&zwnj;".repeat(30)}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${INK.bg}">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
<tr><td style="padding:0 8px 20px;">${WORDMARK}</td></tr>
<tr><td bgcolor="${INK.card}" style="border:1px solid ${INK.line};border-radius:16px;padding:36px 32px;">
${body}
</td></tr>
<tr><td style="padding:24px 8px 0;">
<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.6;color:${INK.textLow};">${esc(input.reason)}</p>
<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.6;color:${INK.textLow};">HeroPips — decision intelligence. Your broker. On rails. Trading involves substantial risk of loss; nothing here is financial advice.</p>
<p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${INK.textLow};">&copy; ${new Date().getUTCFullYear()} HeroPips${unsub}</p>
</td></tr>
</table>
${pixel}
</td></tr>
</table>
</body>
</html>`;

  const text = [
    ...input.blocks.map(blockText),
    "----",
    input.reason,
    "Trading involves substantial risk of loss; nothing here is financial advice.",
    ...(input.unsubscribeUrl ? [`Unsubscribe: ${input.unsubscribeUrl}`] : []),
  ].join("\n\n");

  return { subject: input.subject, html, text };
}
