'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LegBreakdown {
  legUserId: string;
  legName: string;
  rawLots: number;
  cappedLots: number;
  capped: boolean;
}

interface MilestoneData {
  id: string;
  name: string;
  target_lots: number;
  reward_amount: number;
  reward_currency: string;
  leg_cap_pct: number;
  icon: string;
  sort_order: number;
  progress: {
    status: string;
    total_raw_lots: number;
    total_counted_lots: number;
    legs_breakdown: LegBreakdown[];
    qualified_at: string | null;
    paid_at: string | null;
  } | null;
}

const TIER_COLORS: Record<string, string> = {
  'Bronze':   '#cd7f32',
  'Silver':   '#c0c0c0',
  'Gold':     '#d4a843',
  'Platinum': '#e5e4e2',
  'Diamond':  '#b9f2ff',
};

function getColor(name: string): string {
  return TIER_COLORS[name] || '#d4a843';
}

export default function MilestoneProgress({ userId: propUserId }: { userId?: string }) {
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(propUserId || null);

  // Auto-resolve userId from auth if not provided as prop
  useEffect(() => {
    if (propUserId) { setResolvedUserId(propUserId); return; }
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setResolvedUserId(user.id);
        else setLoading(false); // not logged in, stop loading
      } catch { setLoading(false); }
    })();
  }, [propUserId]);

  const fetchMilestones = useCallback(async () => {
    if (!resolvedUserId) return;
    try {
      const res = await fetch(`/api/milestones?userId=${resolvedUserId}`);
      const data = await res.json();
      if (data.success) setMilestones(data.milestones || []);
    } catch (e) {
      console.error('Failed to fetch milestones:', e);
    } finally {
      setLoading(false);
    }
  }, [resolvedUserId]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  const recalculate = async () => {
    if (!resolvedUserId) return;
    setRecalculating(true);
    try {
      await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resolvedUserId }),
      });
      await fetchMilestones();
    } catch (e) {
      console.error('Recalculation failed:', e);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>
        Loading milestones…
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>
        No milestone tiers configured yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
            🏆 Team Volume Milestones
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--subtext)' }}>
            40/40/20 balanced-leg qualification · No single leg can carry more than 40%
          </p>
        </div>
        <button
          onClick={recalculate}
          disabled={recalculating}
          style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card-bg)', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
            opacity: recalculating ? 0.5 : 1,
          }}
        >
          {recalculating ? '⏳ Checking…' : '🔄 Recalculate'}
        </button>
      </div>

      {/* Milestone cards */}
      {milestones.map((m) => {
        const p = m.progress;
        const pct = p ? Math.min((p.total_counted_lots / m.target_lots) * 100, 100) : 0;
        const status = p?.status || 'in_progress';
        const isQualified = status === 'qualified' || status === 'paid';
        const isPaid = status === 'paid';
        const color = getColor(m.name);
        const legCap = m.target_lots * (m.leg_cap_pct / 100);
        const expanded = expandedId === m.id;

        return (
          <div
            key={m.id}
            style={{
              background: 'var(--card-bg, #fff)',
              border: `1px solid ${isQualified ? color + '60' : 'var(--border)'}`,
              borderRadius: 14,
              overflow: 'hidden',
              transition: 'all 0.2s',
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expanded ? null : m.id)}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {m.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{m.name}</span>
                  {isQualified && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                      background: isPaid ? 'rgba(16,185,129,0.1)' : `${color}20`,
                      color: isPaid ? '#10b981' : color,
                      textTransform: 'uppercase',
                    }}>
                      {isPaid ? '✓ Paid' : '✓ Qualified'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>
                  {(p?.total_counted_lots || 0).toLocaleString()} / {m.target_lots.toLocaleString()} lots
                  &nbsp;·&nbsp;Reward: <strong style={{ color }}>${m.reward_amount.toLocaleString()}</strong>
                  &nbsp;·&nbsp;Cap: {m.leg_cap_pct}%
                </div>

                {/* Progress bar */}
                <div style={{
                  marginTop: 8, height: 6, borderRadius: 3,
                  background: 'var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${pct}%`,
                    background: isQualified
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : `linear-gradient(90deg, ${color}, ${color}cc)`,
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>

              <div style={{
                fontSize: 16, fontWeight: 800,
                color: isQualified ? '#10b981' : color,
                flexShrink: 0,
              }}>
                {Math.round(pct)}%
              </div>

              <span style={{
                fontSize: 12, color: 'var(--subtext)',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}>▼</span>
            </div>

            {/* Expanded leg breakdown */}
            {expanded && p && (
              <div style={{
                borderTop: '1px solid var(--border)',
                padding: '14px 16px',
                background: 'var(--input-bg, #fafafa)',
              }}>
                {/* 40/40/20 rule explanation */}
                <div style={{
                  display: 'flex', gap: 4, marginBottom: 12,
                }}>
                  <div style={{
                    flex: 2, padding: '8px 12px', borderRadius: 8,
                    background: `${color}15`, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>{m.leg_cap_pct}%</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--subtext)' }}>STRONGEST LEG MAX</div>
                  </div>
                  <div style={{
                    flex: 2, padding: '8px 12px', borderRadius: 8,
                    background: `${color}10`, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>{m.leg_cap_pct}%</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--subtext)' }}>SECOND LEG MAX</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    background: `${color}08`, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>{100 - m.leg_cap_pct * 2}%</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--subtext)' }}>OTHER LEGS</div>
                  </div>
                </div>

                {/* Leg table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px',
                  gap: 8, padding: '6px 10px',
                  fontSize: 10, fontWeight: 700, color: 'var(--subtext)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  <span>Direct Leg</span>
                  <span style={{ textAlign: 'right' }}>Business</span>
                  <span style={{ textAlign: 'right' }}>Counted</span>
                  <span style={{ textAlign: 'right' }}>Status</span>
                </div>

                {/* Leg rows */}
                {(p.legs_breakdown || []).map((leg, i) => (
                  <div key={leg.legUserId || i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px',
                    gap: 8, padding: '8px 10px',
                    borderTop: '1px solid var(--border)',
                    fontSize: 12, alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {leg.legName || `Leg ${i + 1}`}
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {leg.rawLots.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 700, color: leg.capped ? '#ef4444' : '#10b981' }}>
                      {leg.cappedLots.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{
                      textAlign: 'right', fontSize: 9, fontWeight: 700,
                      color: leg.capped ? '#ef4444' : '#10b981',
                    }}>
                      {leg.capped ? `CAPPED` : 'OK'}
                    </span>
                  </div>
                ))}

                {(p.legs_breakdown || []).length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--subtext)', fontSize: 12 }}>
                    No direct referrals yet. Build your team to qualify!
                  </div>
                )}

                {/* Summary row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px',
                  gap: 8, padding: '10px 10px',
                  borderTop: '2px solid var(--border)',
                  fontSize: 12, fontWeight: 800,
                }}>
                  <span style={{ color: 'var(--text)' }}>Total</span>
                  <span style={{ textAlign: 'right', color: 'var(--text)' }}>
                    {(p.total_raw_lots || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span style={{ textAlign: 'right', color: isQualified ? '#10b981' : color }}>
                    {(p.total_counted_lots || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span style={{
                    textAlign: 'right', fontSize: 9,
                    color: isQualified ? '#10b981' : '#ef4444',
                  }}>
                    {isQualified ? '✓ QUALIFIED' : 'NOT YET'}
                  </span>
                </div>

                {/* Target info */}
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: isQualified ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.03)',
                  fontSize: 11, color: 'var(--subtext)',
                }}>
                  Target: <strong>{m.target_lots.toLocaleString()}</strong> lots
                  &nbsp;·&nbsp;Per-leg cap ({m.leg_cap_pct}%): <strong>{legCap.toLocaleString()}</strong> lots
                  {isQualified && p.qualified_at && (
                    <> &nbsp;·&nbsp;Qualified: <strong>{new Date(p.qualified_at).toLocaleDateString()}</strong></>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
