'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AccountInfo, Position, RiskStats, ClosedDeal } from '@/types';

interface ManagerReportsProps {
  accountInfo: AccountInfo;
  positions: Position[];
  activeBrokerId: string;
}

interface BrokerAccount {
  id: string;
  name: string;
  login: string;
  server: string;
  balance: number;
  equity: number;
  pnl: number;
  status: string;
}

const emptyStats: RiskStats = {
  netProfit: 0, totalVolume: 0, winRate: 0, wins: 0, losses: 0,
  avgWin: 0, avgLoss: 0, bestTrade: 0, worstTrade: 0,
  maxWinStreak: 0, maxLossStreak: 0, totalCommission: 0, totalSwap: 0,
  profitFactor: 0, expectancy: 0, sharpe: 0, sortino: 0,
  maxDrawdown: 0, recoveryFactor: 0, avgTrade: 0, samples: 0,
};

function fmt(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ManagerReports({ accountInfo, positions, activeBrokerId }: ManagerReportsProps) {
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [stats, setStats] = useState<RiskStats>(emptyStats);
  const [deals, setDeals] = useState<ClosedDeal[]>([]);
  const [previewReady, setPreviewReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/broker');
        const data = await res.json();
        const list = data.brokers || data || [];
        if (Array.isArray(list) && list.length > 0) {
          setAccounts(list.map((b: any) => ({
            id: b.id || b.login || b.acc || '',
            name: b.name || b.server || 'Account',
            login: b.login || '',
            server: b.server || '',
            balance: Number(b.balance) || 0,
            equity: Number(b.equity) || 0,
            pnl: Number(b.pnl) || 0,
            status: b.status || 'connected',
          })));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (activeBrokerId && selectedAccounts.length === 0) {
      setSelectedAccounts([activeBrokerId]);
    }
  }, [activeBrokerId]);

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
    setPreviewReady(false);
  };

  const selectAll = () => {
    setSelectedAccounts(accounts.map(a => a.id));
    setPreviewReady(false);
  };

  const fetchReportData = useCallback(async () => {
    if (selectedAccounts.length === 0) return;
    const brokerId = selectedAccounts[0];
    try {
      const res = await fetch(`/api/broker/deals?brokerId=${brokerId}&period=${period}`);
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.deals) setDeals(data.deals);
      setPreviewReady(true);
    } catch {
      setPreviewReady(false);
    }
  }, [selectedAccounts, period]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const getBrokerName = () => {
    const a = accounts.find(acc => selectedAccounts.includes(acc.id));
    return a ? `${a.name} · ${a.login}` : 'TradeGPT Account';
  };

  // Client-side PDF via jsPDF — pure programmatic drawing, no canvas, never blank
  const handleDownload = async () => {
    if (selectedAccounts.length === 0) return;
    setGenerating(true);
    try {
      const { downloadPDF } = await import('@/utils/pdfGenerator');
      await downloadPDF(accountInfo, period, stats, deals, getBrokerName());
    } catch (e) {
      console.error('[Reports] PDF generation failed:', e);
      alert(`Failed to generate PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  // Preview in new tab
  const handlePreview = async () => {
    if (selectedAccounts.length === 0) return;
    setPreviewing(true);
    try {
      const { generateReportHTML } = await import('@/utils/reportTemplate');
      const html = generateReportHTML(accountInfo, period, stats, deals, getBrokerName());
      const win = window.open('', '_blank');
      if (!win) { alert('Please allow popups to preview the report.'); return; }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error('[Reports] Preview failed:', e);
    } finally {
      setPreviewing(false);
    }
  };

  const disabled = selectedAccounts.length === 0;

  return (
    <div className="rpt-root">
      {/* Header */}
      <div className="rpt-header">
        <div className="rpt-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div>
          <h3 className="rpt-title">Performance Reports</h3>
          <p className="rpt-subtitle">Generate a detailed infographic-style PDF report</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="rpt-period-row">
        <span className="rpt-period-label">Report Period</span>
        <div className="rpt-period-pills">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setPreviewReady(false); }}
              className={`rpt-period-pill ${period === p ? 'rpt-period-pill-active' : ''}`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Account Selector */}
      <div className="rpt-section">
        <div className="rpt-section-header">
          <span className="rpt-section-title">Select Account</span>
          {accounts.length > 1 && (
            <button className="rpt-select-all" onClick={selectAll}>Select All</button>
          )}
        </div>
        <div className="rpt-accounts-grid">
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => toggleAccount(acc.id)}
              className={`rpt-account-card ${selectedAccounts.includes(acc.id) ? 'rpt-account-card-selected' : ''}`}
            >
              <div className="rpt-account-check">
                {selectedAccounts.includes(acc.id) ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <div className="rpt-account-uncheck" />
                )}
              </div>
              <div className="rpt-account-info">
                <span className="rpt-account-name">{acc.name}</span>
                <span className="rpt-account-login">{acc.login} · {acc.server}</span>
              </div>
              <span className="rpt-account-balance">${fmt(acc.balance)}</span>
            </button>
          ))}
          {accounts.length === 0 && (
            <div className="rpt-empty">No connected accounts found</div>
          )}
        </div>
      </div>

      {/* Preview Stats */}
      {previewReady && stats.samples > 0 && (
        <div className="rpt-preview">
          <span className="rpt-section-title">Report Preview</span>
          <div className="rpt-preview-grid">
            <div className="rpt-preview-card">
              <span className="rpt-preview-label">NET PROFIT</span>
              <span className={`rpt-preview-value ${stats.netProfit >= 0 ? 'rpt-green' : 'rpt-red'}`}>
                {stats.netProfit >= 0 ? '+' : ''}${fmt(stats.netProfit)}
              </span>
            </div>
            <div className="rpt-preview-card">
              <span className="rpt-preview-label">WIN RATE</span>
              <span className={`rpt-preview-value ${stats.winRate >= 50 ? 'rpt-green' : 'rpt-red'}`}>
                {stats.winRate}%
              </span>
            </div>
            <div className="rpt-preview-card">
              <span className="rpt-preview-label">TRADES</span>
              <span className="rpt-preview-value">{stats.samples}</span>
            </div>
            <div className="rpt-preview-card">
              <span className="rpt-preview-label">PROFIT FACTOR</span>
              <span className={`rpt-preview-value ${stats.profitFactor >= 1 ? 'rpt-green' : 'rpt-red'}`}>
                {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="rpt-action-area">
        <div className="rpt-btn-row">

          {/* Download PDF */}
          <button
            className="rpt-generate-btn"
            onClick={handleDownload}
            disabled={disabled || generating}
            title="Instantly download PDF report"
          >
            {generating ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </>
            )}
          </button>

          {/* Preview in browser */}
          <button
            className="rpt-preview-btn"
            onClick={handlePreview}
            disabled={disabled || previewing}
            title="Preview report in browser"
          >
            {previewing ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Loading…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview
              </>
            )}
          </button>

        </div>
        <p className="rpt-disclaimer">
          PDF downloads instantly · Preview opens a full-page render in your browser
        </p>
      </div>
    </div>
  );
}
