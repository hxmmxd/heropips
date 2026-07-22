'use client';

import React, { useState } from 'react';

interface AstroDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function AstroDisclaimerModal({ isOpen, onClose, onAccept }: AstroDisclaimerModalProps) {
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div className="max-w-md w-full bg-slate-950/90 border border-amber-500/30 rounded-3xl p-6 text-white shadow-[0_0_30px_rgba(245,158,11,0.15)] animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          🪐 Astro Mode Activation
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Astro Mode integrates experimental celestial telemetry overlays—including geocentric planetary velocities, lunar aspects, and seasonal solar alignments—into TradeGPT's risk management architecture.
        </p>
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5 space-y-2 mb-4">
          <h4 className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">System Protocols:</h4>
          <ul className="text-[10px] text-amber-100/80 space-y-1.5 list-disc pl-4">
            <li>Mercury Retrograde enforces a strict <strong>hard-block</strong> on trade tickets.</li>
            <li>Position sizing is scaled dynamically by lunar cycles and elements.</li>
            <li>These parameters are computational overlays and are <strong>not financial advice</strong>.</li>
          </ul>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer mb-6 select-none">
          <input
            type="checkbox"
            id="disclaimer-checkbox"
            checked={disclaimerChecked}
            onChange={(e) => setDisclaimerChecked(e.target.checked)}
            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/50"
          />
          <span className="text-[10px] text-slate-400 font-medium leading-tight">
            I understand that celestial gating is analytical telemetry. I accept all risks associated with executing orders.
          </span>
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setDisclaimerChecked(false);
              onClose();
            }}
            className="flex-1 py-3 rounded-xl border border-slate-800 text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition"
          >
            Decline
          </button>
          <button
            id="accept-astro-btn"
            disabled={!disclaimerChecked}
            onClick={() => {
              setDisclaimerChecked(false);
              onAccept();
            }}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Accept & Enable
          </button>
        </div>
      </div>
    </div>
  );
}
