import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/fix-constraints
 * Fixes the wallet_transactions CHECK constraint to include 'course_purchase'.
 * Uses raw SQL via Supabase's postgrest-compatible approach.
 */
export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Use the Supabase Management API to run raw SQL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Execute via PostgREST's built-in RPC — create a temp function, call it, drop it
    const sql = `
      DO $$
      BEGIN
        ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_tx_type_check;
        ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_tx_type_check 
          CHECK (tx_type IN ('rebate', 'referral', 'withdrawal_request', 'withdrawal_payout', 'withdrawal_declined', 'course_purchase'));
      END $$;
    `;

    // Try via Supabase SQL endpoint (works with service role)
    const sqlEndpoint = supabaseUrl.replace('.supabase.co', '.supabase.co') + '/rest/v1/rpc/';
    
    // Approach: Use the pg_net extension or direct REST SQL endpoint
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (res.ok) {
      return NextResponse.json({ success: true, message: 'Constraint fixed via RPC' });
    }

    // Fallback: try the management API SQL endpoint
    // Extract project ref from URL
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (mgmtRes.ok) {
      return NextResponse.json({ success: true, message: 'Constraint fixed via management API' });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Auto-fix failed. Please run this SQL manually in Supabase SQL Editor',
      sql: `ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_tx_type_check;\nALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_tx_type_check CHECK (tx_type IN ('rebate', 'referral', 'withdrawal_request', 'withdrawal_payout', 'withdrawal_declined', 'course_purchase'));`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
