'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Position, AccountInfo, PendingOrder } from '@/types';
import ManagerInsights from './manager/ManagerInsights';
import ManagerPositions from './manager/ManagerPositions';
import ManagerConfig from './manager/ManagerConfig';
import ManagerRisk from './manager/ManagerRisk';
import PositionChart from './manager/PositionChart';

interface ManagerTabProps {
  activeBrokerId: string;
  onNavigateToTerminal?: () => void;
}

const defaultAccountInfo: AccountInfo = {
  balance: 0, equity: 0, margin: 0, freeMargin: 0,
  mtmPnl: 0, mtmPnlPercent: 0, totalLots: 0,
  positionCount: 0, leverage: 0, currency: 'USD',
};

export default function ManagerTab({ activeBrokerId, onNavigateToTerminal }: ManagerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'positions' | 'config' | 'risk'>('insights');
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>(defaultAccountInfo);
  const [loading, setLoading] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dockChartSymbol, setDockChartSymbol] = useState<string | null>(null);
  const [sliderVal, setSliderVal] = useState(0);

  const fetchData = useCallback(async () => {
    if (!activeBrokerId || activeBrokerId === 'none') return;
    try {
      const res = await fetch(`/api/broker/positions?brokerId=${activeBrokerId}`);
      const data = await res.json();
      if (data.positions) setPositions(data.positions);
      if (data.pendingOrders) setPendingOrders(data.pendingOrders);
      if (data.accountInfo) setAccountInfo(data.accountInfo);
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
      await Promise.all(
        positions.map((pos) =>
          fetch('/api/broker/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: pos.type === 'POSITION_TYPE_BUY' ? 'SELL' : 'BUY',
              symbol: pos.symbol,
              volume: pos.volume,
              brokerId: activeBrokerId,
              positionId: pos.id,
            }),
          })
        )
      );
      fetchData();
      alert('All positions closed successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to close some positions.');
    }
  };

  const subTabs = [
    { id: 'insights' as const, label: 'Insights' },
    { id: 'positions' as const, label: 'Positions', badge: accountInfo.positionCount },
    { id: 'config' as const, label: 'Config' },
    { id: 'risk' as const, label: 'Risk' },
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
      <div className="mgr-content">
        {loading ? (
          <div className="mgr-loading">
            <div className="mgr-spinner" />
          </div>
        ) : (
          <>
            {activeSubTab === 'insights' && (
              <ManagerInsights
                accountInfo={accountInfo}
                positions={positions}
                activeBrokerId={activeBrokerId}
                onRefresh={fetchData}
              />
            )}
            {activeSubTab === 'positions' && (
              <ManagerPositions
                positions={positions}
                pendingOrders={pendingOrders}
                accountInfo={accountInfo}
                activeBrokerId={activeBrokerId}
                onRefresh={fetchData}
              />
            )}
            {activeSubTab === 'config' && (
              <ManagerConfig />
            )}
            {activeSubTab === 'risk' && (
              <ManagerRisk
                accountInfo={accountInfo}
                positions={positions}
                activeBrokerId={activeBrokerId}
              />
            )}
          </>
        )}
      </div>

      {/* Floating Footer Dock */}
      {activeSubTab !== 'risk' && (
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
                  onClick={() => alert(`Command "${item.title}" executed`)}
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
