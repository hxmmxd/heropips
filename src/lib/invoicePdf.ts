import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface InvoiceConfig {
  company_name: string;
  company_tagline: string;
  company_address: string;
  company_city: string;
  company_country: string;
  company_email: string;
  company_website: string;
  company_phone: string;
  primary_color: string;
  accent_color: string;
  header_bg_color: string;
  invoice_prefix: string;
  currency_symbol: string;
  currency_code: string;
  tax_label: string;
  tax_rate: number;
  show_tax_line: boolean;
  footer_note: string;
  support_email: string;
  terms_url: string;
  show_watermark: boolean;
  watermark_text: string;
}

export const defaultInvoiceConfig: InvoiceConfig = {
  company_name: 'TradeGPT',
  company_tagline: 'Institutional AI Signal Platform',
  company_address: '1 Financial District',
  company_city: 'Dubai, UAE',
  company_country: 'United Arab Emirates',
  company_email: 'billing@tradegpt.ai',
  company_website: 'tradegpt.ai',
  company_phone: '+971 XX XXX XXXX',
  primary_color: '#4f46e5',
  accent_color: '#7c3aed',
  header_bg_color: '#0d1117',
  invoice_prefix: 'TG',
  currency_symbol: '$',
  currency_code: 'USD',
  tax_label: 'VAT (0%)',
  tax_rate: 0,
  show_tax_line: false,
  footer_note:
    'Subscription activations occur automatically upon successful blockchain confirmation. All fees are non-refundable after plan activation.',
  support_email: 'support@tradegpt.ai',
  terms_url: 'tradegpt.ai/terms',
  show_watermark: true,
  watermark_text: 'PAID',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function hex(h: string): [number, number, number] {
  const c = h.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

function shortId(id: string, prefix: string) {
  return `${prefix}-${id.slice(-8).toUpperCase()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dueDate(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// Main generator — Google-style minimalist layout
// ─────────────────────────────────────────────────────────────

export async function generateInvoicePdf(
  invoice: {
    payment_id: string;
    plan_id: string;
    price_amount: number;
    pay_amount: number;
    pay_currency: string;
    status: string;
    created_at: string;
    user_email?: string;
    user_name?: string;
  },
  config: InvoiceConfig = defaultInvoiceConfig
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const PW = 595.28; // pt page width
  const PH = 841.89; // pt page height
  const ML = 52;     // left margin
  const MR = PW - ML; // right margin x
  const CW = PW - ML * 2; // content width

  // ── Palette ──────────────────────────────────────────────
  const brand = hex(config.primary_color);
  const ink: [number, number, number] = [22, 27, 34];       // near-black body text
  const inkMid: [number, number, number] = [88, 96, 111];   // medium grey labels
  const inkLight: [number, number, number] = [152, 162, 179]; // faint grey
  const rowAlt: [number, number, number] = [248, 249, 251]; // alternate row tint
  const white: [number, number, number] = [255, 255, 255];
  const ruleLine: [number, number, number] = [218, 222, 230];

  const isCompleted = invoice.status === 'completed' || invoice.status === 'finished';
  const isPending = invoice.status === 'waiting' || invoice.status === 'confirming';
  const statusColor: [number, number, number] = isCompleted
    ? [22, 163, 74]
    : isPending
    ? [161, 98, 7]
    : [185, 28, 28];

  const taxAmt = config.show_tax_line ? (invoice.price_amount * config.tax_rate) / 100 : 0;
  const total = invoice.price_amount + taxAmt;

  // ─────────────────────────────────────────────────────────
  // 0. White background (default)
  // ─────────────────────────────────────────────────────────
  doc.setFillColor(...white);
  doc.rect(0, 0, PW, PH, 'F');

  // ─────────────────────────────────────────────────────────
  // 1. Watermark — diagonal, very faint, drawn first
  // ─────────────────────────────────────────────────────────
  if (config.show_watermark && isCompleted) {
    const gs = doc.GState({ opacity: 0.045 });
    doc.setGState(gs);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(110);
    doc.setTextColor(...brand);
    doc.text(config.watermark_text.toUpperCase(), PW / 2, PH / 2 + 40, {
      align: 'center',
      angle: 42,
    });
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  // ─────────────────────────────────────────────────────────
  // 2. Brand accent line — 3 pt at very top
  // ─────────────────────────────────────────────────────────
  doc.setFillColor(...brand);
  doc.rect(0, 0, PW, 3, 'F');

  // ─────────────────────────────────────────────────────────
  // 3. Header — Company name (left) + INVOICE (right)
  // ─────────────────────────────────────────────────────────
  let y = 52;

  // Company name — large, bold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...ink);
  doc.text(config.company_name, ML, y);

  // "INVOICE" — right aligned, same line, slightly lighter
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...brand);
  doc.text('INVOICE', MR, y, { align: 'right' });

  y += 16;
  // Tagline under company name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...inkLight);
  doc.text(config.company_tagline, ML, y);

  // Invoice number under INVOICE label
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...inkMid);
  doc.text(shortId(invoice.payment_id, config.invoice_prefix), MR, y, { align: 'right' });

  // ─────────────────────────────────────────────────────────
  // 4. Hairline separator
  // ─────────────────────────────────────────────────────────
  y += 22;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.75);
  doc.line(ML, y, MR, y);

  // ─────────────────────────────────────────────────────────
  // 5. Bill From / Bill To / Invoice Meta (3-column row)
  // ─────────────────────────────────────────────────────────
  y += 22;
  const col1 = ML;
  const col2 = ML + CW * 0.38;
  const col3 = ML + CW * 0.66;

  // Section labels
  const sectionLabel = (label: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...brand);
    doc.text(label.toUpperCase(), x, yy);
  };

  sectionLabel('From', col1, y);
  sectionLabel('Bill To', col2, y);
  sectionLabel('Invoice Details', col3, y);

  y += 13;

  // From — company block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(config.company_name, col1, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...inkMid);
  const fromLines = [
    config.company_address,
    config.company_city,
    config.company_country,
    config.company_email,
    config.company_phone,
  ];
  fromLines.forEach((line, i) => {
    doc.text(line, col1, y + 13 + i * 12);
  });

  // Bill To — user block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(invoice.user_name || 'Account Holder', col2, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...inkMid);
  doc.text(invoice.user_email || 'TradeGPT Subscriber', col2, y + 13);
  doc.text('Subscription Customer', col2, y + 25);

  // Invoice Meta block
  const metaRow = (label: string, value: string, x: number, yy: number, valueColor?: [number, number, number]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...inkLight);
    doc.text(label, x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(valueColor || ink));
    doc.text(value, x, yy + 11);
  };

  metaRow('Invoice Date', fmtDate(invoice.created_at), col3, y);
  metaRow('Due Date', dueDate(invoice.created_at), col3 + 72, y);
  metaRow('Payment Method', 'Cryptocurrency', col3, y + 32);
  metaRow('Currency', `${config.currency_code}`, col3 + 72, y + 32);

  // Status pill — drawn as filled rect with text
  const statusY = y + 64;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...inkLight);
  doc.text('Status', col3, statusY);

  const pillLabel = isCompleted ? 'PAID' : isPending ? 'PENDING' : invoice.status.toUpperCase();
  const pillW = 52;
  const pillH = 16;
  doc.setFillColor(...statusColor);
  doc.roundedRect(col3, statusY + 4, pillW, pillH, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...white);
  doc.text(pillLabel, col3 + pillW / 2, statusY + 13.5, { align: 'center' });

  // ─────────────────────────────────────────────────────────
  // 6. Separator
  // ─────────────────────────────────────────────────────────
  y += 112;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.75);
  doc.line(ML, y, MR, y);

  // ─────────────────────────────────────────────────────────
  // 7. Line items table header
  // ─────────────────────────────────────────────────────────
  y += 20;
  const tDescX = ML;
  const tQtyX = ML + CW * 0.62;
  const tUnitX = ML + CW * 0.76;
  const tTotalX = MR;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...inkLight);
  doc.text('DESCRIPTION', tDescX, y);
  doc.text('QTY', tQtyX, y, { align: 'center' });
  doc.text('UNIT PRICE', tUnitX, y, { align: 'right' });
  doc.text('AMOUNT', tTotalX, y, { align: 'right' });

  // thin underline
  y += 6;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.5);
  doc.line(ML, y, MR, y);

  // ─────────────────────────────────────────────────────────
  // Row 1 — Plan subscription
  // ─────────────────────────────────────────────────────────
  y += 16;
  const r1H = 38;
  doc.setFillColor(...rowAlt);
  doc.rect(ML - 4, y - 10, CW + 8, r1H, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(
    `${config.company_name} ${invoice.plan_id.charAt(0).toUpperCase() + invoice.plan_id.slice(1)} Plan`,
    tDescX,
    y
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...inkMid);
  doc.text('Monthly subscription — AI signals, analytics, and institutional tools', tDescX, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...inkMid);
  doc.text('1', tQtyX, y + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `${config.currency_symbol}${invoice.price_amount.toFixed(2)}`,
    tUnitX, y + 2, { align: 'right' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(
    `${config.currency_symbol}${invoice.price_amount.toFixed(2)}`,
    tTotalX, y + 2, { align: 'right' }
  );

  // ─────────────────────────────────────────────────────────
  // Row 2 — Crypto settlement note
  // ─────────────────────────────────────────────────────────
  y += r1H + 6;
  const r2H = 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...ink);
  doc.text('Cryptocurrency Settlement', tDescX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...inkMid);
  doc.text(
    `${invoice.pay_amount} ${invoice.pay_currency.toUpperCase()} — via NOWPayments Gateway`,
    tDescX,
    y + 12
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...inkMid);
  doc.text(
    `${invoice.pay_amount} ${invoice.pay_currency.toUpperCase()}`,
    tTotalX, y, { align: 'right' }
  );

  // ─────────────────────────────────────────────────────────
  // 8. Table bottom rule
  // ─────────────────────────────────────────────────────────
  y += r2H + 4;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.75);
  doc.line(ML, y, MR, y);

  // ─────────────────────────────────────────────────────────
  // 9. Totals — right-aligned block
  // ─────────────────────────────────────────────────────────
  y += 18;
  const totLabelX = MR - 156;
  const totValueX = MR;

  const drawTotRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9.5);
    doc.setTextColor(...inkMid);
    doc.text(label, totLabelX, y);
    doc.setTextColor(...(color || (bold ? ink : inkMid)));
    doc.text(value, totValueX, y, { align: 'right' });
    y += bold ? 14 : 13;
  };

  drawTotRow('Subtotal', `${config.currency_symbol}${invoice.price_amount.toFixed(2)}`);
  if (config.show_tax_line) {
    drawTotRow(config.tax_label, `${config.currency_symbol}${taxAmt.toFixed(2)}`);
  }
  drawTotRow('Processing fee', `${config.currency_symbol}0.00`);

  // Divider above total
  y += 4;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.75);
  doc.line(totLabelX - 8, y, MR, y);
  y += 14;

  // Grand total row — larger, brand color
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...inkMid);
  doc.text('Total due', totLabelX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...brand);
  doc.text(`${config.currency_symbol}${total.toFixed(2)} ${config.currency_code}`, totValueX, y, { align: 'right' });

  // ─────────────────────────────────────────────────────────
  // 10. Payment reference / Transaction block
  // ─────────────────────────────────────────────────────────
  y += 28;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.75);
  doc.line(ML, y, MR, y);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...brand);
  doc.text('PAYMENT REFERENCE', ML, y);

  y += 11;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...ink);
  doc.text(invoice.payment_id, ML, y);

  // Right side — Gateway info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...brand);
  doc.text('PAYMENT GATEWAY', MR - 160, y - 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...inkMid);
  doc.text('NOWPayments — Crypto Settlement', MR - 160, y);

  // ─────────────────────────────────────────────────────────
  // 11. Notes section
  // ─────────────────────────────────────────────────────────
  y += 22;
  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.5);
  doc.line(ML, y, MR, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...brand);
  doc.text('NOTES & TERMS', ML, y);

  y += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...inkMid);
  const noteLines = doc.splitTextToSize(config.footer_note, CW);
  doc.text(noteLines, ML, y);

  // ─────────────────────────────────────────────────────────
  // 12. Footer — bottom of page
  // ─────────────────────────────────────────────────────────
  const footerY = PH - 40;

  doc.setDrawColor(...ruleLine);
  doc.setLineWidth(0.5);
  doc.line(ML, footerY - 14, MR, footerY - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...inkLight);
  doc.text(config.company_name, ML, footerY);
  doc.text(`${config.support_email}`, PW / 2, footerY, { align: 'center' });
  doc.text(`${config.terms_url}`, MR, footerY, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setTextColor(190, 195, 205);
  doc.text(
    `This is a computer-generated document. No signature required. · Page 1 of 1 · Generated ${new Date().toLocaleString()}`,
    PW / 2,
    footerY + 12,
    { align: 'center' }
  );

  // ─────────────────────────────────────────────────────────
  // 13. Save
  // ─────────────────────────────────────────────────────────
  doc.save(`${shortId(invoice.payment_id, config.invoice_prefix)}.pdf`);
}
