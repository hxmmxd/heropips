'use client';

import React, { useState, useEffect } from 'react';
import MilestoneProgress from '@/components/referral/MilestoneProgress';

interface Partner {
  name: string;
  portfolio: string;
  rebate: string;
  commission: string;
  status: string;
  joined: string;
  trades: number;
  level?: number;
  children?: Partner[];
}

interface ReferralTabProps {
  partners?: Partner[];
}

const LEVEL_COLORS  = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
const LEVEL_LABELS  = ['Direct', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
const LEVEL_RATES   = [
  { commission: 10, rebate: 5   },
  { commission: 5,  rebate: 2   },
  { commission: 3,  rebate: 1   },
  { commission: 2,  rebate: 0.5 },
  { commission: 1,  rebate: 0.25},
];

const mockNetwork: Partner[] = [
  {
    name: 'Alpha_Quant', portfolio: '42,481', rebate: '622', commission: '124',
    status: 'Active', joined: 'May 12', trades: 84, level: 1,
    children: [
      {
        name: 'Quant_Sub1', portfolio: '12,000', rebate: '88', commission: '17',
        status: 'Active', joined: 'May 15', trades: 28, level: 2,
        children: [
          {
            name: 'Sub1_Child', portfolio: '5,400', rebate: '32', commission: '6',
            status: 'Active', joined: 'May 20', trades: 11, level: 3,
            children: [
              {
                name: 'Deep_Trader', portfolio: '2,100', rebate: '12', commission: '2',
                status: 'Active', joined: 'May 22', trades: 4, level: 4,
                children: [
                  { name: 'Ultra_Deep', portfolio: '800', rebate: '4', commission: '0.8', status: 'Inactive', joined: 'May 28', trades: 1, level: 5 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Institutional_Void', portfolio: '540,200', rebate: '4,240', commission: '848',
    status: 'Active', joined: 'Apr 10', trades: 612, level: 1,
    children: [
      { name: 'Void_Sub', portfolio: '28,000', rebate: '198', commission: '40', status: 'Active', joined: 'Apr 18', trades: 74, level: 2 },
    ],
  },
  { name: 'Scalp_Hunter',  portfolio: '89,120', rebate: '1,142', commission: '228', status: 'Active',   joined: 'Apr 29', trades: 210, level: 1 },
  { name: 'Retail_King',   portfolio: '12,400', rebate: '88',    commission: '17',  status: 'Active',   joined: 'May 18', trades: 31,  level: 1 },
  { name: 'FX_Nomad',      portfolio: '8,800',  rebate: '44',    commission: '8',   status: 'Inactive', joined: 'May 25', trades: 12,  level: 1 },
];

const MILESTONES = [
  { label: '1st Referral', reward: '$25',    refs: 1,  reached: true  },
  { label: '5 Referrals',  reward: '$100',   refs: 5,  reached: true  },
  { label: '10 Referrals', reward: '$250',   refs: 10, reached: false },
  { label: '25 Referrals', reward: '$750',   refs: 25, reached: false },
  { label: '50 Referrals', reward: '$2,000', refs: 50, reached: false },
];

const REFERRAL_CODE = 'TGPT-U82910';
const REFERRAL_LINK = 'tradegpt.ai/r/u82910';

function countAll(nodes: Partner[]) {
  const byLevel = [0, 0, 0, 0, 0];
  function walk(p: Partner) {
    const idx = (p.level ?? 1) - 1;
    if (idx >= 0 && idx < 5) byLevel[idx]++;
    p.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return { total: byLevel.reduce((a, b) => a + b, 0), byLevel };
}

// Animated counter hook
function useCounter(target: number, duration = 1200, isFloat = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { 
        setVal(target); 
        clearInterval(timer); 
      } else {
        setVal(isFloat ? Number(start.toFixed(2)) : Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, isFloat]);
  return val;
}

function NetworkNode({ partner, depth = 0 }: { partner: Partner; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const lvlIdx  = (partner.level ?? 1) - 1;
  const color   = LEVEL_COLORS[lvlIdx];
  const hasKids = (partner.children?.length ?? 0) > 0;
  const initials = partner.name.slice(0, 2).toUpperCase();

  return (
    <div className={`ref-tree-item depth-${depth}`}>
      {depth > 0 && <div className="ref-tree-line" style={{ borderColor: color + '30' }} />}
      <div
        className={`ref-tree-node ${hasKids ? 'ref-tree-node--clickable' : ''} ${open && hasKids ? 'ref-tree-node--open' : ''}`}
        style={{ borderColor: open && hasKids ? color + '40' : 'var(--border)' }}
        onClick={() => hasKids && setOpen(!open)}
      >
        <span className="ref-tree-lvl-badge" style={{ background: color }}>L{partner.level}</span>
        <div className="ref-tree-avatar" style={{ background: `linear-gradient(135deg,${color},${color}88)` }}>
          {initials}
        </div>
        <div className="ref-tree-info">
          <span className="ref-tree-name">{partner.name}</span>
          <span className="ref-tree-meta">
            {LEVEL_LABELS[lvlIdx]}&nbsp;·&nbsp;{partner.trades} trades&nbsp;·&nbsp;{partner.joined}
          </span>
        </div>
        <div className="ref-tree-right">
          <span className="ref-tree-rebate">+${partner.rebate}</span>
          <span className={`ref-badge-status ${partner.status === 'Active' ? 'ref-badge-active' : 'ref-badge-inactive'}`}>
            {partner.status}
          </span>
          {hasKids && (
            <span className="ref-tree-toggle" style={{ color, background: color + '15' }}>
              {open ? '▲' : `▼${partner.children!.length}`}
            </span>
          )}
        </div>
      </div>
      {open && hasKids && (
        <div className="ref-tree-children">
          {partner.children!.map((child, i) => (
            <NetworkNode key={i} partner={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = 'network' | 'milestones' | 'rates' | 'ledger';

export default function ReferralTab({ partners = mockNetwork }: ReferralTabProps) {
  const [copied, setCopied]   = useState<'code' | 'link' | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('network');
  const [shareOpen, setShareOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt]   = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'crypto'>('crypto');
  const [withdrawCoin, setWithdrawCoin]     = useState('USDT (TRC-20)');
  const [withdrawAddr, setWithdrawAddr]   = useState('');
  const [withdrawStep, setWithdrawStep]   = useState<'form'|'confirm'|'success'>('form');
  const [withdrawing, setWithdrawing]     = useState(false);
  const [withdrawError, setWithdrawError] = useState<string|null>(null);
  const [withdrawResult, setWithdrawResult] = useState<{withdrawalId?:string;nowpaymentsId?:string}|null>(null);

  // Dynamic wallet & transactions state
  const [wallet, setWallet] = useState({
    available: 0,
    pending:   0,
    lifetime:  0,
    minWithdrawal: 50,
    nextPayout: 'Dynamic Sync',
    totalLots: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.success && data.wallet) {
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load wallet stats:', err);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const { total, byLevel } = countAll(partners);
  const progressPct = Math.min((total / 10) * 100, 100);

  // Lot milestones calculations
  const totalLots = wallet.totalLots || 0;
  
  const LOT_MILESTONES = [
    { label: 'Bronze Trader', targetLots: 5,   reward: '$50 bonus',   reached: false },
    { label: 'Silver Trader', targetLots: 20,  reward: '$200 bonus',  reached: false },
    { label: 'Gold Trader',   targetLots: 50,  reward: '$500 bonus',  reached: false },
    { label: 'Platinum VIP',  targetLots: 100, reward: '$1,200 bonus', reached: false },
    { label: 'Diamond Elite', targetLots: 250, reward: '$3,000 bonus', reached: false },
  ];
  
  const currentLotMilestoneIndex = LOT_MILESTONES.findIndex(m => totalLots < m.targetLots);
  const nextLotMilestone = currentLotMilestoneIndex !== -1 ? LOT_MILESTONES[currentLotMilestoneIndex] : LOT_MILESTONES[LOT_MILESTONES.length - 1];
  const prevLotMilestoneTarget = currentLotMilestoneIndex > 0 ? LOT_MILESTONES[currentLotMilestoneIndex - 1].targetLots : 0;
  
  const lotProgressPct = Math.min(
    ((totalLots - prevLotMilestoneTarget) / Math.max(1, nextLotMilestone.targetLots - prevLotMilestoneTarget)) * 100,
    100
  );

  // Animation triggers for progress fills
  const [barAnimated, setBarAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  const animTotal     = useCounter(total);
  const animRebate    = useCounter(Math.round(wallet.available));
  const animComm      = useCounter(Math.round(wallet.lifetime));
  const animLots      = useCounter(totalLots, 1200, true);

  const copy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join TradeGPT', text: 'Use my referral link to join TradeGPT!', url: 'https://' + REFERRAL_LINK });
      } catch {}
    } else {
      setShareOpen(true);
    }
  };

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'network',    icon: '🌐', label: 'Network'    },
    { id: 'milestones', icon: '🏆', label: 'Milestones' },
    { id: 'rates',      icon: '📊', label: 'Rates'      },
    { id: 'ledger',     icon: '📜', label: 'Ledger'     },
  ];

  return (
    <div className="ref2-root">

      {/* ── HERO ── */}
      <div className="ref2-hero">
        <div className="ref2-hero-orb ref2-orb1" />
        <div className="ref2-hero-orb ref2-orb2" />
        <div className="ref2-hero-inner">
          <div className="ref2-hero-badge">
            <span className="ref2-hero-badge-dot" />
            Referral Hub
          </div>
          <h1 className="ref2-hero-title">
            Earn While Your<br />Network Trades
          </h1>
          <p className="ref2-hero-sub">
            5-level deep commission structure. Earn on every trade your network makes — forever.
          </p>
          <div className="ref2-hero-actions">
            <button className="ref2-btn-primary" onClick={() => copy(REFERRAL_LINK, 'link')}>
              {copied === 'link' ? '✓ Copied!' : '🔗 Copy Link'}
            </button>
            <button className="ref2-btn-secondary" onClick={share}>
              ↗ Share
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="ref2-stats">
        {[
          { label: 'Total Rebates',   value: `$${animRebate.toLocaleString()}`, sub: '↑ 12.4% this month', color: '#10b981', icon: '💰' },
          { label: 'Commissions',     value: `$${animComm.toLocaleString()}`,   sub: '↑ 8.1% this month',  color: '#6366f1', icon: '📈' },
          { label: 'Network Size',    value: animTotal,                          sub: `${byLevel.filter(Boolean).length} active levels`, color: '#3b82f6', icon: '👥' },
          { label: 'Lots Traded',     value: `${animLots} lots`,                 sub: 'Personal closed volume', color: '#f59e0b', icon: '⚡' },
        ].map((s, i) => (
          <div key={i} className="ref2-stat-card">
            <div className="ref2-stat-icon">{s.icon}</div>
            <div className="ref2-stat-body">
              <span className="ref2-stat-label">{s.label}</span>
              <span className="ref2-stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="ref2-stat-sub">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── WALLET BALANCE CARD ── */}
      <div className="ref2-wallet">
        <div className="ref2-wallet-left">
          <div className="ref2-wallet-glow" />
          <span className="ref2-wallet-eyebrow">💼 Referral Wallet</span>
          <div className="ref2-wallet-balance">
            <span className="ref2-wallet-currency">$</span>
            <span className="ref2-wallet-amount">{wallet.available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="ref2-wallet-meta">
            <span className="ref2-wallet-pill ref2-wallet-pending">⏳ ${wallet.pending.toFixed(2)} pending</span>
            <span className="ref2-wallet-pill ref2-wallet-lifetime">🏆 ${wallet.lifetime.toLocaleString()} lifetime</span>
          </div>
          <p className="ref2-wallet-payout">Next auto-payout: <strong>{wallet.nextPayout}</strong></p>
        </div>
        <div className="ref2-wallet-right">
          <button className="ref2-withdraw-btn" onClick={() => { setWithdrawOpen(true); setWithdrawStep('form'); }}
            disabled={wallet.available < wallet.minWithdrawal}>
            ↑ Withdraw
          </button>
          <p className="ref2-wallet-min">Min ${wallet.minWithdrawal}</p>
        </div>
      </div>

      {/* ── REFERRAL LINK CARD ── */}
      <div className="ref2-link-card">
        <div className="ref2-link-top">
          <div className="ref2-link-icon">🔗</div>
          <div className="ref2-link-text">
            <span className="ref2-link-eyebrow">Your Referral Link</span>
            <code className="ref2-link-url">https://{REFERRAL_LINK}</code>
          </div>
        </div>
        <div className="ref2-link-actions">
          <div className="ref2-code-pill">
            <span className="ref2-code-tag">CODE</span>
            <code className="ref2-code-val">{REFERRAL_CODE}</code>
            <button className="ref2-code-copy" onClick={() => copy(REFERRAL_CODE, 'code')}>
              {copied === 'code' ? '✓' : '⎘'}
            </button>
          </div>
          <button className="ref2-btn-copy" onClick={() => copy(REFERRAL_LINK, 'link')}>
            {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button className="ref2-btn-share" onClick={share}>
            ↗ Share
          </button>
        </div>
      </div>

      {/* ── LEVEL OVERVIEW STRIP ── */}
      <div className="ref2-levels">
        {LEVEL_RATES.map((r, i) => (
          <div key={i} className="ref2-level-chip" style={{ borderColor: LEVEL_COLORS[i] + '30', background: LEVEL_COLORS[i] + '08' }}>
            <div className="ref2-level-dot" style={{ background: LEVEL_COLORS[i] }}>L{i + 1}</div>
            <div className="ref2-level-info">
              <span className="ref2-level-pct" style={{ color: LEVEL_COLORS[i] }}>{r.commission}%</span>
              <span className="ref2-level-sub">{byLevel[i]} members</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── MILESTONE PROGRESS GRID ── */}
      <div className="ref2-progress-grid">
        {/* Track 1: Network Referrals */}
        <div className="ref2-progress-card">
          <div className="ref2-progress-header">
            <div>
              <span className="ref2-progress-title">Referrals Milestone</span>
              <span className="ref2-progress-sub">{total} / 10 referrals · Earn $250</span>
            </div>
            <span className="ref2-progress-pct">{Math.round(progressPct)}%</span>
          </div>
          <div className="ref2-track">
            <div className="ref2-fill" style={{ width: barAnimated ? `${progressPct}%` : '0%', transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            <div className="ref2-thumb" style={{ left: barAnimated ? `${progressPct}%` : '0%', transition: 'left 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
          </div>
          <div className="ref2-track-labels">
            <span>0</span>
            <span>5 · $100</span>
            <span>10 · $250 🎯</span>
          </div>
        </div>

        {/* Track 2: Trading Lot Volume */}
        <div className="ref2-progress-card ref2-progress-card--lots">
          <div className="ref2-progress-header">
            <div>
              <span className="ref2-progress-title">Next Lot Milestone</span>
              <span className="ref2-progress-sub">
                {totalLots.toFixed(2)} / {nextLotMilestone.targetLots.toFixed(1)} lots · {nextLotMilestone.reward}
              </span>
            </div>
            <span className="ref2-progress-pct">{Math.round(lotProgressPct)}%</span>
          </div>
          <div className="ref2-track">
            <div className="ref2-fill ref2-fill--lots" style={{ width: barAnimated ? `${lotProgressPct}%` : '0%', transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
            <div className="ref2-thumb ref2-thumb--lots" style={{ left: barAnimated ? `${lotProgressPct}%` : '0%', transition: 'left 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
          </div>
          <div className="ref2-track-labels">
            <span>{prevLotMilestoneTarget.toFixed(1)}</span>
            <span>{nextLotMilestone.label}</span>
            <span>{nextLotMilestone.targetLots.toFixed(1)} lots 🎯</span>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="ref2-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ref2-tab ${activeTab === t.id ? 'ref2-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="ref2-tab-icon">{t.icon}</span>
            <span className="ref2-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── NETWORK TREE ── */}
      {activeTab === 'network' && (
        <div className="ref2-section">
          <div className="ref2-section-header">
            <span className="ref2-section-title">Your Network ({total} members)</span>
            <span className="ref2-section-hint">Tap to expand levels</span>
          </div>
          <div className="ref2-tree">
            {partners.map((p, i) => <NetworkNode key={i} partner={p} />)}
          </div>
        </div>
      )}

      {/* ── MILESTONES ── */}
      {activeTab === 'milestones' && (
        <div className="ref2-section">
          <div className="ref2-section-header">
            <span className="ref2-section-title">Milestone Rewards & Targets</span>
            <span className="ref2-section-hint">Unlocked dynamically as metrics grow</span>
          </div>
          
          <div className="ref2-milestones-split">
            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                👥 Referral Milestones
              </h4>
              <div className="ref2-milestones">
                {MILESTONES.map((m, i) => (
                  <div key={i} className={`ref2-milestone ${m.reached ? 'ref2-milestone--done' : ''}`}>
                    <div className="ref2-milestone-icon">
                      {m.reached ? '✓' : <span style={{ opacity: 0.4 }}>{i + 1}</span>}
                    </div>
                    <div className="ref2-milestone-body">
                      <span className="ref2-milestone-label">{m.label}</span>
                      <span className="ref2-milestone-status">{m.reached ? '🎉 Unlocked & paid' : `${m.refs - total > 0 ? m.refs - total : 0} more referrals needed`}</span>
                    </div>
                    <div className="ref2-milestone-reward" style={{ color: m.reached ? '#10b981' : 'var(--subtext)' }}>
                      {m.reward}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚡ Team Volume Milestones (40/40/20)
              </h4>
              <MilestoneProgress />
            </div>
          </div>
        </div>
      )}

      {/* ── COMMISSION RATES ── */}
      {activeTab === 'rates' && (
        <div className="ref2-section">
          <div className="ref2-section-header">
            <span className="ref2-section-title">Commission Structure</span>
            <span className="ref2-section-hint">% of trade volume</span>
          </div>
          <div className="ref2-rates">
            {LEVEL_RATES.map((r, i) => (
              <div key={i} className="ref2-rate-row" style={{ borderColor: LEVEL_COLORS[i] + '25' }}>
                <div className="ref2-rate-badge" style={{ background: LEVEL_COLORS[i] }}>L{i + 1}</div>
                <div className="ref2-rate-info">
                  <span className="ref2-rate-name" style={{ color: LEVEL_COLORS[i] }}>{LEVEL_LABELS[i]}</span>
                  <span className="ref2-rate-members">{byLevel[i]} members</span>
                </div>
                <div className="ref2-rate-nums">
                  <div className="ref2-rate-num" style={{ color: LEVEL_COLORS[i] }}>
                    {r.commission}%
                    <span className="ref2-rate-num-label">commission</span>
                  </div>
                  <div className="ref2-rate-num" style={{ color: '#10b981' }}>
                    +{r.rebate}%
                    <span className="ref2-rate-num-label">rebate</span>
                  </div>
                </div>
                <div className="ref2-rate-bar-wrap">
                  <div className="ref2-rate-bar" style={{ width: `${r.commission * 10}%`, background: LEVEL_COLORS[i] }} />
                </div>
              </div>
            ))}
          </div>
          <p className="ref2-rates-note">Rates configured by admin · Applied to trade volume · Paid monthly</p>
        </div>
      )}

      {/* ── WALLET LEDGER ── */}
      {activeTab === 'ledger' && (
        <div className="ref2-section">
          <div className="ref2-section-header">
            <span className="ref2-section-title">Wallet Ledger</span>
            <span className="ref2-section-hint">Audited transactions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transactions.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--subtext)' }}>
                No transactions recorded yet.
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32,
                      borderRadius: '50%',
                      background: tx.amount >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                      color: tx.amount >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {tx.amount >= 0 ? '↓' : '↑'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>
                        {tx.tx_type.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--subtext)' }}>
                        {new Date(tx.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: tx.amount >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {tx.amount >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 6,
                      display: 'inline-block',
                      textTransform: 'uppercase',
                      background: tx.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : tx.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: tx.status === 'completed' ? '#10b981' : tx.status === 'pending' ? '#f59e0b' : '#ef4444'
                    }}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS ── */}
      <div className="ref2-how">
        <span className="ref2-how-title">How 5-Level Referral Works</span>
        <div className="ref2-how-steps">
          {[
            { icon: '🔗', n: '01', label: 'Share your link',  sub: 'Send to traders you know' },
            { icon: '✍️', n: '02', label: 'They sign up',     sub: 'Create via your referral' },
            { icon: '💹', n: '03', label: 'They refer too',   sub: 'Build your L2+ network'  },
            { icon: '💰', n: '04', label: 'You earn deep',    sub: 'Earn through 5 levels'   },
          ].map((s, i) => (
            <div key={i} className="ref2-how-step">
              <div className="ref2-how-num">{s.n}</div>
              <div className="ref2-how-icon">{s.icon}</div>
              <span className="ref2-how-label">{s.label}</span>
              <span className="ref2-how-sub">{s.sub}</span>
              {i < 3 && <div className="ref2-how-arrow">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── SHARE MODAL (fallback) ── */}
      {shareOpen && (
        <div className="ref2-modal-overlay" onClick={() => setShareOpen(false)}>
          <div className="ref2-modal" onClick={e => e.stopPropagation()}>
            <div className="ref2-modal-header">
              <span className="ref2-modal-title">Share Your Link</span>
              <button className="ref2-modal-close" onClick={() => setShareOpen(false)}>✕</button>
            </div>
            <div className="ref2-modal-body">
              <div className="ref2-modal-url">{REFERRAL_LINK}</div>
              <button className="ref2-btn-primary ref2-modal-copy" onClick={() => { copy(REFERRAL_LINK, 'link'); setShareOpen(false); }}>
                {copied === 'link' ? '✓ Copied!' : '⎘ Copy to clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WITHDRAWAL MODAL ── */}
      {withdrawOpen && (
        <div className="ref2-modal-overlay" onClick={() => { setWithdrawOpen(false); setWithdrawStep('form'); }}>
          <div className="ref2-modal ref2-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="ref2-modal-header">
              <div>
                <span className="ref2-modal-title">Withdraw Earnings</span>
                <span className="ref2-modal-subtitle">Available: <strong style={{ color:'#10b981' }}>${wallet.available.toFixed(2)}</strong></span>
              </div>
              <button className="ref2-modal-close" onClick={() => { setWithdrawOpen(false); setWithdrawStep('form'); }}>✕</button>
            </div>

            {withdrawStep === 'form' && (
              <div className="ref2-modal-body">
                {/* Quick amount chips */}
                <div>
                  <p className="ref2-wd-label">Amount</p>
                  <div className="ref2-wd-chips">
                    {[100, 250, 500, 1000].filter(v => v <= wallet.available).map(v => (
                      <button key={v} className={`ref2-wd-chip ${withdrawAmt === String(v) ? 'ref2-wd-chip--active' : ''}`}
                        onClick={() => setWithdrawAmt(String(v))}>${v}</button>
                    ))}
                    <button className={`ref2-wd-chip ${withdrawAmt === String(Math.floor(wallet.available)) ? 'ref2-wd-chip--active' : ''}`}
                      onClick={() => setWithdrawAmt(String(Math.floor(wallet.available)))}>Max</button>
                  </div>
                  <div className="ref2-wd-input-wrap">
                    <span className="ref2-wd-prefix">$</span>
                    <input
                      className="ref2-wd-input"
                      type="number"
                      min={wallet.minWithdrawal}
                      max={wallet.available}
                      placeholder={`Min $${wallet.minWithdrawal}`}
                      value={withdrawAmt}
                      onChange={e => setWithdrawAmt(e.target.value)}
                    />
                  </div>
                </div>

                {/* Method */}
                <div>
                  <p className="ref2-wd-label">Payout Method</p>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 10
                  }}>
                    <span className="ref2-wd-method-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 8 }}>
                      <img src="https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png" alt="Crypto" width={22} height={22} style={{ borderRadius: 50, background: '#fff' }} />
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Crypto Wallet</span>
                      <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Processed automatically via NOWPayments</span>
                    </div>
                  </div>

                  {/* Crypto coin picker */}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                    {[
                      { name:'USDT (TRC-20)', slug:'usdt' },
                      { name:'USDT (ERC-20)', slug:'usdt' },
                      { name:'BTC',           slug:'btc'  },
                      { name:'ETH',           slug:'eth'  },
                      { name:'BNB',           slug:'bnb'  },
                      { name:'USDC',          slug:'usdc' },
                    ].map(coin => {
                      const active = withdrawCoin === coin.name;
                      return (
                        <button key={coin.name}
                          type="button"
                          onClick={() => setWithdrawCoin(coin.name)}
                          style={{
                            display:'flex', alignItems:'center', gap:6,
                            padding:'5px 12px 5px 6px', borderRadius:20, fontSize:11, fontWeight:700,
                            border:'1px solid', cursor:'pointer', fontFamily:'inherit',
                            background: active ? '#6366f1' : 'transparent',
                            borderColor: active ? '#6366f1' : 'var(--border)',
                            color: active ? '#fff' : 'var(--subtext)',
                            transition:'all 0.15s',
                          }}>
                          <img
                            src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin.slug}.png`}
                            alt={coin.name}
                            width={18} height={18}
                            style={{ borderRadius:50, background:'#fff', flexShrink:0 }}
                          />
                          {coin.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Address / details */}
                <div>
                  <p className="ref2-wd-label">{withdrawCoin} Wallet Address</p>
                  <input
                    className="ref2-wd-addr"
                    type="text"
                    placeholder="T..."
                    value={withdrawAddr}
                    onChange={e => setWithdrawAddr(e.target.value)}
                  />
                </div>

                {/* Fee note */}
                <div className="ref2-wd-fee">
                  <span>Network fee</span>
                  <span>$2.00</span>
                </div>

                <button
                  className="ref2-btn-primary ref2-modal-copy"
                  disabled={!withdrawAmt || Number(withdrawAmt) < wallet.minWithdrawal || !withdrawAddr}
                  onClick={() => setWithdrawStep('confirm')}>
                  Review Withdrawal
                </button>
              </div>
            )}

            {withdrawStep === 'confirm' && (
              <div className="ref2-modal-body">
                <div className="ref2-wd-summary">
                  <div className="ref2-wd-summary-row">
                    <span>Amount</span>
                    <strong style={{ color:'#10b981' }}>${Number(withdrawAmt).toFixed(2)}</strong>
                  </div>
                  <div className="ref2-wd-summary-row">
                    <span>Method</span>
                    <strong>{withdrawMethod.charAt(0).toUpperCase() + withdrawMethod.slice(1)}</strong>
                  </div>
                  <div className="ref2-wd-summary-row">
                    <span>Destination</span>
                    <strong className="ref2-wd-addr-preview">{withdrawAddr}</strong>
                  </div>
                  <div className="ref2-wd-summary-row ref2-wd-summary-total">
                    <span>You receive</span>
                    <strong style={{ color:'#10b981', fontSize:18 }}>
                      ${(Number(withdrawAmt) - (withdrawMethod === 'crypto' ? 2 : withdrawMethod === 'bank' ? 5 : 0)).toFixed(2)}
                    </strong>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="ref2-btn-secondary" style={{ flex:1 }} onClick={() => { setWithdrawStep('form'); setWithdrawError(null); }}>
                    ← Edit
                  </button>
                  <button className="ref2-btn-primary" style={{ flex:2 }}
                    disabled={withdrawing}
                    onClick={async () => {
                      setWithdrawing(true);
                      setWithdrawError(null);
                      try {
                        const res = await fetch('/api/withdrawals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'withdraw',
                            amount: Number(withdrawAmt),
                            currency: withdrawMethod === 'crypto' ? withdrawCoin : withdrawMethod,
                            address: withdrawAddr,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok || data.error) throw new Error(data.error || 'Withdrawal failed');
                        setWithdrawResult({ withdrawalId: data.withdrawalId, nowpaymentsId: data.nowpaymentsId });
                        setWithdrawStep('success');
                        fetchWallet();
                      } catch (e: any) {
                        setWithdrawError(e.message);
                      }
                      setWithdrawing(false);
                    }}>
                    {withdrawing ? '⏳ Processing…' : 'Confirm Withdrawal'}
                  </button>
                </div>
                {withdrawError && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', marginTop:4 }}>
                    <p style={{ color:'#ef4444', fontSize:12, fontWeight:700, margin:0 }}>❌ {withdrawError}</p>
                  </div>
                )}
              </div>
            )}

            {withdrawStep === 'success' && (
              <div className="ref2-modal-body ref2-wd-success">
                <div className="ref2-wd-success-icon">✓</div>
                <p className="ref2-wd-success-title">Withdrawal Submitted!</p>
                <p className="ref2-wd-success-sub">
                  ${Number(withdrawAmt).toFixed(2)} is being processed via NOWPayments.<br />
                  You'll receive it within 1–3 business days.
                </p>
                {withdrawResult?.withdrawalId && (
                  <p style={{ fontSize:11, color:'var(--subtext)', fontFamily:'monospace', margin:0 }}>
                    Ref: {withdrawResult.withdrawalId}
                  </p>
                )}
                <button className="ref2-btn-primary ref2-modal-copy"
                  onClick={() => { setWithdrawOpen(false); setWithdrawStep('form'); setWithdrawAmt(''); setWithdrawAddr(''); setWithdrawError(null); setWithdrawResult(null); }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
