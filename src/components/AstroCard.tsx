'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getAstroSnapshot, getNextCelestialEvents } from '@/lib/astro';

const KF = `
  @keyframes ac-orbit1  { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
  @keyframes ac-orbit2  { from{transform:rotate(120deg)} to{transform:rotate(480deg)} }
  @keyframes ac-orbit3  { from{transform:rotate(240deg)} to{transform:rotate(600deg)} }
  @keyframes ac-sun     { 0%,100%{opacity:.7} 50%{opacity:1} }
  @keyframes ac-corona  { 0%,100%{opacity:.2;r:17} 50%{opacity:.4;r:19} }
  @keyframes ac-glow    { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes ac-pulse   { 0%,100%{opacity:.5} 50%{opacity:.9} }
  @keyframes ac-spin    { to{stroke-dashoffset:-80} }
  @keyframes ac-ring    { to{stroke-dashoffset:-90} }
  @keyframes ac-ticker  { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }
`;

/* ── Moon SVG ── */
function MoonPlanetLg({ elongation }: { elongation: number }) {
  const shadowX = Math.cos((elongation / 180) * Math.PI) * 18;
  return (
    <svg width={52} height={52} viewBox="0 0 52 52" style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id="ml-body" cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#f1f5f9" />
          <stop offset="45%"  stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        <clipPath id="ml-clip"><circle cx="26" cy="26" r="16" /></clipPath>
      </defs>
      <circle cx="26" cy="26" r="22" fill="rgba(245,158,11,0.1)" style={{ animation: 'ac-pulse 4s ease-in-out infinite' }} />
      <circle cx="26" cy="26" r="16" fill="url(#ml-body)" />
      <circle cx={26 + shadowX} cy="26" r="16" fill="#0f172a" opacity={0.55} clipPath="url(#ml-clip)" />
      <circle cx="20" cy="22" r="2.5" fill="#475569" opacity={0.4}  clipPath="url(#ml-clip)" />
      <circle cx="31" cy="29" r="1.8" fill="#334155" opacity={0.38} clipPath="url(#ml-clip)" />
      <circle cx="23" cy="31" r="1.2" fill="#475569" opacity={0.3}  clipPath="url(#ml-clip)" />
      <circle cx="20" cy="19" r="4.5" fill="white"   opacity={0.16} clipPath="url(#ml-clip)" />
    </svg>
  );
}

/* ── Mercury SVG (small) ── */
function MercurySm({ retrograde }: { retrograde: boolean }) {
  const c  = retrograde ? '#ef4444' : '#d97706';
  const c1 = retrograde ? '#fca5a5' : '#fcd34d';
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id="ms-body" cx="35%" cy="28%" r="68%">
          <stop offset="0%"   stopColor={c1} />
          <stop offset="50%"  stopColor={c} />
          <stop offset="100%" stopColor={retrograde ? '#7f1d1d' : '#451a03'} />
        </radialGradient>
        <clipPath id="ms-clip"><circle cx="16" cy="16" r="9" /></clipPath>
      </defs>
      <circle cx="16" cy="16" r="14" fill={retrograde ? 'rgba(239,68,68,0.1)' : 'rgba(217,119,6,0.1)'} style={{ animation: 'ac-pulse 3s ease-in-out infinite' }} />
      <ellipse cx="16" cy="16" rx="13" ry="4" fill="none"
        stroke={retrograde ? 'rgba(252,165,165,0.35)' : 'rgba(251,191,36,0.3)'}
        strokeWidth="1" strokeDasharray="5 3" transform="rotate(-20 16 16)"
        style={{ animation: 'ac-spin 3s linear infinite' }} />
      <circle cx="16" cy="16" r="9" fill="url(#ms-body)" />
      <circle cx="12" cy="12" r="2.5" fill="white" opacity={0.18} clipPath="url(#ms-clip)" />
    </svg>
  );
}

/* ── Bias SVG (small) ── */
function BiasSm({ bias }: { bias: 'bullish' | 'bearish' | 'neutral' }) {
  const cfg = {
    bullish: { c1: '#fef08a', c2: '#eab308', c3: '#713f12', glow: 'rgba(234,179,8,0.15)' },
    bearish: { c1: '#fca5a5', c2: '#dc2626', c3: '#450a0a', glow: 'rgba(220,38,38,0.15)' },
    neutral: { c1: '#ddd6fe', c2: '#d97706', c3: '#1e0a3c', glow: 'rgba(124,58,237,0.15)' },
  }[bias];
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id="bs-body" cx="35%" cy="28%" r="68%">
          <stop offset="0%"   stopColor={cfg.c1} />
          <stop offset="50%"  stopColor={cfg.c2} />
          <stop offset="100%" stopColor={cfg.c3} />
        </radialGradient>
        <clipPath id="bs-clip"><circle cx="16" cy="16" r="10" /></clipPath>
      </defs>
      <circle cx="16" cy="16" r="14" fill={cfg.glow} style={{ animation: 'ac-pulse 3s ease-in-out infinite' }} />
      {bias === 'bullish' && [0,60,120,180,240,300].map(a => (
        <line key={a}
          x1={16 + 11 * Math.cos(a * Math.PI/180)} y1={16 + 11 * Math.sin(a * Math.PI/180)}
          x2={16 + 14 * Math.cos(a * Math.PI/180)} y2={16 + 14 * Math.sin(a * Math.PI/180)}
          stroke="rgba(253,224,71,0.5)" strokeWidth="1.2" strokeLinecap="round"
          style={{ animation: 'ac-pulse 2.5s ease-in-out infinite', transformOrigin: '16px 16px' }} />
      ))}
      {bias === 'bearish' && (
        <ellipse cx="16" cy="16" rx="14" ry="4" fill="none"
          stroke="rgba(248,113,113,0.35)" strokeWidth="1.5" transform="rotate(-15 16 16)" />
      )}
      <circle cx="16" cy="16" r="10" fill="url(#bs-body)" />
      <circle cx="11" cy="11" r="2.8" fill="white" opacity={0.18} clipPath="url(#bs-clip)" />
    </svg>
  );
}

/* ── Risk SVG (small) ── */
function RiskSm({ risk }: { risk: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const c = {
    LOW:    { c1:'#bbf7d0', c2:'#16a34a', c3:'#052e16', ring:'rgba(74,222,128,0.45)',  glow:'rgba(74,222,128,0.12)'  },
    MEDIUM: { c1:'#fef08a', c2:'#d97706', c3:'#451a03', ring:'rgba(251,191,36,0.45)',  glow:'rgba(251,191,36,0.12)'  },
    HIGH:   { c1:'#fecaca', c2:'#dc2626', c3:'#450a0a', ring:'rgba(248,113,113,0.45)', glow:'rgba(248,113,113,0.12)' },
  }[risk];
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <radialGradient id="rs-body" cx="35%" cy="28%" r="68%">
          <stop offset="0%"   stopColor={c.c1} />
          <stop offset="50%"  stopColor={c.c2} />
          <stop offset="100%" stopColor={c.c3} />
        </radialGradient>
        <clipPath id="rs-clip"><circle cx="16" cy="16" r="9" /></clipPath>
        <clipPath id="rs-rb"><rect x="0" y="0"    width="32" height="16.5" /></clipPath>
        <clipPath id="rs-rf"><rect x="0" y="16.5" width="32" height="15.5" /></clipPath>
      </defs>
      <circle cx="16" cy="16" r="14" fill={c.glow} style={{ animation: 'ac-pulse 3s ease-in-out infinite' }} />
      <ellipse cx="16" cy="16" rx="14" ry="4" fill="none"
        stroke={c.ring} strokeWidth="1.5" strokeDasharray="4 3"
        transform="rotate(-20 16 16)" clipPath="url(#rs-rb)"
        style={{ animation: 'ac-ring 4s linear infinite' }} />
      <circle cx="16" cy="16" r="9" fill="url(#rs-body)" />
      {[13,16,19].map((y,i) => (
        <ellipse key={i} cx="16" cy={y} rx="8.5" ry="1.4" fill="rgba(0,0,0,0.1)" clipPath="url(#rs-clip)" />
      ))}
      <ellipse cx="16" cy="16" rx="14" ry="4" fill="none"
        stroke={c.ring} strokeWidth="1.5" strokeDasharray="4 3"
        transform="rotate(-20 16 16)" clipPath="url(#rs-rf)"
        style={{ animation: 'ac-ring 4s linear infinite' }} />
      <circle cx="11" cy="11" r="2.5" fill="white" opacity={0.2} clipPath="url(#rs-clip)" />
    </svg>
  );
}

/* ── Countdown Strip ── */
function CountdownStrip() {
  const [now, setNow] = useState(() => new Date());
  // Tick every second for the display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Events recalculate at most once per minute (they change daily)
  const events = useMemo(() => getNextCelestialEvents(new Date()), [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Math.floor(now.getTime() / 60_000),
  ]);

  function fmt(ms: number) {
    if (ms <= 0) return 'NOW';
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  function urgency(ms: number): string {
    const days = ms / 86_400_000;
    if (days < 1) return '#f87171';
    if (days < 3) return '#fbbf24';
    return '#f59e0b';
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      margin: '0 0 8px', padding: '7px 10px',
      background: 'rgba(245,158,11,0.05)',
      border: '1px solid rgba(245,158,11,0.12)',
      borderRadius: 10, gap: 4,
    }}>
      {events.map((ev, i) => {
        const ms = ev.targetDate.getTime() - now.getTime();
        const col = urgency(ms);
        return (
          <React.Fragment key={ev.name}>
            {i > 0 && (
              <div style={{ width: 1, height: 22, background: 'rgba(245,158,11,0.15)', flexShrink: 0 }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11 }}>{ev.emoji}</span>
                <span style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--subtext)', opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {ev.name}
                </span>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 800, fontFamily: 'monospace',
                color: col, letterSpacing: '-0.01em',
                animation: ms < 86_400_000 ? 'ac-ticker 1s ease-in-out infinite' : 'none',
              }}>
                {fmt(ms)}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Orrery ── */
function Orrery({ mercRetro, bias, risk }: {
  mercRetro: boolean; bias: 'bullish'|'bearish'|'neutral'; risk: 'LOW'|'MEDIUM'|'HIGH';
}) {
  const cx = 90, cy = 90;
  const p1c = mercRetro ? '#f87171' : '#fbbf24';
  const p2c = bias === 'bullish' ? '#facc15' : bias === 'bearish' ? '#f87171' : '#f59e0b';
  const p3c = risk === 'HIGH' ? '#f87171' : risk === 'MEDIUM' ? '#fbbf24' : '#4ade80';
  return (
    <svg width={130} height={130} viewBox="0 0 180 180" style={{ display:'block', margin:'0 auto', overflow:'visible' }}>
      <defs>
        <radialGradient id="sun-grad" cx="38%" cy="32%" r="65%">
          <stop offset="0%"  stopColor="#fef9c3" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={36} fill="none" stroke="rgba(245,158,11,0.18)" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={cx} cy={cy} r={58} fill="none" stroke="rgba(245,158,11,0.13)" strokeWidth="1" strokeDasharray="3 4" />
      <circle cx={cx} cy={cy} r={80} fill="none" stroke="rgba(245,158,11,0.09)" strokeWidth="1" strokeDasharray="3 5" />
      <circle cx={cx} cy={cy} r={13} fill="rgba(251,191,36,0.18)" style={{ animation: 'ac-corona 3s ease-in-out infinite' }} />
      <circle cx={cx} cy={cy} r={8}  fill="url(#sun-grad)" style={{ animation: 'ac-sun 3s ease-in-out infinite' }} />
      <g style={{ transformOrigin:`${cx}px ${cy}px`, animation:`ac-orbit1 ${mercRetro?'6s':'4s'} linear infinite ${mercRetro?'reverse':''}` }}>
        <circle cx={cx+36} cy={cy} r={4.5} fill={p1c} />
        <circle cx={cx+36} cy={cy} r={7}   fill={p1c} opacity={0.15} />
        <circle cx={cx+34.5} cy={cy-1.5} r={1.2} fill="white" opacity={0.4} />
      </g>
      <g style={{ transformOrigin:`${cx}px ${cy}px`, animation:'ac-orbit2 7s linear infinite' }}>
        <circle cx={cx+58} cy={cy} r={5.5} fill={p2c} />
        <circle cx={cx+58} cy={cy} r={9}   fill={p2c} opacity={0.12} />
        <circle cx={cx+56} cy={cy-2} r={1.5} fill="white" opacity={0.35} />
      </g>
      <g style={{ transformOrigin:`${cx}px ${cy}px`, animation:'ac-orbit3 12s linear infinite' }}>
        <ellipse cx={cx+80} cy={cy} rx={11} ry={3} fill="none" stroke={p3c} strokeWidth="1.2" opacity={0.35} transform={`rotate(-15 ${cx+80} ${cy})`} clipPath="url(#r3b)" />
        <clipPath id="r3b"><rect x={cx+60} y={cy-90} width={40} height={90} /></clipPath>
        <circle cx={cx+80} cy={cy} r={7} fill={p3c} />
        <circle cx={cx+80} cy={cy} r={11} fill={p3c} opacity={0.1} />
        <circle cx={cx+77.5} cy={cy-2.5} r={2} fill="white" opacity={0.3} />
        <ellipse cx={cx+80} cy={cy} rx={11} ry={3} fill="none" stroke={p3c} strokeWidth="1.2" opacity={0.55} transform={`rotate(-15 ${cx+80} ${cy})`} clipPath="url(#r3f)" />
        <clipPath id="r3f"><rect x={cx+60} y={cy} width={40} height={90} /></clipPath>
      </g>
      {[[15,20],[160,35],[12,140],[155,150],[80,8],[80,165]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={1.2} fill="rgba(245,158,11,0.45)"
          style={{ animation:`ac-pulse ${1.8+i*0.3}s ease-in-out infinite`, animationDelay:`${i*0.2}s` }} />
      ))}
    </svg>
  );
}

/* ════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════ */
export default function AstroCard() {
  const snap = useMemo(() => getAstroSnapshot(), []);

  const biasColor  = snap.marketBias === 'bullish' ? '#facc15' : snap.marketBias === 'bearish' ? '#f87171' : '#f59e0b';
  const riskColor  = snap.riskLevel  === 'HIGH'    ? '#f87171' : snap.riskLevel  === 'MEDIUM'  ? '#fbbf24' : '#4ade80';
  const mercColor  = snap.mercuryRetrograde ? '#f87171' : '#4ade80';
  const illumination = Math.round(50 - 50 * Math.cos(snap.lunarElongation * Math.PI / 180));

  const bottomBoxes = [
    {
      planet: <MercurySm retrograde={snap.mercuryRetrograde} />,
      label: 'MERCURY',
      value: snap.mercuryRetrograde ? 'Retrograde ℞' : 'Direct',
      sub: `${snap.mercury.zodiacSymbol} ${snap.mercury.zodiacSign} · ${snap.mercury.degreeInSign}°`,
      color: mercColor,
    },
    {
      planet: <BiasSm bias={snap.marketBias} />,
      label: 'MARKET BIAS',
      value: snap.marketBias.toUpperCase(),
      sub: `Venus in ${snap.venus.zodiacSign}`,
      color: biasColor,
    },
    {
      planet: <RiskSm risk={snap.riskLevel} />,
      label: 'RISK LEVEL',
      value: snap.riskLevel,
      sub: `Mars in ${snap.mars.zodiacSign}`,
      color: riskColor,
    },
  ];

  return (
    <div style={{ maxWidth: 460 }}>
      <style>{KF}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', boxShadow:'0 0 8px #f59e0b', display:'inline-block', flexShrink:0, animation:'ac-glow 2.5s ease-in-out infinite' }} />
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.18em', color:'#f59e0b', textTransform:'uppercase' }}>Astro Mode</span>
        </div>
        <span style={{ fontSize:9, color:'var(--subtext)', opacity:0.5, fontStyle:'italic' }}>{snap.dominantAspect}</span>
      </div>

      {/* ── Full-width Moon hero box ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:16,
        padding:'14px 16px',
        background:'rgba(245,158,11,0.07)',
        border:'1px solid rgba(245,158,11,0.22)',
        borderRadius:14, marginBottom:8,
        position:'relative', overflow:'hidden',
      }}>
        {[{top:'18%',left:'72%'},{top:'60%',left:'85%'},{top:'30%',left:'91%'},{top:'75%',left:'68%'},{top:'12%',left:'60%'}].map((s,i)=>(
          <div key={i} style={{ position:'absolute', width:2, height:2, borderRadius:'50%', background:'rgba(245,158,11,0.4)', top:s.top, left:s.left, animation:`ac-pulse ${2+i*0.4}s ease-in-out infinite`, animationDelay:`${i*0.3}s` }} />
        ))}
        <MoonPlanetLg elongation={snap.lunarElongation} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:8, fontWeight:800, letterSpacing:'0.14em', color:'var(--subtext)', textTransform:'uppercase', marginBottom:4 }}>MOON</div>
          <div style={{ fontSize:16, fontWeight:800, color:'#f59e0b', letterSpacing:'-0.01em', marginBottom:5 }}>{snap.lunarPhase}</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:9, fontFamily:'monospace', color:'var(--subtext)' }}>{snap.moon.zodiacSymbol} {snap.moon.zodiacSign} {snap.moon.degreeInSign}°</span>
            <span style={{ fontSize:9, fontFamily:'monospace', color:'var(--subtext)' }}>Illumination {illumination}%</span>
            <span style={{ fontSize:9, fontFamily:'monospace', color:'var(--subtext)' }}>{snap.lunarElongation.toFixed(1)}° elongation</span>
          </div>
        </div>
        {/* Illumination arc */}
        <svg width={40} height={40} viewBox="0 0 40 40" style={{ flexShrink:0 }}>
          <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="3" />
          <circle cx="20" cy="20" r="15" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${illumination*0.942} 94.2`} strokeDashoffset="23.55" transform="rotate(-90 20 20)" />
          <text x="20" y="24" textAnchor="middle" fontSize="9" fill="#f59e0b" fontWeight="700" fontFamily="monospace">{illumination}%</text>
        </svg>
      </div>

      {/* ── Orrery ── */}
      <div style={{ marginBottom:6 }}>
        <Orrery mercRetro={snap.mercuryRetrograde} bias={snap.marketBias} risk={snap.riskLevel} />
      </div>

      {/* ── Countdown Strip ── */}
      <CountdownStrip />

      {/* ── 3 compact boxes ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:9 }}>
        {bottomBoxes.map(box => (
          <div key={box.label} style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'10px 12px',
            background:`${box.color}08`,
            border:`1px solid ${box.color}25`,
            borderRadius:12, position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', top:-12, right:-12, width:36, height:36, borderRadius:'50%', background:box.color, opacity:0.08, filter:'blur(12px)', pointerEvents:'none' }} />
            {box.planet}
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                <span style={{ fontSize:7.5, fontWeight:800, letterSpacing:'0.12em', color:'var(--subtext)', textTransform:'uppercase', opacity:0.55 }}>{box.label}</span>
                <span style={{ fontSize:12, fontWeight:800, color:box.color, letterSpacing:'-0.01em', fontFamily:'monospace' }}>{box.value}</span>
              </div>
              <div style={{ fontSize:8.5, color:'var(--subtext)', opacity:0.5, fontFamily:'monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{box.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bias reason ── */}
      <div style={{
        display:'flex', alignItems:'flex-start', gap:9,
        padding:'8px 12px',
        background:`${biasColor}06`,
        borderRadius:10,
        border:`1px solid ${biasColor}18`,
        borderLeft:`3px solid ${biasColor}65`,
      }}>
        <span style={{ fontSize:11, flexShrink:0, marginTop:1 }}>
          {snap.marketBias === 'bullish' ? '▲' : snap.marketBias === 'bearish' ? '▼' : '◆'}
        </span>
        <span style={{ fontSize:11, color:'var(--subtext)', lineHeight:1.55 }}>{snap.biasReason}</span>
      </div>
    </div>
  );
}
