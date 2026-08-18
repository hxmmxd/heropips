import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Spawn the deep backtest script as a detached background process
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'deepBacktest.ts');
    
    // We use tsx to run the typescript file directly
    const child = spawn('npx', ['tsx', scriptPath], {
      detached: true,
      stdio: 'ignore', // Ignore stdout/stderr so it doesn't block
      cwd: process.cwd()
    });
    
    // Unref the child process so the API route can return immediately
    child.unref();

    return NextResponse.json({ 
      success: true, 
      message: 'Deep scan started in the background. It may take 30-60 seconds to finish generating the MT5 CSV.' 
    });
  } catch (error: any) {
    console.error('Failed to trigger deep scan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
