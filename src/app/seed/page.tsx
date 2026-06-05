'use client';
import { useState } from 'react';

export default function SeedPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referral/seed', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>🌱 Referral Hub Seed Tool</h1>
      <p style={{ color: '#888', marginBottom: 20 }}>Click the button to populate test referral data for your account.</p>
      <button
        onClick={runSeed}
        disabled={loading}
        style={{
          padding: '14px 28px', fontSize: 16, fontWeight: 700,
          background: loading ? '#333' : '#10b981', color: '#fff',
          border: 'none', borderRadius: 12, cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? '⏳ Seeding data... (may take 30s)' : '🚀 Run Seed'}
      </button>

      {result && (
        <pre style={{
          marginTop: 24, padding: 20, background: '#111', borderRadius: 12,
          overflow: 'auto', fontSize: 12, maxHeight: 500, border: '1px solid #333',
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
