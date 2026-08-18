import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ reports: [] });
    }
    
    const files = fs.readdirSync(reportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).map(f => {
      const filePath = path.join(reportsDir, f);
      const stat = fs.statSync(filePath);
      
      // Read a small chunk to get the summary without loading huge file
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      
      return {
        id: f.replace('.json', ''),
        filename: f,
        createdAt: stat.mtime.toISOString(),
        summary: parsed.summary
      };
    });
    
    // Sort newest first
    jsonFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({ reports: jsonFiles });
  } catch (error: any) {
    console.error('[Reports API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
