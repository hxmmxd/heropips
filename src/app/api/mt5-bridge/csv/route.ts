import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tf = searchParams.get('tf') || '1h'; // default to 1h
    
    // Ensure tf is safely formatted to prevent directory traversal
    const safeTf = tf.replace(/[^a-zA-Z0-9]/g, '');
    const filePath = path.join(process.cwd(), 'reports', `mt5_signals_${safeTf}.csv`);
    
    if (!fs.existsSync(filePath)) {
      return new NextResponse(`File not found: mt5_signals_${safeTf}.csv. Please run the deepBacktest script.`, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `inline; filename="signals_${safeTf}.csv"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('MT5 Bridge CSV Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
