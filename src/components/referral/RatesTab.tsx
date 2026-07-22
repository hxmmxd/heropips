'use client';

import React from 'react';

interface RatesTabProps {
  ratesData: any;
  loading: boolean;
}

const getLevelColor = (level: any) => {
  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
  const idx = Math.max(0, (Number(level) || 1) - 1);
  return colors[idx % colors.length];
};

export default function RatesTab({ ratesData, loading }: RatesTabProps) {
  return (
    <div className="rh-section-card">
      <div className="rh-section-card-header">
        <span className="rh-section-card-title">Multi-Level Rebate Percentages</span>
        <span className="rh-section-card-hint">Rules from global settings</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loading ? (
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
      {!loading && ratesData?.rules && ratesData.rules.length > 0 && (
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
  );
}
