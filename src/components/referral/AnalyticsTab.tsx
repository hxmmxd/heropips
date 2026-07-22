'use client';

import React from 'react';

interface AnalyticsTabProps {
  analyticsData: any;
  loading: boolean;
}

export default function AnalyticsTab({ analyticsData, loading }: AnalyticsTabProps) {
  return (
    <div className="rh-section-card">
      <div className="rh-section-card-header">
        <span className="rh-section-card-title">Earning Performance</span>
        <span className="rh-section-card-hint">Trailing 30 days statistics</span>
      </div>

      {loading ? (
        <div className="rh-empty">Loading performance analytics...</div>
      ) : (
        <>
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
                <span>Rebates (L1 Lots)</span>
              </div>
              <div className="rh-legend-item">
                <span className="rh-legend-dot" style={{ background: '#6366f1' }} />
                <span>Referral Income (L2-L5)</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
