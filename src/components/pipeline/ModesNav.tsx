'use client';

import React from 'react';

type Mode = 'quant' | 'astro' | 'webhook';

interface ModeConfig {
  label: string;
  color: string;
  rgb: string;
}

interface ModesNavProps {
  modes: Record<Mode, ModeConfig>;
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModesNav({ modes, activeMode, onModeChange }: ModesNavProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 64 }}>
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '6px 8px',
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(226,232,240,0.9)',
        borderRadius: 999,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {(Object.keys(modes) as Mode[]).map((m) => {
          const mc = modes[m];
          const active = m === activeMode;
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#fff' : 'transparent',
                boxShadow: active ? '0 2px 10px rgba(0,0,0,0.09)' : 'none',
                color: active ? '#0f172a' : '#94a3b8',
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: mc.color,
                opacity: active ? 1 : 0.3,
                boxShadow: active ? `0 0 8px 2px ${mc.color}88` : 'none',
                transition: 'all 0.3s',
              }} />
              {mc.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
