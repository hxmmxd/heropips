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
  // Branding
  primary_color: string;          // hex e.g. '#6366f1'
  accent_color: string;           // hex e.g. '#8b5cf6'
  header_bg_color: string;        // hex e.g. '#111827'
  // Invoice settings
  invoice_prefix: string;         // e.g. 'INV'
  currency_symbol: string;        // e.g. '$'
  currency_code: string;          // e.g. 'USD'
  tax_label: string;              // e.g. 'VAT (0%)'
  tax_rate: number;               // 0–100
  show_tax_line: boolean;
  // Footer
  footer_note: string;
  support_email: string;
  terms_url: string;
  // Watermark
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
  primary_color: '#6366f1',
  accent_color: '#8b5cf6',
  header_bg_color: '#0d1117',
  invoice_prefix: 'TG',
  currency_symbol: '$',
  currency_code: 'USD',
  tax_label: 'VAT (0%)',
  tax_rate: 0,
  show_tax_line: false,
  footer_note: 'Subscription activations occur automatically upon successful blockchain confirmation. All fees are non-refundable after plan activation.',
  support_email: 'support@tradegpt.ai',
  terms_url: 'tradegpt.ai/terms',
  show_watermark: true,
  watermark_text: 'PAID',
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function formatInvoiceId(paymentId: string, prefix: string): string {
  const short = paymentId.toString().slice(-8).toUpperCase();
  return `${prefix}-${short}`;
}

// Draw a rounded rect (jsPDF doesn't do rounded natively — we simulate)
function roundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: 'F' | 'D' | 'FD') {
  doc.roundedRect(x, y, w, h, r, r, style);
}

// ─────────────────────────────────────────────────────────────
// Main Generator
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; // page width mm
  const M = 18;  // margin
  const right = W - M;

  // ── Color palette from config ──
  const primary = hexToRgb(config.primary_color);
  const accent = hexToRgb(config.accent_color);
  const headerBg = hexToRgb(config.header_bg_color);
  const dark: [number, number, number] = [13, 17, 23];
  const mid: [number, number, number] = [55, 65, 81];
  const light: [number, number, number] = [248, 250, 252];
  const border: [number, number, number] = [226, 232, 240];
  const white: [number, number, number] = [255, 255, 255];

  const isCompleted = invoice.status === 'completed' || invoice.status === 'finished';
  const statusColor: [number, number, number] = isCompleted ? [16, 185, 129] : invoice.status === 'expired' ? [239, 68, 68] : [245, 158, 11];
  const taxAmount = config.show_tax_line ? (invoice.price_amount * config.tax_rate) / 100 : 0;
  const total = invoice.price_amount + taxAmount;
  const invoiceDate = new Date(invoice.created_at);
  const dueDateStr = new Date(invoiceDate.getTime() + 7 * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // ─────────────────────────────────────────────────────
  // 0. Watermark (drawn first, behind everything)
  // ─────────────────────────────────────────────────────
  if (config.show_watermark && isCompleted) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(72);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    const gState = doc.GState({ opacity: 0.05 });
    doc.setGState(gState);
    doc.text(config.watermark_text, W / 2, 148, { align: 'center', angle: 45 });
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  // ─────────────────────────────────────────────────────
  // 1. Header stripe
  // ─────────────────────────────────────────────────────
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, 0, W, 52, 'F');

  // Decorative accent bar (3px left edge)
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 3, 52, 'F');

  // Subtle gradient line at bottom of header
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.6);
  doc.line(0, 52, W, 52);

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(white[0], white[1], white[2]);
  doc.text(config.company_name, M + 4, 22);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 163, 190);
  doc.text(config.company_tagline, M + 4, 30);

  // Website
  doc.setFontSize(8);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text(config.company_website, M + 4, 38);

  // "INVOICE" label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', right, 26, { align: 'right' });

  // Invoice number (small) below INVOICE label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 163, 190);
  doc.text(formatInvoiceId(invoice.payment_id, config.invoice_prefix), right, 35, { align: 'right' });

  // ─────────────────────────────────────────────────────
  // 2. Meta info bar (light bg)
  // ─────────────────────────────────────────────────────
  doc.setFillColor(light[0], light[1], light[2]);
  doc.rect(0, 52, W, 36, 'F');
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.3);
  doc.line(0, 88, W, 88);

  const metaY = 68;
  const metaCols = [M + 4, 72, 125, 165];

  const metaLabels = ['Date Issued', 'Due Date', 'Payment Method', 'Status'];
  const metaValues = [
    invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    dueDateStr,
    'Cryptocurrency',
    invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
  ];

  metaLabels.forEach((label, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mid[0], mid[1], mid[2]);
    doc.text(label, metaCols[i], metaY - 8);

    if (i === 3) {
      // Status pill
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      roundedRect(doc, metaCols[i] - 1, metaY - 5, 28, 7, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(metaValues[i].toUpperCase(), metaCols[i] + 13, metaY, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.text(metaValues[i], metaCols[i], metaY);
    }
  });

  // Vertical dividers
  [68, 120, 160].forEach(x => {
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(0.2);
    doc.line(x, 55, x, 87);
  });

  // ─────────────────────────────────────────────────────
  // 3. Billed From / Billed To
  // ─────────────────────────────────────────────────────
  const billingY = 100;

  // From
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('FROM', M + 4, billingY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(config.company_name, M + 4, billingY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mid[0], mid[1], mid[2]);
  [config.company_address, config.company_city, config.company_country, config.company_email, config.company_phone].forEach((line, i) => {
    doc.text(line, M + 4, billingY + 14 + i * 5.5);
  });

  // To
  const toX = W / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('BILLED TO', toX, billingY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(invoice.user_name || 'Account Holder', toX, billingY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mid[0], mid[1], mid[2]);
  doc.text(invoice.user_email || 'TradeGPT Subscriber', toX, billingY + 14);

  // Payment Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mid[0], mid[1], mid[2]);
  doc.text('Payment Reference', toX, billingY + 24);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(invoice.payment_id, toX, billingY + 30);

  // Divider
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.3);
  doc.line(M, billingY + 40, right, billingY + 40);

  // ─────────────────────────────────────────────────────
  // 4. Line Items Table
  // ─────────────────────────────────────────────────────
  const tableY = billingY + 47;

  // Header row
  doc.setFillColor(dark[0], dark[1], dark[2]);
  doc.rect(M, tableY, right - M, 9, 'F');

  const colDesc = M + 4;
  const colQty = 115;
  const colUnit = 143;
  const colTotal = right - 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 230);
  doc.text('DESCRIPTION', colDesc, tableY + 6);
  doc.text('QTY', colQty, tableY + 6);
  doc.text('UNIT PRICE', colUnit, tableY + 6);
  doc.text('TOTAL', colTotal, tableY + 6, { align: 'right' });

  // Row 1 — Subscription line item
  const row1Y = tableY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(`${config.company_name} ${invoice.plan_id.toUpperCase()} Plan`, colDesc, row1Y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mid[0], mid[1], mid[2]);
  doc.text('Monthly subscription access — AI signals & features', colDesc, row1Y + 5.5);

  doc.setFontSize(9);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('1', colQty, row1Y);
  doc.text(`${config.currency_symbol}${invoice.price_amount.toFixed(2)}`, colUnit, row1Y);
  doc.text(`${config.currency_symbol}${invoice.price_amount.toFixed(2)}`, colTotal, row1Y, { align: 'right' });

  // Row 2 — Crypto payment breakdown
  const row2Y = row1Y + 16;
  doc.setFillColor(248, 249, 252);
  doc.rect(M, row2Y - 5, right - M, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mid[0], mid[1], mid[2]);
  doc.text('Crypto Settlement', colDesc, row2Y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Paid via ${invoice.pay_currency.toUpperCase()} — NOWPayments Gateway`, colDesc, row2Y + 5.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(`${invoice.pay_amount} ${invoice.pay_currency.toUpperCase()}`, colTotal, row2Y, { align: 'right' });

  // Row separator
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.2);
  doc.line(M, row2Y + 10, right, row2Y + 10);

  // ─────────────────────────────────────────────────────
  // 5. Totals block
  // ─────────────────────────────────────────────────────
  const totalsX = 130;
  let totalsY = row2Y + 18;

  const drawTotalRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(bold ? dark[0] : mid[0], bold ? dark[1] : mid[1], bold ? dark[2] : mid[2]);
    doc.text(label, totalsX, totalsY);
    doc.text(value, right, totalsY, { align: 'right' });
    totalsY += 7;
  };

  drawTotalRow('Subtotal', `${config.currency_symbol}${invoice.price_amount.toFixed(2)}`);
  if (config.show_tax_line) {
    drawTotalRow(config.tax_label, `${config.currency_symbol}${taxAmount.toFixed(2)}`);
  }
  drawTotalRow('Processing Fee', `${config.currency_symbol}0.00`);

  // Divider above total
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.line(totalsX, totalsY, right, totalsY);
  totalsY += 6;

  // Grand total box
  doc.setFillColor(primary[0], primary[1], primary[2]);
  roundedRect(doc, totalsX - 2, totalsY - 4, right - totalsX + 4, 12, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DUE', totalsX + 1, totalsY + 4);
  doc.text(`${config.currency_symbol}${total.toFixed(2)} ${config.currency_code}`, right - 2, totalsY + 4, { align: 'right' });

  // ─────────────────────────────────────────────────────
  // 6. Notes / Payment details panel
  // ─────────────────────────────────────────────────────
  const notesY = totalsY + 22;

  doc.setFillColor(light[0], light[1], light[2]);
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.3);
  roundedRect(doc, M, notesY, right - M, 30, 3, 'FD');

  // Left accent
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(M, notesY, 3, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Payment Notes', M + 7, notesY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mid[0], mid[1], mid[2]);
  const noteLines = doc.splitTextToSize(config.footer_note, right - M - 16);
  doc.text(noteLines, M + 7, notesY + 15);

  // ─────────────────────────────────────────────────────
  // 7. Footer
  // ─────────────────────────────────────────────────────
  const footerY = 268;
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, footerY, W, 297 - footerY, 'F');

  // Accent stripe
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, footerY, W, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 155);

  doc.text(config.company_name, M, footerY + 10);
  doc.text(`Support: ${config.support_email}`, W / 2, footerY + 10, { align: 'center' });
  doc.text(`Terms: ${config.terms_url}`, right, footerY + 10, { align: 'right' });

  doc.setDrawColor(50, 60, 80);
  doc.setLineWidth(0.2);
  doc.line(M, footerY + 15, right, footerY + 15);

  doc.setFontSize(7);
  doc.setTextColor(80, 90, 110);
  doc.text(
    `This is a computer-generated invoice and does not require a signature. Invoice ID: ${invoice.payment_id}`,
    W / 2,
    footerY + 21,
    { align: 'center' }
  );
  doc.text(`Page 1 of 1  ·  Generated ${new Date().toLocaleString()}`, W / 2, footerY + 27, { align: 'center' });

  // ─────────────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────────────
  const filename = `${config.invoice_prefix}-${invoice.payment_id.slice(-8).toUpperCase()}.pdf`;
  doc.save(filename);
}
