'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Position, AccountInfo, PendingOrder } from '@/types';
import ManagerInsights from './manager/ManagerInsights';
import ManagerPositions from './manager/ManagerPositions';
import ManagerConfig, { ManagerConfigValues, loadConfig } from './manager/ManagerConfig';
import ManagerRisk from './manager/ManagerRisk';
import ManagerReports from './manager/ManagerReports';
import PositionChart from './manager/PositionChart';

interface ManagerTabProps {
  activeBrokerId: string;
  allowedSymbols?: string[];
  onNavigateToTerminal?: () => void;
  onAccountUpdate?: (info: { balance: number; equity: number; pnl: number }) => void;
}

const defaultAccountInfo: AccountInfo = {
  balance: 0, equity: 0, margin: 0, freeMargin: 0,
  mtmPnl: 0, mtmPnlPercent: 0, totalLots: 0,
  positionCount: 0, leverage: 0, currency: 'USD',
};

export default function ManagerTab({ activeBrokerId, allowedSymbols, onNavigateToTerminal, onAccountUpdate }: ManagerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'positions' | 'config' | 'risk' | 'reports'>('insights');
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>(defaultAccountInfo);
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [liveAccountInfo, setLiveAccountInfo] = useState<AccountInfo>(defaultAccountInfo);
  const [loading, setLoading] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dockChartSymbol, setDockChartSymbol] = useState<string | null>(null);
  const [sliderVal, setSliderVal] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [mgrConfig, setMgrConfig] = useState<ManagerConfigValues>(loadConfig);
  const contentRef = useRef<HTMLDivElement>(null);

  const basePositionsRef = useRef<Position[]>([]);
  const baseAccountInfoRef = useRef<AccountInfo>(defaultAccountInfo);
  const lastParentUpdateRef = useRef(0);

  // Sync refs and live states when database fetches complete
  useEffect(() => {
    basePositionsRef.current = positions;
    setLivePositions(positions);
  }, [positions]);

  useEffect(() => {
    baseAccountInfoRef.current = accountInfo;
    setLiveAccountInfo(accountInfo);
  }, [accountInfo]);

  // Real-time 50ms update loop for P&L and prices
  useEffect(() => {
    if (!activeBrokerId || activeBrokerId === 'none') return;

    const interval = setInterval(() => {
      const basePositions = basePositionsRef.current;
      const baseAccountInfo = baseAccountInfoRef.current;
      if (basePositions.length === 0) return;

      let totalLivePnl = 0;
      const updatedPositions = basePositions.map((pos) => {
        const isBuy = pos.type === 'POSITION_TYPE_BUY';
        
        // Base calculations strictly on the MT5 broker's feed price to keep data realistic
        const basePrice = pos.currentPrice || pos.openPrice;

        // Micro-tick simulated fluctuation (±0.02% for premium high-frequency feel)
        const isGold = pos.symbol.toUpperCase().includes('XAU') || pos.symbol.toUpperCase().includes('GOLD');
        const isSilver = pos.symbol.toUpperCase().includes('XAG') || pos.symbol.toUpperCase().includes('SILVER');
        const isCrypto = pos.symbol.toUpperCase().includes('BTC') || pos.symbol.toUpperCase().includes('ETH');
        
        let jitter = 0;
        const rand = (Math.random() - 0.5);
        if (isGold) {
          jitter = rand * 0.05; // ~±0.025
        } else if (isSilver) {
          jitter = rand * 0.005;
        } else if (isCrypto) {
          jitter = rand * 1.5;
        } else {
          jitter = rand * 0.00004; // Forex
        }

        const livePrice = basePrice + jitter;

        // Compute delta-based profit difference
        let contractSize = 1;
        const s = pos.symbol.toUpperCase();
        if (s.includes('XAU') || s.includes('GOLD')) contractSize = 100;
        else if (s.includes('XAG') || s.includes('SILVER')) contractSize = 5000;
        else if (s.includes('BTC') || s.includes('ETH')) contractSize = 1;
        else if (s.length === 6 || s.includes('/') || s.includes('EUR') || s.includes('GBP') || s.includes('JPY') || s.includes('USD')) {
          contractSize = 100000;
        }

        const deltaPrice = livePrice - (pos.currentPrice || pos.openPrice);
        const deltaProfit = deltaPrice * pos.volume * contractSize * (isBuy ? 1 : -1);
        const liveProfit = pos.profit + deltaProfit;

        totalLivePnl += liveProfit;

        return {
          ...pos,
          currentPrice: livePrice,
          profit: liveProfit,
        };
      });


      setLivePositions(updatedPositions);

      // Re-calculate account info
      const liveEquity = baseAccountInfo.balance + totalLivePnl;
      const liveMtmPnl = totalLivePnl;
      const liveMtmPnlPercent = baseAccountInfo.balance > 0 ? (liveMtmPnl / baseAccountInfo.balance) * 100 : 0;

      setLiveAccountInfo({
        ...baseAccountInfo,
        equity: liveEquity,
        mtmPnl: liveMtmPnl,
        mtmPnlPercent: liveMtmPnlPercent,
      });

      // Throttle parent layout re-renders to 200ms
      const now = Date.now();
      if (now - lastParentUpdateRef.current >= 200) {
        onAccountUpdate?.({
          balance: baseAccountInfo.balance,
          equity: liveEquity,
          pnl: liveMtmPnl,
        });
        lastParentUpdateRef.current = now;
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activeBrokerId, onAccountUpdate]);

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeSubTab !== 'risk') return;
    const target = e.currentTarget;
    const threshold = 25;
    const isBottom = target.scrollHeight - target.clientHeight - target.scrollTop <= threshold;
    setIsAtBottom(isBottom);
  };

  useEffect(() => {
    setIsAtBottom(false);
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab !== 'risk') return;
    const checkScroll = () => {
      const el = contentRef.current;
      if (el) {
        const isBottom = el.scrollHeight - el.clientHeight - el.scrollTop <= 25;
        setIsAtBottom(isBottom);
      }
    };
    checkScroll();
    const timer = setTimeout(checkScroll, 300);
    return () => clearTimeout(timer);
  }, [activeSubTab, positions, loading]);

  const fetchData = useCallback(async () => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    try {
      const res = await fetch(`/api/broker/positions?brokerId=${activeBrokerId}`);
      const data = await res.json();
      if (data.positions) {
        setPositions(data.positions);
        basePositionsRef.current = data.positions;
      }
      if (data.pendingOrders) setPendingOrders(data.pendingOrders);
      if (data.accountInfo) {
        setAccountInfo(data.accountInfo);
        baseAccountInfoRef.current = data.accountInfo;
        // Sync header with live data (MGR-005)
        onAccountUpdate?.({
          balance: data.accountInfo.balance,
          equity: data.accountInfo.equity,
          pnl: data.accountInfo.mtmPnl,
        });
      }
    } catch (err) {
      console.error('[ManagerTab] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBrokerId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeBrokerId, fetchData]);

  const handleCloseAllPositions = async () => {
    if (positions.length === 0) {
      alert('No open positions to close.');
      return;
    }
    if (!window.confirm(`Are you sure you want to close all ${positions.length} positions?`)) return;

    try {
      const results = await Promise.allSettled(
        positions.map((pos) =>
          fetch('/api/broker/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'close',
              brokerId: activeBrokerId,
              positionId: pos.id,
            }),
          }).then(res => res.json())
        )
      );
      const closed = results.filter(r => r.status === 'fulfilled' && (r as any).value?.success).length;
      const failed = positions.length - closed;
      fetchData();
      if (failed > 0) {
        alert(`Closed ${closed}/${positions.length} positions. ${failed} failed.`);
      } else {
        alert('All positions closed successfully.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to close positions.');
    }
  };

  const subTabs = [
    { id: 'insights' as const, label: 'Insights' },
    { id: 'positions' as const, label: 'Positions', badge: liveAccountInfo.positionCount },
    { id: 'config' as const, label: 'Config' },
    { id: 'risk' as const, label: 'Risk' },
    { id: 'reports' as const, label: 'Reports' },
  ];

  return (
    <div className="mgr-root" style={{ position: 'relative', minHeight: '100%' }}>
      {/* Sub-tab Navigation */}
      <div className="mgr-tabs">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`mgr-tab ${activeSubTab === tab.id ? 'mgr-tab-active' : ''}`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <>
                <span className="mgr-tab-badge">{tab.badge}</span>
                <span className="mgr-tab-dot" />
              </>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div className="mgr-content" ref={contentRef} onScroll={handleContentScroll}>
        {loading ? (
          <div className="mgr-loading">
            <div className="mgr-spinner" />
          </div>
        ) : (
          <>
            {activeSubTab === 'insights' && (
              <ManagerInsights
                accountInfo={liveAccountInfo}
                positions={livePositions}
                activeBrokerId={activeBrokerId}
                allowedSymbols={allowedSymbols}
                onRefresh={fetchData}
                config={mgrConfig}
                onNavigateToRisk={() => setActiveSubTab('risk')}
              />
            )}
            {activeSubTab === 'positions' && (
              <ManagerPositions
                positions={livePositions}
                pendingOrders={pendingOrders}
                accountInfo={liveAccountInfo}
                activeBrokerId={activeBrokerId}
                onRefresh={fetchData}
              />
            )}
            {activeSubTab === 'config' && (
              <ManagerConfig config={mgrConfig} onChange={setMgrConfig} />
            )}
            {activeSubTab === 'risk' && (
              <ManagerRisk
                accountInfo={liveAccountInfo}
                positions={livePositions}
                activeBrokerId={activeBrokerId}
                isSticky={!isAtBottom}
              />
            )}
            {activeSubTab === 'reports' && (
              <ManagerReports
                accountInfo={liveAccountInfo}
                positions={livePositions}
                activeBrokerId={activeBrokerId}
              />
            )}
          </>
        )}
      </div>


      {/* Floating Footer Dock */}
      {(activeSubTab !== 'risk' || isAtBottom) && (
        <div className="mgr-floating-dock">
          <button className="mgr-dock-btn" onClick={onNavigateToTerminal} title="AI Chat Terminal">
            <svg className="mgr-dock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
              <path d="M12 7h.01M9 10h.01M15 10h.01M9 13h.01M15 13h.01M12 13h.01"/>
            </svg>
          </button>
          <div className="mgr-dock-divider" />
          <button className="mgr-dock-btn mgr-dock-btn-accent" onClick={() => setShortcutsOpen(true)} title="Quick Shortcuts">
            <svg className="mgr-dock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </button>
          <div className="mgr-dock-divider" />
          <button className="mgr-dock-btn" onClick={() => {
            const sym = positions.length > 0 ? positions[0].symbol : 'XAUUSD';
            setDockChartSymbol(sym);
          }} title="Trading Chart">
            <svg className="mgr-dock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </button>
        </div>
      )}

      {/* Shortcuts Panel Overlay */}
      {shortcutsOpen && (
        <div className="mgr-shortcuts-overlay" onClick={() => setShortcutsOpen(false)}>
          <div className="mgr-shortcuts-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mgr-shortcuts-drag-handle" />

            <div className="mgr-shortcuts-header">
              <div className="mgr-shortcuts-title-wrap">
                <span className="mgr-shortcuts-icon">⚡</span>
                <span className="mgr-shortcuts-title">Commands</span>
              </div>
              <div className="mgr-shortcuts-meta">
                <span className="mgr-shortcuts-mic">🎙</span>
                <span className="mgr-shortcuts-pnl-pill">
                  {accountInfo.totalLots.toFixed(2)}L · <span className={accountInfo.mtmPnl >= 0 ? 'mgr-positive' : 'mgr-negative'}>
                    {accountInfo.mtmPnl >= 0 ? '+' : '-'}${Math.abs(accountInfo.mtmPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
                <button className="mgr-shortcuts-edit-btn">Edit</button>
              </div>
            </div>

            <div className="mgr-shortcuts-grid">
              {[
                { title: 'SL', sub: 'stop loss' },
                { title: 'TP', sub: 'take profit' },
                { title: 'BE', sub: 'sl->be' },
                { title: 'R:R', sub: 'tp->r:r' },
                { title: 'REV', sub: 'inverse' },
                { title: '2X', sub: 'double' },
                { title: 'CUT', sub: 'cut %' },
                { title: 'CW', sub: 'close winners' },
                { title: 'CL', sub: 'close losers' },
                { title: 'SC', sub: 'smart cut' },
                { title: 'AT', sub: 'auto trail' },
                { title: 'LT', sub: 'ladder tp' },
                { title: 'RF', sub: 'risk free' },
                { title: 'SLG', sub: 'sl guard' },
                { title: 'TP@BE', sub: 'tp->be' },
                { title: 'RTP', sub: 'remove tp' },
                { title: 'RSL', sub: 'remove sl' },
                { title: 'CLH', sub: 'close half' },
                { title: 'SL@E', sub: 'sl at entry' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`mgr-shortcut-tile ${idx >= 16 ? 'mgr-shortcut-tile-wide' : ''}`}
                  onClick={async () => {
                    const cmd = item.title;
                    if (cmd === 'BE' || cmd === 'SL@E') {
                      const profitable = positions.filter(p => p.profit > 0);
                      if (profitable.length === 0) { alert('No profitable positions.'); return; }
                      if (!confirm(`Move SL to entry for ${profitable.length} position(s)?`)) return;
                      await Promise.allSettled(profitable.map(p =>
                        fetch('/api/broker/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'modify', brokerId: activeBrokerId, positionId: p.id, stopLoss: p.openPrice }) })
                      ));
                      fetchData();
                    } else if (cmd === 'CLH') {
                      if (positions.length === 0) { alert('No positions.'); return; }
                      const half = positions.slice(0, Math.max(1, Math.ceil(positions.length / 2)));
                      if (!confirm(`Close ${half.length}/${positions.length} positions?`)) return;
                      await Promise.allSettled(half.map(p =>
                        fetch('/api/broker/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'close', brokerId: activeBrokerId, positionId: p.id }) })
                      ));
                      fetchData();
                    } else if (cmd === 'CW') {
                      const winners = positions.filter(p => p.profit > 0);
                      if (winners.length === 0) { alert('No winners.'); return; }
                      if (!confirm(`Close ${winners.length} winning position(s)?`)) return;
                      await Promise.allSettled(winners.map(p =>
                        fetch('/api/broker/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'close', brokerId: activeBrokerId, positionId: p.id }) })
                      ));
                      fetchData();
                    } else if (cmd === 'CL') {
                      const losers = positions.filter(p => p.profit < 0);
                      if (losers.length === 0) { alert('No losers.'); return; }
                      if (!confirm(`Close ${losers.length} losing position(s)?`)) return;
                      await Promise.allSettled(losers.map(p =>
                        fetch('/api/broker/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'close', brokerId: activeBrokerId, positionId: p.id }) })
                      ));
                      fetchData();
                    } else if (cmd === 'RSL') {
                      const withSL = positions.filter(p => p.stopLoss);
                      if (withSL.length === 0) { alert('No positions with SL.'); return; }
                      if (!confirm(`Remove SL from ${withSL.length} position(s)?`)) return;
                      await Promise.allSettled(withSL.map(p =>
                        fetch('/api/broker/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'modify', brokerId: activeBrokerId, positionId: p.id, stopLoss: 0 }) })
                      ));
                      fetchData();
                    } else if (cmd === 'RTP') {
                      const withTP = positions.filter(p => p.takeProfit);
                      if (withTP.length === 0) { alert('No positions with TP.'); return; }
                      if (!confirm(`Remove TP from ${withTP.length} position(s)?`)) return;
                      await Promise.allSettled(withTP.map(p =>
                        fetch('/api/broker/order', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'modify', brokerId: activeBrokerId, positionId: p.id, takeProfit: 0 }) })
                      ));
                      fetchData();
                    } else {
                      alert(`"${cmd}" — coming soon`);
                    }
                  }}
                >
                  <span className="mgr-shortcut-title">{item.title}</span>
                  <span className="mgr-shortcut-sub">{item.sub}</span>
                </div>
              ))}
            </div>

            {/* Swipe to Close Slider */}
            <div className="mgr-swipe-container">
              <div 
                className="mgr-swipe-bg-text" 
                style={{ opacity: Math.max(0.1, 1 - sliderVal / 70) }}
              >
                SWIPE TO CLOSE ALL POSITIONS
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
                onMouseUp={() => {
                  if (sliderVal >= 90) handleCloseAllPositions();
                  setSliderVal(0);
                }}
                onTouchEnd={() => {
                  if (sliderVal >= 90) handleCloseAllPositions();
                  setSliderVal(0);
                }}
                className="mgr-swipe-slider"
              />
            </div>
          </div>
        </div>
      )}

      {/* Position Chart Modal (triggered from Dock) */}
      {dockChartSymbol && (() => {
        const activePos = positions.find(p => p.symbol === dockChartSymbol);
        return (
          <PositionChart
            symbol={dockChartSymbol}
            entryPrice={activePos ? activePos.openPrice : 0}
            currentPrice={activePos ? activePos.currentPrice : 0}
            stopLoss={activePos ? activePos.stopLoss : undefined}
            takeProfit={activePos ? activePos.takeProfit : undefined}
            isBuy={activePos ? activePos.type === 'POSITION_TYPE_BUY' : true}
            volume={activePos ? activePos.volume : 0.01}
            activeBrokerId={activeBrokerId}
            onClose={() => setDockChartSymbol(null)}
            onRefresh={fetchData}
          />
        );
      })()}
    </div>
  );
}
