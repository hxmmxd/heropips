'use client';

import React, { useState, useEffect } from 'react';
import './ReferralHub.css';

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

export default function ReferralTab({ switchTab }: ReferralTabProps) {
  const [activeTab, setActiveTab] = useState<Tab>('network');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  
  // Profile / Network / Rates / Milestones state
  const [profileData, setProfileData] = useState<any>(null);
  const [networkMembers, setNetworkMembers] = useState<any[]>([]);
  const [ratesData, setRatesData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  // Genealogy Tree State
  const [networkView, setNetworkView] = useState<'list' | 'tree'>('list');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [expandedDetailsNodes, setExpandedDetailsNodes] = useState<Record<string, boolean>>({});
  const [treeAnimKey, setTreeAnimKey] = useState(0);
  const treeTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  // Loaders
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(true);

  // Withdraw Modal State
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawCoin, setWithdrawCoin] = useState('USDT (TRC-20)');
  const [withdrawAddr, setWithdrawAddr] = useState('');
  const [withdrawStep, setWithdrawStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Share Modal State
  const [shareOpen, setShareOpen] = useState(false);

  // Ledger Filter
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'rebate' | 'referral' | 'withdrawal'>('all');

  // Fetch functions
  const fetchMilestones = async (userId: string) => {
    try {
      setLoadingMilestones(true);
      const res = await fetch(`/api/milestones?userId=${userId}`);
      const data = await res.json();
      console.log('[RH] Milestones API:', data);
      if (data.success) {
        setMilestones(data.milestones || []);
      }
    } catch (e) {
      console.error('[RH] Error fetching milestones:', e);
    } finally {
      setLoadingMilestones(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await fetch('/api/referral/profile');
      const data = await res.json();
      console.log('[RH] Profile API:', data);
      if (data.success || data.referralCode || data.id) {
        setProfileData(data);
        if (data.id) {
          fetchMilestones(data.id);
        } else {
          setLoadingMilestones(false);
        }
      } else {
        setLoadingMilestones(false);
      }
    } catch (e) {
      console.error('[RH] Error fetching profile:', e);
      setLoadingMilestones(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchNetwork = async () => {
    try {
      setLoadingNetwork(true);
      const res = await fetch('/api/referral/network');
      const data = await res.json();
      console.log('[RH] Network API:', data);
      if (data.members) {
        setNetworkMembers(data.members);
      }
    } catch (e) {
      console.error('[RH] Error fetching network:', e);
    } finally {
      setLoadingNetwork(false);
    }
  };

  const fetchRates = async () => {
    try {
      setLoadingRates(true);
      const res = await fetch('/api/referral/rates');
      const data = await res.json();
      console.log('[RH] Rates API:', data);
      if (data.success || data.levels) {
        setRatesData(data);
      }
    } catch (e) {
      console.error('[RH] Error fetching rates:', e);
    } finally {
      setLoadingRates(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch('/api/referral/analytics');
      const data = await res.json();
      console.log('[RH] Analytics API:', data);
      if (data.success || data.summary) {
        setAnalyticsData(data);
      }
    } catch (e) {
      console.error('[RH] Error fetching analytics:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchWallet = async () => {
    try {
      setLoadingWallet(true);
      const res = await fetch('/api/wallet');
      const data = await res.json();
      console.log('[RH] Wallet API:', data);
      if (data.success || data.wallet) {
        setWalletStats(data.wallet);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('[RH] Error fetching wallet:', e);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchNetwork();
    fetchRates();
    fetchAnalytics();
    fetchWallet();
  }, []);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Social Share helpers
  const getShareLink = (platform: 'telegram' | 'whatsapp' | 'twitter') => {
    const text = encodeURIComponent("Join me on TradeGPT, the best-in-class AI-powered trading platform! Sign up using my referral link:");
    const url = encodeURIComponent(profileData?.referralLink || '');
    if (platform === 'telegram') return `https://t.me/share/url?url=${url}&text=${text}`;
    if (platform === 'whatsapp') return `https://api.whatsapp.com/send?text=${text}%20${url}`;
    return `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
  };

  // Withdraw process handler
  const handleWithdrawalSubmit = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          amount: Number(withdrawAmt),
          currency: withdrawCoin.split(' ')[0], // extract symbol like USDT
          address: withdrawAddr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawStep('success');
        fetchWallet(); // refresh stats
      } else {
        setWithdrawError(data.error || 'Withdrawal request failed.');
      }
    } catch (err: any) {
      setWithdrawError(err.message || 'An error occurred during withdrawal request.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Level badge background mapping (null-safe)
  const getLevelColor = (level: any) => {
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    const idx = Math.max(0, (Number(level) || 1) - 1);
    return colors[idx % colors.length];
  };

  // Filtered transactions (null-safe)
  const filteredTxs = (transactions || []).filter(tx => {
    if (!tx || !tx.tx_type) return false;
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'rebate') return tx.tx_type === 'rebate';
    if (ledgerFilter === 'referral') return tx.tx_type === 'referral';
    if (ledgerFilter === 'withdrawal') return String(tx.tx_type).startsWith('withdrawal');
    return true;
  });

  // Genealogy Tree Constructor
  const buildGenealogyTree = () => {
    if (!networkMembers || networkMembers.length === 0) return [];
    const rootUserId = profileData?.id;

    // Create node mapping
    const nodeMap: Record<string, any> = {};
    networkMembers.forEach(m => {
      nodeMap[m.userId] = { ...m, children: [] };
    });

    const treeRoots: any[] = [];
    networkMembers.forEach(m => {
      const node = nodeMap[m.userId];
      const parentId = m.referredBy;

      // If the parent is root user, or the parent is not in our downline list
      if (!parentId || parentId === rootUserId || !nodeMap[parentId]) {
        node.level = node.level || 1;
        treeRoots.push(node);
      } else {
        nodeMap[parentId].children.push(node);
      }
    });

    // Sort by level asc, then by volume desc
    treeRoots.sort((a, b) => a.level - b.level || (b.totalVolume || 0) - (a.totalVolume || 0));
    return treeRoots;
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: any) => {
    const isCollapsed = !!collapsedNodes[node.userId];
    const isDetailsExpanded = !!expandedDetailsNodes[node.userId];
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = node.level === 0;

    const toggleCollapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCollapsedNodes(prev => ({
        ...prev,
        [node.userId]: !prev[node.userId]
      }));
    };

    const toggleDetails = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedDetailsNodes(prev => ({
        ...prev,
        [node.userId]: !prev[node.userId]
      }));
    };

    const animDelay = `${(node.level || 0) * 120}ms`;

    return (
      <li key={node.userId} className="rh-tree-li rh-tree-anim" style={{ animationDelay: animDelay }}>
        {isDetailsExpanded ? (
          /* EXPANDED DETAILS CARD */
          <div 
            className={`rh-tree-card rh-tree-level-${node.level || 0} expanded`}
            onClick={toggleDetails}
          >
            {/* Card top indicator / status */}
            <div className="rh-tree-card-header">
              <span className={`rh-tree-badge-tier tier-${node.plan || 'free'}`}>
                {(node.plan || 'free').toUpperCase()}
              </span>
              <span className="rh-tree-card-level">
                {isRoot ? 'YOU' : `L${node.level}`}
              </span>
            </div>

            {/* Node Avatar & Name */}
            <div className="rh-tree-card-body">
              <div 
                className="rh-tree-card-avatar"
                style={{ background: getLevelColor(node.level || 1) }}
              >
                {(node.displayName || '??').slice(0, 2).toUpperCase()}
              </div>
              <div className="rh-tree-card-details">
                <div className="rh-tree-card-name" title={node.displayName || 'Trader'}>
                  {node.displayName || 'Trader'}
                </div>
                <div className="rh-tree-card-stats">
                  <span>{node.tradeCount || 0} trades</span>
                  <span>·</span>
                  <span>{(Number(node.totalVolume) || 0).toFixed(1)} lots</span>
                </div>
              </div>
            </div>

            {/* Node Bottom Info */}
            <div className="rh-tree-card-footer">
              <span className="rh-tree-card-label">{isRoot ? 'Total Earned' : 'Earned From Them'}</span>
              <span className="rh-tree-card-value">${(Number(node.earnedFromThem) || 0).toFixed(2)}</span>
            </div>

            <span className="rh-tree-card-info-tip">Click to hide details</span>

            {/* Expand/Collapse Button if children exist */}
            {hasChildren && (
              <div className="rh-tree-collapse-indicator" onClick={toggleCollapse}>
                {isCollapsed ? '+' : '-'}
              </div>
            )}
          </div>
        ) : (
          /* COMPACT PILL */
          <div 
            className={`rh-tree-pill rh-tree-level-${node.level || 0} ${isCollapsed ? 'collapsed' : ''}`}
            onClick={toggleDetails}
          >
            <span className="rh-tree-pill-level" style={{ background: getLevelColor(node.level || 1) }}>
              {isRoot ? 'YOU' : `L${node.level}`}
            </span>
            <span className="rh-tree-pill-name">
              {node.displayName || 'Trader'}
            </span>
            
            {hasChildren && (
              <button 
                className="rh-tree-pill-toggle-btn"
                onClick={toggleCollapse}
              >
                {isCollapsed ? '▼' : '▲'}
              </button>
            )}
          </div>
        )}

        {hasChildren && !isCollapsed && (
          <ul>
            {node.children.map((child: any) => renderTreeNode(child))}
          </ul>
        )}
      </li>
    );
  };

  // Helper: collect all node IDs grouped by level
  const collectNodeIdsByLevel = (node: any, result: Record<number, string[]> = {}) => {
    const lvl = node.level || 0;
    if (!result[lvl]) result[lvl] = [];
    result[lvl].push(node.userId);
    if (node.children) {
      node.children.forEach((c: any) => collectNodeIdsByLevel(c, result));
    }
    return result;
  };

  // Explode-expand: progressively uncollapse levels
  const triggerExplodeExpand = React.useCallback(() => {
    // Clear any previous timers
    treeTimersRef.current.forEach(t => clearTimeout(t));
    treeTimersRef.current = [];

    const roots = buildGenealogyTree();
    const virtualRoot = {
      userId: profileData?.id || 'root',
      level: 0,
      children: roots
    };

    // Collect all IDs by level
    const byLevel = collectNodeIdsByLevel(virtualRoot);
    const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

    // First: collapse ALL nodes with children
    const allCollapsed: Record<string, boolean> = {};
    levels.forEach(lvl => {
      byLevel[lvl].forEach(id => { allCollapsed[id] = true; });
    });
    setCollapsedNodes(allCollapsed);

    // Then: uncollapse each level with staggered delay
    levels.forEach((lvl, idx) => {
      const timer = setTimeout(() => {
        setCollapsedNodes(prev => {
          const next = { ...prev };
          byLevel[lvl].forEach(id => { next[id] = false; });
          return next;
        });
      }, 300 + idx * 400); // root at 300ms, L1 at 700ms, L2 at 1100ms...
      treeTimersRef.current.push(timer);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkMembers, profileData]);

  // Trigger explode when treeAnimKey changes (user tapped Genealogy Tree)
  React.useEffect(() => {
    if (treeAnimKey > 0 && networkView === 'tree') {
      triggerExplodeExpand();
    }
    return () => {
      treeTimersRef.current.forEach(t => clearTimeout(t));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeAnimKey]);

  const renderTree = () => {
    const roots = buildGenealogyTree();
    
    // Create the virtual main root node for the current user
    const virtualRoot = {
      userId: profileData?.id || 'root',
      displayName: profileData?.displayName || 'You',
      plan: profileData?.plan || 'free',
      level: 0,
      tradeCount: walletStats?.totalLots || 0,
      earnedFromThem: walletStats?.lifetime || 0,
      totalVolume: walletStats?.totalLots || 0,
      children: roots
    };

    return (
      <div className="rh-tree-container" key={`tree-${treeAnimKey}`}>
        <ul className="rh-tree-root">
          {renderTreeNode(virtualRoot)}
        </ul>
      </div>
    );
  };

  return (
    <div className="rh-root">
      {/* ── HERO HEADER PANEL ── */}
      <div className="rh-hero">
        <div className="rh-hero-orb rh-hero-orb1" />
        <div className="rh-hero-orb rh-hero-orb2" />

        <div className="rh-hero-inner">
          <div className="rh-hero-badge">
            <span className="rh-hero-badge-dot" />
            Multilevel Partnership Network
          </div>

          <h1 className="rh-hero-title">
            Enterprise Referral Hub
          </h1>
          <p className="rh-hero-sub">
            Build your professional trading team network. Earn high-fidelity multi-level rebates up to 5 tiers deep on all downline closed positions.
          </p>

          <div className="rh-hero-code-row">
            <div className="rh-hero-code">
              <span className="rh-hero-code-label">YOUR REFERRAL CODE</span>
              <span className="rh-hero-code-val">{profileData?.referralCode || 'TGPT-ADMIN'}</span>
            </div>
            <button 
              className="rh-hero-copy"
              onClick={() => copyToClipboard(profileData?.referralCode || '', 'code')}
            >
              {copied === 'code' ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>

          <div className="rh-hero-link">
            <span>Invite Link:</span>
            <strong>{profileData?.referralLink || 'https://tradegpt.com/register?ref=TGPT-ADMIN'}</strong>
          </div>

          <div className="rh-hero-actions">
            <button 
              className="rh-hero-btn rh-hero-btn-primary"
              onClick={() => setShareOpen(true)}
            >
              Share Network Link
            </button>
            <button 
              className="rh-hero-btn rh-hero-btn-secondary"
              onClick={() => {
                copyToClipboard(profileData?.referralLink || '', 'link');
              }}
            >
              {copied === 'link' ? '✓ Link Copied' : 'Quick Copy Link'}
            </button>
          </div>

          <div className="rh-hero-network">
            {[1, 2, 3, 4, 5].map(lvl => (
              <div key={lvl} className="rh-hero-lvl">
                <span className="rh-hero-lvl-dot" style={{ background: getLevelColor(lvl) }} />
                <span className="rh-hero-lvl-lbl">L{lvl}:</span>
                <span className="rh-hero-lvl-cnt">
                  {loadingNetwork ? '...' : (networkMembers.filter(m => m.level === lvl).length)}
                </span>
              </div>
            ))}
          </div>
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

      {/* ── WALLET BALANCE & WITHDRAW CARD ── */}
      <div className="rh-wallet">
        <div className="rh-wallet-left">
          <span className="rh-wallet-eyebrow">💼 Referral Wallet</span>
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
          <button 
            className="rh-withdraw-btn"
            disabled={loadingWallet || !walletStats || walletStats.available < walletStats.minWithdrawal}
            onClick={() => {
              setWithdrawStep('form');
              setWithdrawAmt('');
              setWithdrawAddr('');
              setWithdrawOpen(true);
            }}
          >
            Withdraw Now
          </button>
          <span className="rh-wallet-min">
            Min withdrawal: ${loadingWallet ? '50' : (walletStats?.minWithdrawal || '50')}
          </span>
        </div>
      </div>

      {/* ── DYNAMIC RATE / UPGRADE PLAN CARD ── */}
      <div className={`rh-plan-card rh-plan-card-${ratesData?.userPlan || 'free'}`}>
        <div className="rh-plan-info">
          <span className="rh-plan-eyebrow">Your Earning Rate & Plan Tier</span>
          <span className="rh-plan-name">
            {ratesData?.userPlan ? ratesData.userPlan.toUpperCase() : 'FREE'} PLAN
            &nbsp;·&nbsp;
            {ratesData?.tierLabel || 'Standard'} Tier
          </span>
          <span className="rh-plan-meta">
            Plan Multiplier: <strong>{ratesData?.planMultiplier || '0.60'}x</strong>
            &nbsp;·&nbsp;
            Effective Rate: <strong>${ratesData?.effectiveRate || '1.20'}/lot</strong>
          </span>
        </div>

        <div className="rh-plan-tiers">
          {switchTab && ratesData?.userPlan !== 'enterprise' && (
            <button 
              className="rh-plan-upgrade-btn"
              onClick={() => switchTab('profile')}
            >
              Upgrade Plan &rarr;
            </button>
          )}
        </div>
      </div>

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
                onClick={() => { setNetworkView('tree'); setTreeAnimKey(k => k + 1); }}
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
              renderTree()
            ) : (
              networkMembers.map((member, idx) => (
                <div key={member.userId || idx} className="rh-member">
                  <div 
                    className="rh-member-avatar" 
                    style={{ background: getLevelColor(member.level || 1) }}
                  >
                    {(member.displayName || '??').slice(0, 2).toUpperCase()}
                  </div>
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
        <div className="rh-section-card">
          <div className="rh-section-card-header">
            <span className="rh-section-card-title">Milestone Tiers</span>
            <span className="rh-section-card-hint">40/40/20 Leg Rule Applied</span>
          </div>
          <div className="rh-section-card-body">
            {loadingMilestones ? (
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
      )}

      {/* 3. RATES TAB */}
      {activeTab === 'rates' && (
        <div className="rh-section-card">
          <div className="rh-section-card-header">
            <span className="rh-section-card-title">Multi-Level Rebate Percentages</span>
            <span className="rh-section-card-hint">Rules from global settings</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loadingRates ? (
              <div className="rh-empty">Loading rates...</div>
            ) : (
              ratesData?.levels?.map((lvl: any) => (
                <div key={lvl.level} className="rh-rate-row">
                  <div 
                    className="rh-rate-badge"
                    style={{ background: getLevelColor(lvl.level) }}
                  >
                    L{lvl.level}
                  </div>
                  <div className="rh-rate-info">
                    <span className="rh-rate-name">{lvl.label}</span>
                    <span className="rh-rate-members">
                      Commission rate: {lvl.percentage}% of closed rebate
                    </span>
                    <div className="rh-rate-bar-track">
                      <div 
                        className="rh-rate-bar" 
                        style={{ 
                          width: `${lvl.percentage}%`,
                          background: getLevelColor(lvl.level) 
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="rh-rate-pct" style={{ color: getLevelColor(lvl.level) }}>
                      {lvl.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Symbol Specific Base Rates */}
          {ratesData?.rules && ratesData.rules.length > 0 && (
            <div className="rh-symbol-rules">
              {ratesData.rules.map((rule: any, idx: number) => (
                <div key={idx} className="rh-symbol-rule">
                  <span className="rh-symbol-name">{rule.symbol}</span>
                  <span className="rh-symbol-rate">${rule.rebate_per_lot}/lot</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div className="rh-section-card">
          <div className="rh-section-card-header">
            <span className="rh-section-card-title">Transaction Ledger</span>
            <span className="rh-section-card-hint">Total filtered: {filteredTxs.length}</span>
          </div>

          <div className="rh-ledger-filters">
            {(['all', 'rebate', 'referral', 'withdrawal'] as const).map(f => (
              <button
                key={f}
                className={`rh-filter-chip ${ledgerFilter === f ? 'active' : ''}`}
                onClick={() => setLedgerFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loadingWallet ? (
              <div className="rh-empty">Loading ledger...</div>
            ) : filteredTxs.length === 0 ? (
              <div className="rh-empty">No transactions match the selected filter.</div>
            ) : (
              filteredTxs.map((tx) => (
                <div key={tx.id} className="rh-tx">
                  <div 
                    className="rh-tx-icon"
                    style={{
                      background: tx.amount >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: tx.amount >= 0 ? '#10b981' : '#ef4444'
                    }}
                  >
                    {tx.amount >= 0 ? '↓' : '↑'}
                  </div>
                  <div className="rh-tx-info">
                    <div className="rh-tx-type">{String(tx.tx_type).replace('_', ' ')}</div>
                    <div className="rh-tx-date">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    {tx.metadata?.symbol && (
                      <div className="rh-tx-tags">
                        <span className="rh-tx-tag">{tx.metadata.symbol}</span>
                        <span className="rh-tx-tag">{tx.metadata.volume} lots</span>
                        {tx.metadata.level && (
                          <span className="rh-tx-tag">L{tx.metadata.level} Referral</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span 
                      className="rh-tx-amount"
                      style={{ color: tx.amount >= 0 ? '#10b981' : '#ef4444' }}
                    >
                      {tx.amount >= 0 ? '+' : ''}${Math.abs(Number(tx.amount)).toFixed(2)}
                    </span>
                    <span className={`rh-tx-status rh-tx-status-${tx.status}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="rh-section-card">
          <div className="rh-section-card-header">
            <span className="rh-section-card-title">Earning Performance</span>
            <span className="rh-section-card-hint">Trailing 30 days statistics</span>
          </div>

          <div className="rh-analytics-grid">
            <div className="rh-an-card">
              <span className="rh-an-label">30D Income</span>
              <div className="rh-an-val">${analyticsData?.summary?.total30d?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="rh-an-card">
              <span className="rh-an-label">Rebates</span>
              <div className="rh-an-val" style={{ color: '#10b981' }}>
                ${analyticsData?.summary?.rebate30d?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="rh-an-card">
              <span className="rh-an-label">Referrals</span>
              <div className="rh-an-val" style={{ color: '#6366f1' }}>
                ${analyticsData?.summary?.referral30d?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="rh-an-card">
              <span className="rh-an-label">Lot Velocity</span>
              <div className="rh-an-val" style={{ color: '#d4a843' }}>
                {analyticsData?.summary?.dailyLotVelocity || '0.00'}
              </div>
              <span className="rh-an-sub">Lots / day average</span>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="rh-chart-wrap">
            <span className="rh-chart-title">Daily Earnings Breakdown</span>
            <div className="rh-bars">
              {analyticsData?.dailyChart?.map((day: any, idx: number) => {
                const chartList = analyticsData.dailyChart || [];
                const maxVal = Math.max(...chartList.map((d: any) => Number(d.total) || 0), 10);
                const rebPct = ((Number(day.rebate) || 0) / maxVal) * 100;
                const refPct = ((Number(day.referral) || 0) / maxVal) * 100;

                return (
                  <div 
                    key={idx} 
                    className="rh-bar-col"
                    title={`${day.date}: Rebate $${day.rebate.toFixed(2)}, Referral $${day.referral.toFixed(2)}`}
                  >
                    <div className="rh-bar-stack">
                      <div 
                        className="rh-bar-seg" 
                        style={{ height: `${refPct}%`, background: '#6366f1' }}
                      />
                      <div 
                        className="rh-bar-seg" 
                        style={{ height: `${rebPct}%`, background: '#10b981' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rh-chart-legend">
              <div className="rh-legend-item">
                <span className="rh-legend-dot" style={{ background: '#10b981' }} />
                Personal Rebates
              </div>
              <div className="rh-legend-item">
                <span className="rh-legend-dot" style={{ background: '#6366f1' }} />
                Referral Commission
              </div>
            </div>
          </div>

          {/* Top Performers */}
          {analyticsData?.topEarners && analyticsData.topEarners.length > 0 && (
            <div className="rh-earners">
              <span className="rh-chart-title">Top Contributing Referrals</span>
              {(analyticsData.topEarners || []).map((earner: any) => {
                const earnersList = analyticsData.topEarners || [];
                const maxEarned = Math.max(...earnersList.map((e: any) => Number(e.earned) || 0), 1);
                const widthPct = ((Number(earner.earned) || 0) / maxEarned) * 100;
                return (
                  <div key={earner.rank} className="rh-earner-row">
                    <span className="rh-earner-rank">#{earner.rank}</span>
                    <div className="rh-earner-bar">
                      <div 
                        className="rh-earner-fill" 
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="rh-earner-earned">${earner.earned.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── HOW IT WORKS ── */}
      <div className="rh-how">
        <span className="rh-how-title">How the 5-Level Referral Tree Works</span>
        <div className="rh-how-steps">
          <div className="rh-how-step">
            <span className="rh-how-n">01</span>
            <div className="rh-how-icon">🔗</div>
            <span className="rh-how-label">Share link</span>
            <span className="rh-how-sub">Copy and post your unique referral code.</span>
          </div>
          <div className="rh-how-step">
            <span className="rh-how-n">02</span>
            <div className="rh-how-icon">🤝</div>
            <span className="rh-how-label">Traders join</span>
            <span className="rh-how-sub">Your invitees connect MetaAPI broker accounts.</span>
          </div>
          <div className="rh-how-step">
            <span className="rh-how-n">03</span>
            <div className="rh-how-icon">📈</div>
            <span className="rh-how-label">Team trades</span>
            <span className="rh-how-sub">Lots closed in their network generate commission.</span>
          </div>
          <div className="rh-how-step">
            <span className="rh-how-n">04</span>
            <div className="rh-how-icon">💰</div>
            <span className="rh-how-label">Get paid</span>
            <span className="rh-how-sub">Earnings roll up instantly to your wallet.</span>
          </div>
        </div>
      </div>

      {/* ── SHARE MODAL ── */}
      {shareOpen && (
        <div className="rh-modal-overlay" onClick={() => setShareOpen(false)}>
          <div className="rh-modal" onClick={e => e.stopPropagation()}>
            <div className="rh-modal-header">
              <div>
                <span className="rh-modal-title">Share Referral Code</span>
                <span className="rh-modal-sub">Earn on their closed trade volume</span>
              </div>
              <button className="rh-modal-close" onClick={() => setShareOpen(false)}>✕</button>
            </div>
            
            <div className="rh-share-grid">
              <a 
                href={getShareLink('telegram')} 
                target="_blank" 
                rel="noreferrer" 
                className="rh-share-btn"
              >
                <span className="rh-share-icon">✈️</span>
                <span className="rh-share-label">Telegram</span>
              </a>
              <a 
                href={getShareLink('whatsapp')} 
                target="_blank" 
                rel="noreferrer" 
                className="rh-share-btn"
              >
                <span className="rh-share-icon">💬</span>
                <span className="rh-share-label">WhatsApp</span>
              </a>
              <a 
                href={getShareLink('twitter')} 
                target="_blank" 
                rel="noreferrer" 
                className="rh-share-btn"
              >
                <span className="rh-share-icon">🐦</span>
                <span className="rh-share-label">Twitter</span>
              </a>
            </div>

            <div className="rh-share-url">
              {profileData?.referralLink || ''}
            </div>

            <button 
              className="rh-btn rh-btn-secondary"
              onClick={() => {
                copyToClipboard(profileData?.referralLink || '', 'link');
                setShareOpen(false);
              }}
            >
              Copy to clipboard
            </button>
          </div>
        </div>
      )}

      {/* ── WITHDRAWAL MODAL ── */}
      {withdrawOpen && (
        <div className="rh-modal-overlay" onClick={() => !withdrawing && setWithdrawOpen(false)}>
          <div className="rh-modal" onClick={e => e.stopPropagation()}>
            <div className="rh-modal-header">
              <div>
                <span className="rh-modal-title">Withdraw Referral Wallet</span>
                <span className="rh-modal-sub">
                  Available: <strong style={{ color: '#10b981' }}>${walletStats?.available?.toFixed(2) || '0.00'}</strong>
                </span>
              </div>
              <button 
                className="rh-modal-close" 
                disabled={withdrawing} 
                onClick={() => setWithdrawOpen(false)}
              >
                ✕
              </button>
            </div>

            {withdrawStep === 'form' && (
              <>
                <div>
                  <span className="rh-wd-label">Payout Amount</span>
                  <div className="rh-wd-chips">
                    {[50, 100, 250, 500].filter(v => v <= (walletStats?.available || 0)).map(v => (
                      <button 
                        key={v} 
                        className={`rh-wd-chip ${Number(withdrawAmt) === v ? 'active' : ''}`}
                        onClick={() => setWithdrawAmt(String(v))}
                      >
                        ${v}
                      </button>
                    ))}
                    <button 
                      className={`rh-wd-chip ${Number(withdrawAmt) === Math.floor(walletStats?.available || 0) ? 'active' : ''}`}
                      onClick={() => setWithdrawAmt(String(Math.floor(walletStats?.available || 0)))}
                    >
                      Max
                    </button>
                  </div>
                  <div className="rh-wd-input-wrap">
                    <span className="rh-wd-prefix">$</span>
                    <input 
                      type="number"
                      className="rh-wd-input"
                      placeholder="0.00"
                      min={walletStats?.minWithdrawal || 50}
                      max={walletStats?.available || 0}
                      value={withdrawAmt}
                      onChange={e => setWithdrawAmt(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <span className="rh-wd-label">Select Payout Cryptocurrency</span>
                  <div className="rh-wd-coins">
                    {[
                      { name: 'USDT (TRC-20)', slug: 'usdt' },
                      { name: 'USDT (ERC-20)', slug: 'usdt' },
                      { name: 'BTC', slug: 'btc' },
                      { name: 'ETH', slug: 'eth' }
                    ].map(coin => (
                      <button
                        key={coin.name}
                        className={`rh-wd-coin ${withdrawCoin === coin.name ? 'active' : ''}`}
                        onClick={() => setWithdrawCoin(coin.name)}
                      >
                        <img 
                          src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coin.slug}.png`}
                          alt={coin.name}
                          width={14}
                          height={14}
                        />
                        {coin.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="rh-wd-label">{withdrawCoin} Wallet Address</span>
                  <input 
                    type="text" 
                    className="rh-wd-addr"
                    placeholder="Enter wallet address"
                    value={withdrawAddr}
                    onChange={e => setWithdrawAddr(e.target.value)}
                  />
                </div>

                <div className="rh-wd-fee">
                  <span>Estimated network gas fee:</span>
                  <span>$2.00</span>
                </div>

                {withdrawError && (
                  <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>
                    {withdrawError}
                  </div>
                )}

                <button 
                  className="rh-btn rh-btn-primary"
                  disabled={!withdrawAmt || Number(withdrawAmt) < (walletStats?.minWithdrawal || 50) || !withdrawAddr}
                  onClick={() => setWithdrawStep('confirm')}
                >
                  Review Request &rarr;
                </button>
              </>
            )}

            {withdrawStep === 'confirm' && (
              <>
                <div className="rh-wd-summary">
                  <div className="rh-wd-row">
                    <span>Requested Amount:</span>
                    <span>${Number(withdrawAmt).toFixed(2)}</span>
                  </div>
                  <div className="rh-wd-row">
                    <span>Currency:</span>
                    <span>{withdrawCoin}</span>
                  </div>
                  <div className="rh-wd-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <span>Destination Address:</span>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--subtext)' }}>
                      {withdrawAddr}
                    </span>
                  </div>
                  <div className="rh-wd-row">
                    <span>You Receive:</span>
                    <strong style={{ color: '#10b981' }}>
                      ${(Number(withdrawAmt) - 2.00).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {withdrawError && (
                  <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>
                    {withdrawError}
                  </div>
                )}

                <div className="rh-btn-row">
                  <button 
                    className="rh-btn rh-btn-secondary"
                    disabled={withdrawing}
                    onClick={() => {
                      setWithdrawStep('form');
                      setWithdrawError(null);
                    }}
                  >
                    Back
                  </button>
                  <button 
                    className="rh-btn rh-btn-primary"
                    disabled={withdrawing}
                    onClick={handleWithdrawalSubmit}
                  >
                    {withdrawing ? <span className="rh-spinner" /> : 'Confirm Payout'}
                  </button>
                </div>
              </>
            )}

            {withdrawStep === 'success' && (
              <div className="rh-success">
                <span className="rh-success-icon">🎉</span>
                <span className="rh-success-title">Withdrawal Requested</span>
                <span className="rh-success-sub">
                  Your payout request of <strong>${Number(withdrawAmt).toFixed(2)}</strong> has been successfully placed. Our compliance team will audit and process the payout within 24 hours.
                </span>
                <button 
                  className="rh-btn rh-btn-primary" 
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={() => setWithdrawOpen(false)}
                >
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
