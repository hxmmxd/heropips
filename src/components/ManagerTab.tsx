'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Position, AccountInfo, PendingOrder } from '@/types';
import ManagerInsights from './manager/ManagerInsights';
import ManagerPositions from './manager/ManagerPositions';
import ManagerConfig from './manager/ManagerConfig';
import ManagerRisk from './manager/ManagerRisk';

interface ManagerTabProps {
  activeBrokerId: string;
}

const defaultAccountInfo: AccountInfo = {
  balance: 0, equity: 0, margin: 0, freeMargin: 0,
  mtmPnl: 0, mtmPnlPercent: 0, totalLots: 0,
  positionCount: 0, leverage: 0, currency: 'USD',
};

export default function ManagerTab({ activeBrokerId }: ManagerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'positions' | 'config' | 'risk'>('insights');
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>(defaultAccountInfo);
  const [loading, setLoading] = useState(true);

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

  const subTabs = [
    { id: 'insights' as const, label: 'Insights' },
    { id: 'positions' as const, label: 'Positions', badge: accountInfo.positionCount },
    { id: 'config' as const, label: 'Config' },
    { id: 'risk' as const, label: 'Risk' },
  ];

  return (
    <div className="mgr-root">
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
    </div>
  );
}
