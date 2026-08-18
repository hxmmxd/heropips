import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    // Validate ID to prevent directory traversal
    if (!/^[a-zA-Z0-9_]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }
    
    const filePath = path.join(process.cwd(), 'reports', `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
    // Send as stream to handle large JSON files efficiently
    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath) as any;
    
    return new NextResponse(fileStream, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': stat.size.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('[Report Fetch Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
