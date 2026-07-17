import React, { useState } from 'react';
import { Clock, Loader2, CheckCircle2, XCircle, Play, AlertTriangle, Trash2 } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  schedule: string;
  scheduleLabel: string;
  category: 'broker' | 'finance' | 'system';
}

const CRON_JOBS: CronJob[] = [
  {
    id: 'sync-deals',
    name: 'Sync Broker Deals',
    description: 'Fetches closed deals from MetaAPI for all connected broker accounts, archives to closed_deals table, updates trade records, and saves daily equity snapshots.',
    endpoint: '/api/cron/sync-deals',
    schedule: '0 */6 * * *',
    scheduleLabel: 'Every 6 hours',
    category: 'broker',
  },
  {
    id: 'sync-rebates',
    name: 'Sync Rebates',
    description: 'Processes rebate payouts for closed trades — applies volume tiers, plan multipliers, hedge detection, drawdown safeguards, and multi-level referral distribution.',
    endpoint: '/api/cron/sync-rebates',
    schedule: '30 */6 * * *',
    scheduleLabel: 'Every 6 hours (offset 30min)',
    category: 'finance',
  },
];

export default function CronJobsTab() {
  interface RunResult {
    jobId: string;
    status: 'idle' | 'running' | 'success' | 'error';
    startedAt: string | null;
    finishedAt: string | null;
    durationMs: number | null;
    response: any;
    error: string | null;
  }

  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [history, setHistory] = useState<{ jobId: string; at: string; status: 'success' | 'error'; durationMs: number; summary: string }[]>([]);

  const getResult = (id: string): RunResult => results[id] || {
    jobId: id, status: 'idle', startedAt: null, finishedAt: null, durationMs: null, response: null, error: null,
  };

  const runJob = async (job: CronJob) => {
    const t0 = Date.now();
    setResults(prev => ({
      ...prev,
      [job.id]: { jobId: job.id, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, durationMs: null, response: null, error: null },
    }));

    try {
      const res = await fetch(`${job.endpoint}?secret=${encodeURIComponent(process.env.NEXT_PUBLIC_CRON_SECRET || 'dev')}`);
      const data = await res.json();
      const duration = Date.now() - t0;

      if (!res.ok) {
        const errMsg = data.error || `HTTP ${res.status}`;
        setResults(prev => ({
          ...prev,
          [job.id]: { jobId: job.id, status: 'error', startedAt: prev[job.id]?.startedAt || null, finishedAt: new Date().toISOString(), durationMs: duration, response: data, error: errMsg },
        }));
        setHistory(prev => [{ jobId: job.id, at: new Date().toISOString(), status: 'error' as const, durationMs: duration, summary: errMsg }, ...prev].slice(0, 50));
      } else {
        const summary = job.id === 'sync-deals'
          ? `${data.brokersProcessed || 0} brokers processed`
          : `${data.processed_deals || 0} deals, $${(data.total_credited || 0).toFixed(2)} credited`;
        setResults(prev => ({
          ...prev,
          [job.id]: { jobId: job.id, status: 'success', startedAt: prev[job.id]?.startedAt || null, finishedAt: new Date().toISOString(), durationMs: duration, response: data, error: null },
        }));
        setHistory(prev => [{ jobId: job.id, at: new Date().toISOString(), status: 'success' as const, durationMs: duration, summary }, ...prev].slice(0, 50));
      }
    } catch (err: any) {
      const duration = Date.now() - t0;
      const errMsg = err.message || 'Network error';
      setResults(prev => ({
        ...prev,
        [job.id]: { jobId: job.id, status: 'error', startedAt: prev[job.id]?.startedAt || null, finishedAt: new Date().toISOString(), durationMs: duration, response: null, error: errMsg },
      }));
      setHistory(prev => [{ jobId: job.id, at: new Date().toISOString(), status: 'error' as const, durationMs: duration, summary: errMsg }, ...prev].slice(0, 50));
    }
  };

  const categoryColors: Record<string, string> = {
    broker: '#3b82f6',
    finance: '#10b981',
    system: '#8b5cf6',
  };

  const statusConfig: Record<string, { color: string; bg: string; label: string; Icon: any }> = {
    idle: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Idle', Icon: Clock },
    running: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Running', Icon: Loader2 },
    success: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Success', Icon: CheckCircle2 },
    error: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Failed', Icon: XCircle },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>⏰ Cron Jobs</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
            Scheduled background tasks. Use <strong>Run Now</strong> to execute manually, or configure external cron triggers via <code style={{ fontSize: 11, background: 'var(--input-bg)', padding: '1px 5px', borderRadius: 4 }}>GET /api/cron/[job]?secret=CRON_SECRET</code>
          </p>
        </div>
      </div>

      {/* Job Cards */}
      {CRON_JOBS.map(job => {
        const r = getResult(job.id);
        const sc = statusConfig[r.status];
        const StatusIcon = sc.Icon;
        const catColor = categoryColors[job.category] || '#6b7280';

        return (
          <div key={job.id} className="adm-card adm-card-full">
            <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${catColor}12`, border: `1px solid ${catColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Clock style={{ width: 18, height: 18, color: catColor }} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{job.name}</h4>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)', marginTop: 2, maxWidth: 500 }}>{job.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/* Status Badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 20,
                    background: sc.bg, border: `1px solid ${sc.color}30`,
                  }}>
                    <StatusIcon style={{
                      width: 13, height: 13, color: sc.color,
                      ...(r.status === 'running' ? { animation: 'spin 1s linear infinite' } : {}),
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{sc.label}</span>
                  </div>
                  {/* Run Button */}
                  <button
                    onClick={() => runJob(job)}
                    disabled={r.status === 'running'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: r.status === 'running' ? 'var(--input-bg)' : '#4f8ef7',
                      color: r.status === 'running' ? 'var(--subtext)' : '#fff',
                      fontSize: 12, fontWeight: 600,
                      opacity: r.status === 'running' ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {r.status === 'running'
                      ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Running...</>
                      : <><Play style={{ width: 13, height: 13 }} /> Run Now</>
                    }
                  </button>
                </div>
              </div>
            </div>

            <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Schedule & Endpoint Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{job.scheduleLabel}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--subtext)', fontFamily: 'monospace' }}>{job.schedule}</p>
                </div>
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Endpoint</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{job.endpoint}</p>
                </div>
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Run</p>
                  {r.finishedAt ? (
                    <>
                      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                        {new Date(r.finishedAt).toLocaleTimeString()}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--subtext)' }}>
                        {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'}
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--subtext)' }}>Never</p>
                  )}
                </div>
              </div>

              {/* Result Output */}
              {r.status === 'success' && r.response && (
                <div style={{
                  background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>✅ Last Result</p>
                  <pre style={{
                    margin: 0, fontSize: 11, color: 'var(--text)', fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto',
                    lineHeight: '1.5',
                  }}>{JSON.stringify(r.response, null, 2)}</pre>
                </div>
              )}
              {r.status === 'error' && r.error && (
                <div style={{
                  background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                    <AlertTriangle style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Error
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#ef4444', fontFamily: 'monospace' }}>{r.error}</p>
                  {r.response && (
                    <pre style={{
                      margin: '8px 0 0', fontSize: 11, color: 'var(--subtext)', fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 150, overflow: 'auto',
                    }}>{JSON.stringify(r.response, null, 2)}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Execution History */}
      {history.length > 0 && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>📋 Execution History</h3>
            <button
              onClick={() => setHistory([])}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                padding: '4px 10px', fontSize: 11, color: 'var(--subtext)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Trash2 style={{ width: 11, height: 11 }} /> Clear
            </button>
          </div>
          <div className="adm-card-body">
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px 70px 1fr', background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
                {['Time', 'Job', 'Status', 'Duration', 'Summary'].map(h => (
                  <div key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                ))}
              </div>
              {history.map((h, i) => {
                const job = CRON_JOBS.find(j => j.id === h.jobId);
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '140px 1fr 80px 70px 1fr',
                    borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                  }}>
                    <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--subtext)', fontFamily: 'monospace' }}>
                      {new Date(h.at).toLocaleTimeString()}
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {job?.name || h.jobId}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: h.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: h.status === 'success' ? '#10b981' : '#ef4444',
                      }}>
                        {h.status === 'success' ? '✓' : '✗'}
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--subtext)', fontFamily: 'monospace' }}>
                      {(h.durationMs / 1000).toFixed(1)}s
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--subtext)' }}>
                      {h.summary}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
