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
  level?: number;
  children?: Partner[];
}

interface ReferralTabProps {
  partners?: Partner[];
}

const LEVEL_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899'];
const LEVEL_LABELS = ['Direct','Level 2','Level 3','Level 4','Level 5'];

const LEVEL_RATES = [
  { commission: 10, rebate: 5  },
  { commission: 5,  rebate: 2  },
  { commission: 3,  rebate: 1  },
  { commission: 2,  rebate: 0.5},
  { commission: 1,  rebate: 0.25},
];

const mockNetwork: Partner[] = [
  { name: 'Alpha_Quant', portfolio: '42,481', rebate: '622', commission: '124', status: 'Active', joined: 'May 12', trades: 84, level: 1,
    children: [
      { name: 'Quant_Sub1', portfolio: '12,000', rebate: '88', commission: '17', status: 'Active', joined: 'May 15', trades: 28, level: 2,
        children: [
          { name: 'Sub1_Child', portfolio: '5,400', rebate: '32', commission: '6', status: 'Active', joined: 'May 20', trades: 11, level: 3,
            children: [
              { name: 'Deep_Trader', portfolio: '2,100', rebate: '12', commission: '2', status: 'Active', joined: 'May 22', trades: 4, level: 4,
                children: [
                  { name: 'Ultra_Deep', portfolio: '800', rebate: '4', commission: '0.8', status: 'Inactive', joined: 'May 28', trades: 1, level: 5 },
                ]
              },
            ]
          },
        ]
      },
    ]
  },
  { name: 'Institutional_Void', portfolio: '540,200', rebate: '4,240', commission: '848', status: 'Active', joined: 'Apr 10', trades: 612, level: 1,
    children: [
      { name: 'Void_Sub', portfolio: '28,000', rebate: '198', commission: '40', status: 'Active', joined: 'Apr 18', trades: 74, level: 2 },
    ]
  },
  { name: 'Scalp_Hunter', portfolio: '89,120', rebate: '1,142', commission: '228', status: 'Active', joined: 'Apr 29', trades: 210, level: 1 },
  { name: 'Retail_King', portfolio: '12,400', rebate: '88', commission: '17', status: 'Active', joined: 'May 18', trades: 31, level: 1 },
  { name: 'FX_Nomad', portfolio: '8,800', rebate: '44', commission: '8', status: 'Inactive', joined: 'May 25', trades: 12, level: 1 },
];

const milestones = [
  { label: '1st Referral',  reward: '$25',    refs: 1,  reached: true  },
  { label: '5 Referrals',   reward: '$100',   refs: 5,  reached: true  },
  { label: '10 Referrals',  reward: '$250',   refs: 10, reached: false },
  { label: '25 Referrals',  reward: '$750',   refs: 25, reached: false },
  { label: '50 Referrals',  reward: '$2,000', refs: 50, reached: false },
];

const REFERRAL_CODE = 'TGPT-U82910';
const REFERRAL_LINK = 'tradegpt.ai/r/u82910';

function countAll(nodes: Partner[]): { total: number; byLevel: number[] } {
  const byLevel = [0,0,0,0,0];
  function walk(p: Partner) {
    const lvl = (p.level ?? 1) - 1;
    if (lvl >= 0 && lvl < 5) byLevel[lvl]++;
    p.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return { total: byLevel.reduce((a,b)=>a+b,0), byLevel };
}

function NetworkNode({ partner, depth = 0 }: { partner: Partner; depth?: number }) {
  const [open, setOpen] = useState(depth === 0);
  const lvlIdx = (partner.level ?? 1) - 1;
  const color = LEVEL_COLORS[lvlIdx];
  const hasChildren = (partner.children?.length ?? 0) > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0, borderLeft: depth > 0 ? `2px solid ${color}22` : 'none', paddingLeft: depth > 0 ? 16 : 0, marginTop: 8 }}>
      <div className="ref-net-node" onClick={() => hasChildren && setOpen(!open)}
        style={{ borderColor: open && hasChildren ? color + '44' : undefined, cursor: hasChildren ? 'pointer' : 'default' }}>
        <div className="ref-net-badge" style={{ background: color }}>L{partner.level}</div>
        <div className="ref-net-avatar" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
          {partner.name.slice(0,2).toUpperCase()}
        </div>
        <div className="ref-net-info">
          <span className="ref-net-name">{partner.name}</span>
          <span className="ref-net-meta">{LEVEL_LABELS[lvlIdx]} · {partner.trades} trades · joined {partner.joined}</span>
        </div>
        <div className="ref-net-right">
          <span className="ref-net-rebate" style={{ color: '#10b981' }}>+${partner.rebate}</span>
          <span className={`ref-partner-status ${partner.status === 'Active' ? 'ref-status--active' : 'ref-status--inactive'}`}>{partner.status}</span>
          {hasChildren && (
            <span style={{ fontSize:10, color: color, fontWeight:700, background:`${color}15`, padding:'2px 7px', borderRadius:6 }}>
              {open ? '▲' : `▼ ${partner.children!.length}`}
            </span>
          )}
        </div>
      </div>
      {open && hasChildren && partner.children!.map((child, i) => (
        <NetworkNode key={i} partner={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ReferralTab({ partners = mockNetwork }: ReferralTabProps) {
  const [copied, setCopied] = useState<'code'|'link'|null>(null);
  const [activeTab, setActiveTab] = useState<'network'|'milestones'|'rates'>('network');

  const copy = (text: string, type: 'code'|'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const { total, byLevel } = countAll(partners);
  const progressToNext = (total / 10) * 100;

  return (
    <div className="referral-root">

      {/* Hero */}
      <div className="ref-hero">
        <div className="ref-hero-glow" />
        <div className="ref-hero-badge">🎁 Referral Hub</div>
        <h1 className="ref-hero-title">Earn While Your Network Trades</h1>
        <p className="ref-hero-sub">5-level deep commission structure. Earn on every trade your network makes — forever.</p>
      </div>

      {/* Stats */}
      <div className="ref-stats">
        <div className="ref-stat">
          <span className="ref-stat-label">Total Rebates</span>
          <span className="ref-stat-value green">$4,820</span>
          <span className="ref-stat-sub">↑ 12.4% this month</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-label">Commissions</span>
          <span className="ref-stat-value">$1,240</span>
          <span className="ref-stat-sub">↑ 8.1% this month</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-label">Network Size</span>
          <span className="ref-stat-value blue">{total}</span>
          <span className="ref-stat-sub">Across {byLevel.filter(Boolean).length} levels</span>
        </div>
        <div className="ref-stat">
          <span className="ref-stat-label">Network Volume</span>
          <span className="ref-stat-value purple">$1.2M</span>
          <span className="ref-stat-sub">Combined portfolio</span>
        </div>
      </div>

      {/* Level breakdown */}
      <div style={{ padding:'0 40px 20px', display:'flex', gap:8 }}>
        {LEVEL_RATES.map((r, i) => (
          <div key={i} style={{ flex:1, background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 10px', textAlign:'center' }}>
            <div style={{ width:28, height:28, borderRadius:7, background:LEVEL_COLORS[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', margin:'0 auto 8px' }}>L{i+1}</div>
            <p style={{ fontSize:16, fontWeight:800, color:LEVEL_COLORS[i] }}>{r.commission}%</p>
            <p style={{ fontSize:10, color:'#10b981', fontWeight:700 }}>+{r.rebate}% rebate</p>
            <p style={{ fontSize:10, color:'var(--subtext)', marginTop:2 }}>{byLevel[i]} members</p>
          </div>
        ))}
      </div>

      {/* Invite Card */}
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
            <button className="ref-copy-btn" onClick={() => copy(REFERRAL_CODE,'code')}>{copied==='code'?'✓':'⎘'}</button>
          </div>
          <button className="ref-copy-link-btn" onClick={() => copy(REFERRAL_LINK,'link')}>{copied==='link'?'✓ Copied!':'Copy Link'}</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="ref-milestone-bar-card">
        <div className="ref-milestone-bar-top">
          <span className="ref-milestone-bar-label">Progress to next milestone</span>
          <span className="ref-milestone-bar-sub">{total} / 10 referrals · $250 reward</span>
        </div>
        <div className="ref-progress-track">
          <div className="ref-progress-fill" style={{ width:`${Math.min(progressToNext,100)}%` }} />
          <div className="ref-progress-thumb" style={{ left:`${Math.min(progressToNext,100)}%` }} />
        </div>
        <div className="ref-progress-labels"><span>0</span><span>5</span><span>10 🎯</span></div>
      </div>

      {/* Tabs */}
      <div className="ref-tabs-header">
        {([['network','🌐 Network Tree'],['milestones','🏆 Milestones'],['rates','📊 Commission Rates']] as const).map(([id,label]) => (
          <button key={id} className={`ref-tab-btn ${activeTab===id?'ref-tab-btn--active':''}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {/* Network Tree */}
      {activeTab === 'network' && (
        <div style={{ padding:'0 40px' }}>
          {partners.map((p, i) => <NetworkNode key={i} partner={p} />)}
        </div>
      )}

      {/* Milestones */}
      {activeTab === 'milestones' && (
        <div className="ref-milestones">
          {milestones.map((m, i) => (
            <div key={i} className={`ref-milestone ${m.reached?'ref-milestone--reached':''}`}>
              <div className="ref-milestone-check">{m.reached?'✓':i+1}</div>
              <div className="ref-milestone-info">
                <span className="ref-milestone-title">{m.label}</span>
                <span className="ref-milestone-sub">{m.reached?'Unlocked ✓':'Locked'}</span>
              </div>
              <div className="ref-milestone-reward">{m.reward}</div>
            </div>
          ))}
        </div>
      )}

      {/* Commission Rates */}
      {activeTab === 'rates' && (
        <div style={{ padding:'0 40px', display:'flex', flexDirection:'column', gap:10 }}>
          {LEVEL_RATES.map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 22px', background:'var(--sidebar-bg)', border:`1px solid ${LEVEL_COLORS[i]}33`, borderRadius:14 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:LEVEL_COLORS[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>L{i+1}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{LEVEL_LABELS[i]}</p>
                <p style={{ fontSize:11, color:'var(--subtext)' }}>{byLevel[i]} members in your network</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:18, fontWeight:800, color:LEVEL_COLORS[i] }}>{r.commission}% commission</p>
                <p style={{ fontSize:12, color:'#10b981', fontWeight:700 }}>+{r.rebate}% rebate on their trades</p>
              </div>
            </div>
          ))}
          <p style={{ fontSize:11, color:'var(--subtext)', textAlign:'center', padding:'8px 0' }}>Commission rates set by admin · Rates are of trade volume</p>
        </div>
      )}

      {/* How it works */}
      <div className="ref-how">
        <p className="ref-how-title">How 5-Level Referral Works</p>
        <div className="ref-how-steps">
          {[
            { icon:'🔗', label:'Share link',     sub:'Send to traders you know' },
            { icon:'📋', label:'They sign up',   sub:'Joins via your link' },
            { icon:'💹', label:'They refer too', sub:'Their referrals = your L2' },
            { icon:'💰', label:'You earn deep',  sub:'Earn through 5 levels' },
          ].map((s,i) => (
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
