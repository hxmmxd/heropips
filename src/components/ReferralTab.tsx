'use client';

import React, { useState } from 'react';

interface Partner {
  name: string;
  portfolio: string;
  rebate: string;
  commission: string;
  status: string;
  joined: string;
  trades: number;
}

interface ReferralTabProps {
  partners?: Partner[];
}

const mockPartners: Partner[] = [
  { name: 'Alpha_Quant',        portfolio: '42,481',  rebate: '622',   commission: '124', status: 'Active',   joined: 'May 12',  trades: 84 },
  { name: 'Retail_King',        portfolio: '12,400',  rebate: '88',    commission: '17',  status: 'Active',   joined: 'May 18',  trades: 31 },
  { name: 'Scalp_Hunter',       portfolio: '89,120',  rebate: '1,142', commission: '228', status: 'Active',   joined: 'Apr 29',  trades: 210 },
  { name: 'Institutional_Void', portfolio: '540,200', rebate: '4,240', commission: '848', status: 'Active',   joined: 'Apr 10',  trades: 612 },
  { name: 'FX_Nomad',           portfolio: '8,800',   rebate: '44',    commission: '8',   status: 'Inactive', joined: 'May 25',  trades: 12 },
];

const milestones = [
  { label: '1st Referral',   reward: '$25',    reached: true  },
  { label: '5 Referrals',    reward: '$100',   reached: true  },
  { label: '10 Referrals',   reward: '$250',   reached: false },
  { label: '25 Referrals',   reward: '$750',   reached: false },
  { label: '50 Referrals',   reward: '$2,000', reached: false },
];

const REFERRAL_CODE = 'TGPT-U82910';
const REFERRAL_LINK = 'tradegpt.ai/r/u82910';

export default function ReferralTab({ partners = mockPartners }: ReferralTabProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [activeTab, setActiveTab] = useState<'partners' | 'milestones'>('partners');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const copy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalRebate = 4820;
  const totalCommission = 1240;
  const activeCount = partners.filter(p => p.status === 'Active').length;
  const networkPortfolio = '1.2M';
  const progressToNext = (partners.length / 10) * 100; // toward 10-referral milestone

  return (
    <div className="referral-root">

      {/* ── HERO ── */}
      <div className="ref-hero">
        <div className="ref-hero-glow" />
        <div className="ref-hero-content">
          <div className="ref-hero-badge">🎁 Referral Hub</div>
          <h1 className="ref-hero-title">Earn While Your Network Trades</h1>
          <p className="ref-hero-sub">Share your link. Earn rebates on every trade your referrals make — forever.</p>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="ref-stats">
        <div className="ref-stat">
          <span className="ref-stat-label">Total Rebates</span>
          <span className="ref-stat-value green">${totalRebate.toLocaleString()}</span>
          <span className="ref-stat-sub">↑ 12.4% this month</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-label">Commissions</span>
          <span className="ref-stat-value">${totalCommission.toLocaleString()}</span>
          <span className="ref-stat-sub">↑ 8.1% this month</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-label">Active Partners</span>
          <span className="ref-stat-value blue">{activeCount}</span>
          <span className="ref-stat-sub">{partners.length} total referred</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-label">Network Volume</span>
          <span className="ref-stat-value purple">${networkPortfolio}</span>
          <span className="ref-stat-sub">Combined portfolio</span>
        </div>
      </div>

      {/* ── INVITE CARD ── */}
      <div className="ref-invite-card">
        <div className="ref-invite-left">
          <div className="ref-invite-icon">🔗</div>
          <div>
            <p className="ref-invite-eyebrow">Your Referral Link</p>
            <code className="ref-invite-url">{REFERRAL_LINK}</code>
          </div>
        </div>
        <div className="ref-invite-actions">
          <div className="ref-code-pill">
            <span className="ref-code-label">CODE</span>
            <code className="ref-code-val">{REFERRAL_CODE}</code>
            <button className="ref-copy-btn" onClick={() => copy(REFERRAL_CODE, 'code')}>
              {copied === 'code' ? '✓' : '⎘'}
            </button>
          </div>
          <button className="ref-copy-link-btn" onClick={() => copy(REFERRAL_LINK, 'link')}>
            {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* ── MILESTONE PROGRESS ── */}
      <div className="ref-milestone-bar-card">
        <div className="ref-milestone-bar-top">
          <span className="ref-milestone-bar-label">Progress to next milestone</span>
          <span className="ref-milestone-bar-sub">{partners.length} / 10 referrals</span>
        </div>
        <div className="ref-progress-track">
          <div className="ref-progress-fill" style={{ width: `${Math.min(progressToNext, 100)}%` }} />
          <div className="ref-progress-thumb" style={{ left: `${Math.min(progressToNext, 100)}%` }} />
        </div>
        <div className="ref-progress-labels">
          <span>0</span><span>5</span><span>10 🎯 $250</span>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="ref-tabs-header">
        <button
          className={`ref-tab-btn ${activeTab === 'partners' ? 'ref-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('partners')}
        >👥 Partners ({partners.length})</button>
        <button
          className={`ref-tab-btn ${activeTab === 'milestones' ? 'ref-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >🏆 Milestones</button>
      </div>

      {/* ── PARTNERS LIST ── */}
      {activeTab === 'partners' && (
        <div className="ref-partners">
          {partners.map((p, idx) => {
            const isOpen = expandedIdx === idx;
            const initials = p.name.slice(0, 2).toUpperCase();
            return (
              <div key={p.name} className={`ref-partner-card ${isOpen ? 'ref-partner-card--open' : ''}`}>
                <button className="ref-partner-row" onClick={() => setExpandedIdx(isOpen ? null : idx)}>
                  <div className="ref-partner-avatar">{initials}</div>
                  <div className="ref-partner-info">
                    <span className="ref-partner-name">{p.name}</span>
                    <span className="ref-partner-joined">Joined {p.joined} · {p.trades} trades</span>
                  </div>
                  <div className="ref-partner-right">
                    <span className={`ref-partner-status ${p.status === 'Active' ? 'ref-status--active' : 'ref-status--inactive'}`}>
                      {p.status}
                    </span>
                    <span className="ref-partner-rebate">+${p.rebate}</span>
                    <span className="ref-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="ref-partner-detail">
                    <div className="ref-detail-grid">
                      <div className="ref-detail-item">
                        <span className="ref-detail-label">Portfolio</span>
                        <span className="ref-detail-value">${p.portfolio}</span>
                      </div>
                      <div className="ref-detail-item">
                        <span className="ref-detail-label">Rebate Earned</span>
                        <span className="ref-detail-value green">+${p.rebate}</span>
                      </div>
                      <div className="ref-detail-item">
                        <span className="ref-detail-label">Commission</span>
                        <span className="ref-detail-value blue">${p.commission}</span>
                      </div>
                      <div className="ref-detail-item">
                        <span className="ref-detail-label">Total Trades</span>
                        <span className="ref-detail-value">{p.trades}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MILESTONES ── */}
      {activeTab === 'milestones' && (
        <div className="ref-milestones">
          {milestones.map((m, i) => (
            <div key={i} className={`ref-milestone ${m.reached ? 'ref-milestone--reached' : ''}`}>
              <div className="ref-milestone-check">{m.reached ? '✓' : i + 1}</div>
              <div className="ref-milestone-info">
                <span className="ref-milestone-title">{m.label}</span>
                <span className="ref-milestone-sub">{m.reached ? 'Unlocked' : 'Locked'}</span>
              </div>
              <div className="ref-milestone-reward">{m.reward}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── HOW IT WORKS ── */}
      <div className="ref-how">
        <p className="ref-how-title">How it works</p>
        <div className="ref-how-steps">
          {[
            { icon: '🔗', label: 'Share your link',    sub: 'Send to traders you know' },
            { icon: '📋', label: 'They sign up',        sub: 'Partner creates an account' },
            { icon: '💹', label: 'They trade',          sub: 'Any market, any broker' },
            { icon: '💰', label: 'You earn',            sub: 'Rebate on every trade' },
          ].map((s, i) => (
            <div key={i} className="ref-how-step">
              <div className="ref-how-icon">{s.icon}</div>
              <span className="ref-how-label">{s.label}</span>
              <span className="ref-how-sub">{s.sub}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
