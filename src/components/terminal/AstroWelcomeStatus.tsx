import React, { useState, useEffect } from 'react';

export default function AstroWelcomeStatus() {
  const [snap, setSnap] = useState<any>(null);

  useEffect(() => {
    import('@/lib/astro').then(({ getAstroSnapshot }) => {
      setSnap(getAstroSnapshot());
    });
  }, []);

  if (!snap) return null;

  const riskColor = snap.riskLevel === 'LOW' ? '#22c55e' : snap.riskLevel === 'HIGH' ? '#ef4444' : '#f59e0b';
  const biasColor = snap.marketBias === 'bullish' ? '#22c55e' : snap.marketBias === 'bearish' ? '#ef4444' : 'var(--subtext)';

  const items = [
    { emoji: snap.lunarEmoji, label: snap.lunarPhase, sub: `in ${snap.moonSignName}` },
    { emoji: '☿', label: snap.mercuryRetrograde ? 'Retrograde' : 'Direct', color: snap.mercuryRetrograde ? '#ef4444' : '#22c55e' },
    { emoji: '◎', label: snap.marketBias.charAt(0).toUpperCase() + snap.marketBias.slice(1), color: biasColor, sub: 'bias' },
    { emoji: '◆', label: snap.riskLevel, color: riskColor, sub: 'risk' },
  ];

  return (
    <div className="wlc-status-row">
      {items.map((item, i) => (
        <div key={i} className="wlc-status-item" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
          <span className="wlc-status-emoji">{item.emoji}</span>
          <span className="wlc-status-text" style={item.color ? { color: item.color } : {}}>{item.label}</span>
          {item.sub && <span className="wlc-status-sub">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}
