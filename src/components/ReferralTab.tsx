'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { getMemojiForName } from '@/lib/avatar';
import { useReferralData } from '@/hooks/useReferralData';

// Sub-components
import GenealogyTree from './referral/GenealogyTree';
import WithdrawModal from './referral/WithdrawModal';
import SocialShareModal from './referral/SocialShareModal';
import MilestonesTab from './referral/MilestonesTab';
import RatesTab from './referral/RatesTab';
import LedgerTab from './referral/LedgerTab';
import AnalyticsTab from './referral/AnalyticsTab';

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
  switchTab?: (tab: string) => void;
}

type Tab = 'network' | 'milestones' | 'rates' | 'ledger' | 'analytics';

const getLevelColor = (level: any) => {
  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
  const idx = Math.max(0, (Number(level) || 1) - 1);
  return colors[idx % colors.length];
};

export default function ReferralTab({ switchTab }: ReferralTabProps) {
  const [activeTab, setActiveTab] = useState<Tab>('network');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // View toggles
  const [networkView, setNetworkView] = useState<'list' | 'tree'>('list');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const {
    profileData,
    networkMembers,
    ratesData,
    analyticsData,
    walletStats,
    transactions,
    milestones,
    loadingProfile,
    loadingNetwork,
    loadingRates,
    loadingAnalytics,
    loadingWallet,
    loadingMilestones,
    isLoadingAll,
    refreshWallet,
  } = useReferralData();

  const plan = ratesData?.userPlan || profileData?.plan || 'free';
  const isFree = plan === 'free' || plan === 'starter';

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="rh-root">
      {/* ── WALLET BALANCE & WITHDRAW CARD ── */}
      <div className="rh-wallet">
        {/* Ambient background glow */}
        <div className="rh-wallet-glow" />

        <div className="rh-wallet-left">
          <div className="rh-wallet-eyebrow-box">
            <span className="rh-wallet-dot" />
            <span className="rh-wallet-eyebrow">Referral Wallet</span>
          </div>

          <div className="rh-wallet-balance">
            <span className="rh-wallet-currency">$</span>
            <span className="rh-wallet-amount">
              {loadingWallet ? '...' : (walletStats?.available?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00')}
            </span>
          </div>

          <div className="rh-wallet-pills">
            <span className="rh-wallet-pill rh-wallet-pill-pending">
              ⏳ ${loadingWallet ? '...' : (walletStats?.pending?.toFixed(2) || '0.00')} pending
            </span>
            <span className="rh-wallet-pill rh-wallet-pill-lifetime">
              🏆 ${loadingWallet ? '...' : (walletStats?.lifetime?.toFixed(2) || '0.00')} lifetime
            </span>
          </div>
        </div>

        <div className="rh-wallet-right">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rh-withdraw-btn"
            disabled={isFree || loadingWallet || !walletStats || walletStats.available < walletStats.minWithdrawal}
            onClick={() => setWithdrawOpen(true)}
            style={isFree ? { opacity: 0.65, cursor: 'not-allowed', background: '#334155', color: '#94a3b8', border: '1px solid #475569', boxShadow: 'none' } : {}}
          >
            {isFree ? 'Withdraw Locked 🔒' : 'Withdraw Now'}
          </motion.button>
          <span className="rh-wallet-min">
            ⚡ Min withdrawal: ${loadingWallet ? '50' : (walletStats?.minWithdrawal || '50')}
          </span>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="rh-stats">
        <div className="rh-stat">
          <span className="rh-stat-icon">👥</span>
          <span className="rh-stat-label">Direct Team</span>
          <span className="rh-stat-value">
            {loadingNetwork ? '...' : networkMembers.filter(m => m.level === 1).length}
          </span>
          <span className="rh-stat-sub">Level 1 referrals</span>
        </div>

        <div className="rh-stat">
          <span className="rh-stat-icon">🕸️</span>
          <span className="rh-stat-label">Total Network</span>
          <span className="rh-stat-value">
            {loadingNetwork ? '...' : networkMembers.length}
          </span>
          <span className="rh-stat-sub">Descendants (L1 - L5)</span>
        </div>

        <div className="rh-stat">
          <span className="rh-stat-icon">💰</span>
          <span className="rh-stat-label">Total Earned</span>
          <span className="rh-stat-value">
            ${loadingWallet ? '...' : (walletStats?.lifetime?.toFixed(2) || '0.00')}
          </span>
          <span className="rh-stat-sub">Lifetime earnings</span>
        </div>

        <div className="rh-stat">
          <span className="rh-stat-icon">📊</span>
          <span className="rh-stat-label">Volume Traded</span>
          <span className="rh-stat-value">
            {loadingWallet ? '...' : (walletStats?.totalLots?.toFixed(2) || '0.00')}
          </span>
          <span className="rh-stat-sub">Your closed volume</span>
        </div>
      </div>

      {/* ── HERO HEADER PANEL — REDESIGNED ── */}
      <div className="rh-hero">
        <div className="rh-hero-orb rh-hero-orb1" />
        <div className="rh-hero-orb rh-hero-orb2" />
        <div className="rh-hero-orb rh-hero-orb3" />

        <div className="rh-hero-inner">
          {/* Badge */}
          <div className="rh-hero-badge">
            <span className="rh-hero-badge-dot" />
            Multilevel Partnership Network
          </div>

          {/* Two-column layout */}
          <div className="rh-hero-layout">
            {/* LEFT: info + code + actions */}
            <div className="rh-hero-left">
              <h1 className="rh-hero-title">Enterprise Referral Hub</h1>
              <p className="rh-hero-sub">
                Earn up to <strong style={{ color: '#d4a843' }}>5-tier deep rebates</strong> on all downline closed positions across your trading network.
              </p>

              {/* Level dots */}
              <div className="rh-hero-network">
                {[1, 2, 3, 4, 5].map(lvl => (
                  <div key={lvl} className="rh-hero-lvl">
                    <span className="rh-hero-lvl-dot" style={{ background: getLevelColor(lvl) }} />
                    <span className="rh-hero-lvl-lbl">L{lvl}:</span>
                    <span className="rh-hero-lvl-cnt">
                      {loadingNetwork ? '·' : networkMembers.filter(m => m.level === lvl).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR CODE CARD — High-End Glassmorphic Card ── */}
      <div className="rh-qr-card">
        {/* Decorative background glow orbs */}
        <div className="rh-qr-card-glow-amber" />
        <div className="rh-qr-card-glow-indigo" />

        <div className="rh-qr-card-inner">
          {/* QR Code Container */}
          <div className="rh-qr-card-frame-wrapper">
            <div className="rh-qr-card-frame">
              <QRCodeSVG
                value={profileData?.referralLink || 'https://tradegpt.ai/r/tgpt-admin'}
                size={160}
                bgColor="#ffffff"
                fgColor="#0a0e17"
                level="H"
                style={{ display: 'block' }}
              />
            </div>
          </div>

          {/* Badge */}
          <div className="rh-qr-card-badge">
            <span className="rh-qr-card-badge-dot" />
            Instant Partner Onboarding
          </div>

          {/* Title */}
          <h3 className="rh-qr-card-title">Scan to Join Network</h3>

          {/* Subtitle */}
          <p className="rh-qr-card-sub">
            Share this QR code anywhere — social media, messages, or printed materials. Anyone who scans it will be linked directly to your referral network.
          </p>

          {/* Link Box */}
          <div 
            className="rh-qr-card-link-box"
            onClick={() => copyToClipboard(profileData?.referralLink || '', 'link')}
            title="Click to copy invite link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span className="rh-qr-card-link-url">
              tradegpt.ai/r/<strong className="rh-qr-card-link-bold">{(profileData?.referralCode || 'TGPT-ADMIN').toLowerCase()}</strong>
            </span>
            <span className="rh-qr-card-link-copy-icon">
              {copied === 'link' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="rh-qr-card-actions">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`rh-qr-card-primary-btn ${copied === 'link' ? 'copied' : ''}`}
              onClick={() => copyToClipboard(profileData?.referralLink || '', 'link')}
            >
              {copied === 'link' ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Link Copied!</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Invite Link</>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rh-qr-card-secondary-btn"
              onClick={() => setShareOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Network
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── COMPACT INSTITUTIONAL PLAN STATUS CARD ── */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
      >
        {/* Left border accent */}
        <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${isFree ? 'bg-amber-500' : 'bg-emerald-500'} opacity-90`} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          {/* Status icon container */}
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 relative shadow-inner ${
            isFree 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
          }`}>
            {isFree ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </>
            )}
          </div>

          {/* Telemetry info */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                {ratesData?.userPlan ? ratesData.userPlan.toUpperCase() : 'FREE'} PLAN &middot; {ratesData?.tierLabel || 'Standard'} Execution
              </span>
              {isFree ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/25 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Wallet Locked
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Withdrawals Active
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--subtext)] font-mono">
              <span>Rate: <strong className="text-[var(--text)] font-bold">${ratesData?.effectiveRate || '1.20'}/lot</strong></span>
              <span className="opacity-30">&bull;</span>
              <span>Multiplier: <strong className="text-[var(--text)] font-bold">{ratesData?.planMultiplier || '0.60'}x</strong></span>
              <span className="opacity-30">&bull;</span>
              <span>Node Connection: <strong className="text-[var(--text)] font-bold">1 Max</strong></span>
              {isFree && (
                <>
                  <span className="opacity-30">&bull;</span>
                  <span className="text-amber-500/90 font-semibold">Upgrade to Pro to unlock assets & payouts</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Button — Only shown if user is on Free / Starter plan */}
        {switchTab && isFree && (
          <div className="shrink-0 flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => switchTab('subscription')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-150 shadow-[0_4px_14px_rgba(245,158,11,0.25)] cursor-pointer"
            >
              Activate Premium
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ── TAB SELECTOR ── */}
      <div className="rh-tabs">
        {(['network', 'milestones', 'rates', 'ledger', 'analytics'] as Tab[]).map(t => (
          <button
            key={t}
            className={`rh-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            <span className="rh-tab-label">
              {t === 'network' && <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Network</>}
              {t === 'milestones' && <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> Milestones</>}
              {t === 'rates' && <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Rates</>}
              {t === 'ledger' && <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Ledger</>}
              {t === 'analytics' && <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Analytics</>}
            </span>
          </button>
        ))}
      </div>

      {/* ── TAB CONTENTS ── */}

      {/* 1. NETWORK TAB */}
      {activeTab === 'network' && (
        <div className="rh-section-card">
          <div className="rh-section-card-header">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="rh-section-card-title">Team Network</span>
              <span className="rh-section-card-hint">Total: {networkMembers.length} members</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--input-bg)', padding: 4, borderRadius: 8 }}>
              <button 
                onClick={() => setNetworkView('list')}
                className={`rh-filter-chip ${networkView === 'list' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 10, border: 'none', margin: 0 }}
              >
                List View
              </button>
              <button 
                onClick={() => setNetworkView('tree')}
                className={`rh-filter-chip ${networkView === 'tree' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: 10, border: 'none', margin: 0 }}
              >
                Genealogy Tree
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loadingNetwork ? (
              <div className="rh-empty">Loading network members...</div>
            ) : networkMembers.length === 0 ? (
              <div className="rh-empty">
                <div className="rh-empty-icon">👥</div>
                <div className="rh-empty-text">No team members referred yet. Copy your link to start building.</div>
              </div>
            ) : networkView === 'tree' ? (
              <GenealogyTree 
                networkMembers={networkMembers}
                profileData={profileData}
                walletStats={walletStats}
              />
            ) : (
              networkMembers.map((member, idx) => (
                <div key={member.userId || idx} className="rh-member">
                  <img 
                    src={getMemojiForName(member.displayName || member.userId)}
                    alt=""
                    className="rh-member-avatar" 
                    style={{ background: getLevelColor(member.level || 1) }}
                  />
                  <div className="rh-member-info">
                    <div className="rh-member-name">{member.displayName || 'Trader'}</div>
                    <div className="rh-member-meta">
                      Level {member.level || '?'} &nbsp;·&nbsp; {(member.plan || 'free').toUpperCase()} &nbsp;·&nbsp; {member.tradeCount || 0} trades
                    </div>
                  </div>
                  <div className="rh-member-right">
                    <span className="rh-member-earned">+${(Number(member.earnedFromThem) || 0).toFixed(2)}</span>
                    <span className="rh-member-vol">{(Number(member.totalVolume) || 0).toFixed(2)} lots</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. MILESTONES TAB */}
      {activeTab === 'milestones' && (
        <MilestonesTab milestones={milestones} loading={loadingMilestones} />
      )}

      {/* 3. RATES TAB */}
      {activeTab === 'rates' && (
        <RatesTab ratesData={ratesData} loading={loadingRates} />
      )}

      {/* 4. LEDGER TAB */}
      {activeTab === 'ledger' && (
        <LedgerTab transactions={transactions} loading={loadingWallet} />
      )}

      {/* 5. ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <AnalyticsTab analyticsData={analyticsData} loading={loadingAnalytics} />
      )}

      {/* ── SOCIAL SHARE MODAL ── */}
      <SocialShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        referralLink={profileData?.referralLink || ''}
      />

      {/* ── WITHDRAWAL MODAL ── */}
      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={walletStats?.available || 0}
        minWithdrawal={walletStats?.minWithdrawal || 50}
        onSuccess={refreshWallet}
      />
    </div>
  );
}
