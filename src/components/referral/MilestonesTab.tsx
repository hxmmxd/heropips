'use client';

import React from 'react';

interface Milestone {
  id: string;
  name: string;
  target_lots: number;
  reward_amount: number;
  icon: string | null;
  sort_order: number;
  progress: {
    total_counted_lots: number;
    status: string;
  } | null;
}

interface MilestonesTabProps {
  milestones: Milestone[];
  loading: boolean;
}

const getLevelColor = (level: any) => {
  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
  const idx = Math.max(0, (Number(level) || 1) - 1);
  return colors[idx % colors.length];
};

export default function MilestonesTab({ milestones, loading }: MilestonesTabProps) {
  return (
    <div className="rh-section-card">
      <div className="rh-section-card-header">
        <span className="rh-section-card-title">Milestone Tiers</span>
        <span className="rh-section-card-hint">40/40/20 Leg Rule Applied</span>
      </div>
      <div className="rh-section-card-body">
        {loading ? (
          <div className="rh-empty">Loading milestone progress...</div>
        ) : milestones.length === 0 ? (
          <div className="rh-empty">No milestone configurations found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {milestones.map((m) => {
              const p = m.progress;
              const pct = p ? Math.min((p.total_counted_lots / m.target_lots) * 100, 100) : 0;
              const status = p?.status || 'in_progress';
              const isQualified = status === 'qualified' || status === 'paid';
              const isPaid = status === 'paid';
              const color = getLevelColor(m.sort_order || 1);

              return (
                <div
                  key={m.id}
                  style={{
                    background: 'var(--input-bg)',
                    border: `1px solid ${isQualified ? '#10b981' : 'var(--border)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18
                    }}>
                      {m.icon || '🏆'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                          {m.name}
                        </span>
                        {isQualified && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                            background: isPaid ? 'rgba(16,185,129,0.1)' : `${color}20`,
                            color: isPaid ? '#10b981' : '#d4a843',
                            textTransform: 'uppercase'
                          }}>
                            {isPaid ? 'Paid' : 'Qualified'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--subtext)', marginTop: 2 }}>
                        {(p?.total_counted_lots || 0).toLocaleString()} / {m.target_lots.toLocaleString()} lots &nbsp;·&nbsp; Reward: <strong style={{ color }}>${m.reward_amount.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: isQualified ? '#10b981' : 'var(--text)' }}>
                      {Math.round(pct)}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: isQualified ? '#10b981' : color,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
