'use client';

import React, { useEffect } from 'react';

export interface ManagerConfigValues {
  oneClickTrading: boolean;
  guardMode: boolean;
  soundNotifications: boolean;
  defaultLot: string;
  defaultSL: string;
  defaultTP: string;
}

export const DEFAULT_CONFIG: ManagerConfigValues = {
  oneClickTrading: false,
  guardMode: false,
  soundNotifications: true,
  defaultLot: '0.01',
  defaultSL: '50',
  defaultTP: '100',
};

const STORAGE_KEY = 'tradegpt-mgr-config';

export function loadConfig(): ManagerConfigValues {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config: ManagerConfigValues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

interface ManagerConfigProps {
  config: ManagerConfigValues;
  onChange: (config: ManagerConfigValues) => void;
}

export default function ManagerConfig({ config, onChange }: ManagerConfigProps) {
  // Persist on every change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const update = (patch: Partial<ManagerConfigValues>) => {
    onChange({ ...config, ...patch });
  };

  return (
    <div className="mgr-config">
      <div className="mgr-config-section">
        <h3 className="mgr-config-title">Trading Preferences</h3>

        <div className="mgr-config-row">
          <div className="mgr-config-row-info">
            <span className="mgr-config-row-label">One-Click Trading</span>
            <span className="mgr-config-row-desc">Execute orders without confirmation dialog</span>
          </div>
          <button
            onClick={() => update({ oneClickTrading: !config.oneClickTrading })}
            className={`mgr-toggle ${config.oneClickTrading ? 'mgr-toggle-on' : ''}`}
          >
            <span className="mgr-toggle-knob" />
          </button>
        </div>

        <div className="mgr-config-row">
          <div className="mgr-config-row-info">
            <span className="mgr-config-row-label">Equity Guard</span>
            <span className="mgr-config-row-desc">Auto-close positions at equity threshold</span>
          </div>
          <button
            onClick={() => update({ guardMode: !config.guardMode })}
            className={`mgr-toggle ${config.guardMode ? 'mgr-toggle-on' : ''}`}
          >
            <span className="mgr-toggle-knob" />
          </button>
        </div>

        <div className="mgr-config-row">
          <div className="mgr-config-row-info">
            <span className="mgr-config-row-label">Sound Notifications</span>
            <span className="mgr-config-row-desc">Play sounds on order fills and alerts</span>
          </div>
          <button
            onClick={() => update({ soundNotifications: !config.soundNotifications })}
            className={`mgr-toggle ${config.soundNotifications ? 'mgr-toggle-on' : ''}`}
          >
            <span className="mgr-toggle-knob" />
          </button>
        </div>
      </div>

      <div className="mgr-config-section">
        <h3 className="mgr-config-title">Default Order Settings</h3>

        <div className="mgr-config-field">
          <label className="mgr-config-field-label">Default Lot Size</label>
          <input
            type="number"
            value={config.defaultLot}
            onChange={(e) => update({ defaultLot: e.target.value })}
            className="mgr-input"
            step="0.01"
            min="0.01"
          />
        </div>

        <div className="mgr-config-field">
          <label className="mgr-config-field-label">Default SL (points)</label>
          <input
            type="number"
            value={config.defaultSL}
            onChange={(e) => update({ defaultSL: e.target.value })}
            className="mgr-input"
          />
        </div>

        <div className="mgr-config-field">
          <label className="mgr-config-field-label">Default TP (points)</label>
          <input
            type="number"
            value={config.defaultTP}
            onChange={(e) => update({ defaultTP: e.target.value })}
            className="mgr-input"
          />
        </div>
      </div>
    </div>
  );
}
