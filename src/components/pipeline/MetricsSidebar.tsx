'use client';

import React from 'react';

interface MetricsSidebarProps {
  config: any;
  sigsActive: boolean;
  totalGatesCount: number;
  passedGatesCount: number;
  isSignalPass: boolean;
}

export default function MetricsSidebar({
  config,
  sigsActive,
  totalGatesCount,
  passedGatesCount,
  isSignalPass,
}: MetricsSidebarProps) {
  const C = config;

  return (
    <div style={{ width: '44%', paddingLeft: 20, position: 'relative', zIndex: 10 }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        left: 20,
        right: 0,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: sigsActive ? '0 15px 45px -10px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.03)' : 'none',
        opacity: sigsActive ? 1 : 0.12,
        animation: sigsActive ? 'ps-sigin 0.65s cubic-bezier(0.16,1,0.3,1) both' : 'none',
        transition: 'box-shadow 0.5s, opacity 0.5s',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        zIndex: 25,
      }}>
        {/* 1. Mini Candlestick Chart Header */}
        <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{C.asset}</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981' }}>{C.change}</span>
          </div>
          
          <div style={{ height: '62px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '4px 0' }}>
            <svg width="100%" height="100%" viewBox="0 0 320 60" style={{ overflow: 'visible' }}>
              <line x1="20" y1="10" x2="20" y2="40" stroke="#f87171" strokeWidth="1.5" />
              <rect x="15" y="18" width="10" height="18" fill="#f87171" rx="1" />

              <line x1="50" y1="15" x2="50" y2="45" stroke="#f87171" strokeWidth="1.5" />
              <rect x="45" y="22" width="10" height="15" fill="#f87171" rx="1" />

              <line x1="80" y1="20" x2="80" y2="50" stroke="#f87171" strokeWidth="1.5" />
              <rect x="75" y="25" width="10" height="20" fill="#f87171" rx="1" />

              <line x1="110" y1="12" x2="110" y2="35" stroke="#10b981" strokeWidth="1.5" />
              <rect x="105" y="16" width="10" height="15" fill="#10b981" rx="1" />

              <line x1="140" y1="8" x2="140" y2="30" stroke="#10b981" strokeWidth="1.5" />
              <rect x="135" y="10" width="10" height="14" fill="#10b981" rx="1" />

              <line x1="170" y1="20" x2="170" y2="45" stroke="#f87171" strokeWidth="1.5" />
              <rect x="165" y="24" width="10" height="16" fill="#f87171" rx="1" />

              <line x1="200" y1="25" x2="200" y2="52" stroke="#10b981" strokeWidth="1.5" />
              <rect x="195" y="28" width="10" height="18" fill="#10b981" rx="1" />

              <line x1="230" y1="18" x2="230" y2="42" stroke="#10b981" strokeWidth="1.5" />
              <rect x="225" y="20" width="10" height="16" fill="#10b981" rx="1" />

              <line x1="260" y1="15" x2="260" y2="35" stroke="#10b981" strokeWidth="1.5" />
              <rect x="255" y="17" width="10" height="14" fill="#10b981" rx="1" />

              <line x1="290" y1="10" x2="290" y2="28" stroke="#10b981" strokeWidth="1.5" />
              <rect x="285" y="12" width="10" height="12" fill="#10b981" rx="1" />

              <line x1="0" y1="22" x2="320" y2="22" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
            </svg>

            <div style={{
              position: 'absolute', right: 8, top: '42px',
              background: '#10b981', color: '#fff', fontSize: '9.5px', fontWeight: 'bold',
              padding: '2px 6px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}>
              {C.price}
            </div>
          </div>
        </div>

        {/* 2. Gate Validation Bar */}
        <div style={{
          background: isSignalPass ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          borderLeft: `4px solid ${isSignalPass ? '#10b981' : '#ef4444'}`,
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isSignalPass ? '#10b981' : '#ef4444',
              animation: 'ps-blink 1.5s ease infinite'
            }} />
            <span style={{ fontSize: '10.5px', fontWeight: '900', color: isSignalPass ? '#10b981' : '#ef4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {isSignalPass ? 'SIGNAL' : 'NO SIGNAL'}
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500', marginLeft: 4 }}>
              {isSignalPass
                ? 'All parameters met — high confluence'
                : `${passedGatesCount}/${totalGatesCount} gates passed — parameter failed`}
            </span>
          </div>
          <span style={{
            fontSize: '9.5px', fontWeight: 'bold',
            background: isSignalPass ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isSignalPass ? '#10b981' : '#ef4444',
            padding: '2px 8px', borderRadius: '20px'
          }}>
            {passedGatesCount}/{totalGatesCount}
          </span>
        </div>

        {/* 3. Metric 2x2 Grid */}
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
          {/* RSI */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>RSI (14)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.rsi}</span>
              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.rsiColor, background: `${C.rsiColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                {C.rsiTag}
              </span>
            </div>
          </div>

          {/* MACD */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>MACD</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.macd}</span>
              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.macdColor, background: `${C.macdColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                {C.macdTag}
              </span>
            </div>
          </div>

          {/* EMA */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>EMA (50)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.ema}</span>
              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.emaColor, background: `${C.emaColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                {C.emaTag}
              </span>
            </div>
          </div>

          {/* ATR */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f088', borderRadius: '12px', padding: '8px 12px' }}>
            <span style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8' }}>ATR (14)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{C.atr}</span>
              <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: C.atrColor, background: `${C.atrColor}12`, padding: '1px 5px', borderRadius: '4px' }}>
                {C.atrTag}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Trend Pills + SMC Pills */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#ef4444', background: C.trend1Color }}>{C.trend1}</span>
            <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#475569', background: C.trend2Color }}>{C.trend2}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '8px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SMC Confluences</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {C.smc.map((item: string, idx: number) => (
                <span key={idx} style={{
                  fontSize: '8.5px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px',
                  border: '1px solid #cbd5e1', color: '#4f46e5', background: '#fff',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4f46e5' }} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Gate Dot Array */}
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {Array.from({ length: totalGatesCount }).map((_, idx) => {
              const isFailed = C.failedGateIndex !== null && idx === C.failedGateIndex;
              return (
                <span key={idx} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: isFailed ? '#f87171' : '#10b981',
                  border: isFailed ? '1px solid #ef4444' : 'none'
                }} />
              );
            })}
          </div>
          <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            {passedGatesCount}/{totalGatesCount} gates passed
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2.5 1.5 L5 4 L2.5 6.5" />
            </svg>
          </span>
        </div>

        {/* 6. Bottom Confluence & Action Button */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Confluence</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: C.confluence, height: '100%', background: isSignalPass ? '#10b981' : '#fbbf24', borderRadius: '3px' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a' }}>{C.confluence}</span>
            </div>
          </div>

          <button style={{
            background: isSignalPass ? '#b3926c' : '#e2e8f0',
            color: isSignalPass ? '#ffffff' : '#94a3b8',
            border: 'none', borderRadius: '12px', padding: '10px 16px',
            fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: isSignalPass ? 'pointer' : 'not-allowed',
            boxShadow: isSignalPass ? '0 4px 12px rgba(179,146,108,0.25)' : 'none',
            textTransform: 'uppercase'
          }}>
            {isSignalPass ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5.5 0 L1.5 5.5 L4.5 5.5 L3.5 10 L8.5 4.5 L5.5 4.5 Z" />
                </svg>
                Generate Signal
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="5" />
                  <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
                </svg>
                Blocked
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
