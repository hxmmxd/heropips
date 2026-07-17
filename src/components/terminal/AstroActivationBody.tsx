import React, { useState, useEffect } from 'react';

export default function AstroActivationBody() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/astro?symbol=XAU/USD')
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.snapshot); })
      .catch(() => {});
  }, []);
  if (!data) return (
    <div className="px-5 py-6 flex items-center justify-center">
      <span className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold animate-pulse">Syncing ephemeris...</span>
    </div>
  );
  return (
    <div className="px-5 py-4 space-y-2.5 text-[11px] text-slate-200">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-base">{data.lunarEmoji}</span>
          <span className="font-bold">{data.lunarPhase}</span>
          <span className="text-slate-400">— Day {data.moonAge?.toFixed(1)} in {data.moonSignName}</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-400">☿ Mercury</span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
          data.mercuryState === 'retrograde' ? 'bg-red-500/20 text-red-300 border border-red-500/30'
          : data.mercuryState === 'direct' ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }`}>
          {data.mercuryState?.toUpperCase()} {data.mercuryState === 'direct' ? '✓' : '⚠'}
        </span>
      </div>
      {data.aspects && data.aspects.length > 0 && (
        <div className="pt-1 border-t border-white/5 space-y-1">
          {data.aspects.slice(0, 3).map((a: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-slate-300">{a.planet1} {a.type} {a.planet2}</span>
              <span className={`text-[9px] font-bold ${a.nature === 'harmonious' ? 'text-emerald-400' : a.nature === 'tense' ? 'text-red-400' : 'text-slate-400'}`}>
                {a.nature} ({a.orb}°)
              </span>
            </div>
          ))}
        </div>
      )}
      {data.moonVoidOfCourse && (
        <div className="mt-1 bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded-lg px-3 py-1.5 text-[9px] font-bold">
          ⚠ Moon Void of Course — new entries deferred
        </div>
      )}
    </div>
  );
}
