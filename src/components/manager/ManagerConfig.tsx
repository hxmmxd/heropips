'use client';

import React, { useState } from 'react';

export default function ManagerConfig() {
  const [oneClickTrading, setOneClickTrading] = useState(false);
  const [guardMode, setGuardMode] = useState(false);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [defaultSL, setDefaultSL] = useState('50');
  const [defaultTP, setDefaultTP] = useState('100');
  const [defaultLot, setDefaultLot] = useState('0.01');

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
            onClick={() => setOneClickTrading(!oneClickTrading)}
            className={`mgr-toggle ${oneClickTrading ? 'mgr-toggle-on' : ''}`}
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
            onClick={() => setGuardMode(!guardMode)}
            className={`mgr-toggle ${guardMode ? 'mgr-toggle-on' : ''}`}
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
            onClick={() => setSoundNotifications(!soundNotifications)}
            className={`mgr-toggle ${soundNotifications ? 'mgr-toggle-on' : ''}`}
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
            value={defaultLot}
            onChange={(e) => setDefaultLot(e.target.value)}
            className="mgr-input"
            step="0.01"
            min="0.01"
          />
        </div>

        <div className="mgr-config-field">
          <label className="mgr-config-field-label">Default SL (points)</label>
          <input
            type="number"
            value={defaultSL}
            onChange={(e) => setDefaultSL(e.target.value)}
            className="mgr-input"
          />
        </div>

        <div className="mgr-config-field">
          <label className="mgr-config-field-label">Default TP (points)</label>
          <input
            type="number"
            value={defaultTP}
            onChange={(e) => setDefaultTP(e.target.value)}
            className="mgr-input"
          />
        </div>
      </div>
    </div>
  );
}
