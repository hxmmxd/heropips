import { jsPDF } from 'jspdf';

export function generateInvoicePdf(invoice: {
  payment_id: string;
  plan_id: string;
  price_amount: number;
  pay_amount: number;
  pay_currency: string;
  status: string;
  created_at: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette
  const primaryColor = [99, 102, 241]; // Indigo
  const darkColor = [17, 24, 39]; // Gray 900
  const lightColor = [243, 244, 246]; // Gray 100
  const successColor = [16, 185, 129]; // Emerald 500
  const pendingColor = [245, 158, 11]; // Amber 500

  // 1. Header Area
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 40, 'F');

  // TradeGPT Brand Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TradeGPT', 20, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text('Institutional AI Signal Platform', 20, 28);

  // INVOICE text on right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('INVOICE', 190, 25, { align: 'right' });

  // 2. Invoice Details (Metadata)
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Billed To:', 20, 60);

  doc.setFont('helvetica', 'normal');
  doc.text('TradeGPT User Dashboard', 20, 66);
  doc.text('Account ID: Active Session', 20, 72);

  // Right-aligned Invoice metadata
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details:', 190, 60, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice ID: ${invoice.payment_id}`, 190, 66, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 190, 72, { align: 'right' });
  
  // Status Badge
  const isFinished = invoice.status === 'completed' || invoice.status === 'finished';
  const badgeColor = isFinished ? successColor : pendingColor;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.rect(150, 78, 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(invoice.status.toUpperCase(), 170, 83.5, { align: 'center' });

  // 3. Table Header
  doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
  doc.rect(20, 95, 170, 10, 'F');
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Subscription Description', 25, 101);
  doc.text('Payment Asset', 110, 101);
  doc.text('Total Price', 190, 101, { align: 'right' });

  // Table Body Row
  doc.setFont('helvetica', 'normal');
  doc.text(`TradeGPT ${invoice.plan_id.toUpperCase()} Plan Subscription`, 25, 115);
  doc.text(`${invoice.pay_amount} ${invoice.pay_currency.toUpperCase()}`, 110, 115);
  doc.text(`$${invoice.price_amount.toFixed(2)} USD`, 190, 115, { align: 'right' });

  // Draw table line divider
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.line(20, 122, 190, 122);

  // 4. Totals Block
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 140, 135);
  doc.setFont('helvetica', 'normal');
  doc.text(`$${invoice.price_amount.toFixed(2)} USD`, 190, 135, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Crypto Amount:', 140, 142);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.pay_amount} ${invoice.pay_currency.toUpperCase()}`, 190, 142, { align: 'right' });

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(130, 147, 190, 147);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Total Charged:', 140, 155);
  doc.text(`$${invoice.price_amount.toFixed(2)} USD`, 190, 155, { align: 'right' });

  // 5. Terms & Notes Footer
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(20, 200, 190, 200);

  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Payment Gateway: NOWPayments (Crypto Settlement)', 20, 210);
  doc.text('Note: Subscription activations occur automatically upon successful blockchain confirmation.', 20, 215);
  doc.text('If you have any questions or require support, please contact dashboard help support.', 20, 220);

  // Save the PDF
  doc.save(`invoice-${invoice.payment_id}.pdf`);
}
