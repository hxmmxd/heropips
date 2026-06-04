import { NextRequest, NextResponse } from 'next/server';
import { generateReportHTML } from '@/utils/reportTemplate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { accountInfo, period, stats, deals, brokerName } = await req.json();

    const html = generateReportHTML(accountInfo, period, stats, deals, brokerName);

    // Launch puppeteer and render HTML to PDF
    const puppeteer = await import('puppeteer');
    // Resolve the Chrome executable path — works regardless of which system user runs the process
    const { executablePath } = await import('puppeteer');
    const chromePath = executablePath();

    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await browser.close();

    const filename = `TradeGPT_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`;

    const buffer = Buffer.from(pdfBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err: any) {
    console.error('[PDF API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
