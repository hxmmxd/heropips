'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToAdminFarm() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin?section=mt5farm');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg, #0b0c10)', color: 'var(--subtext, #64748b)', fontFamily: 'sans-serif' }}>
      Redirecting to MT5 Farm Monitor...
    </div>
  );
}
