import React, { useState, useEffect } from 'react';

interface PlatformTabProps {
  initialConfig: Record<string, any>;
}

export default function PlatformTab({ initialConfig }: PlatformTabProps) {
  const [config, setConfig] = useState(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const toggleConfig = async (key: string) => {
    const newVal = !config[key];
    setConfig(prev => ({ ...prev, [key]: newVal }));
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: key, configValue: newVal })
    });
  };

  const toggleFeatureFlag = async (flagKey: string, currentVal: boolean) => {
    const updatedFlags = { ...config.feature_flags, [flagKey]: !currentVal };
    setConfig(prev => ({ ...prev, feature_flags: updatedFlags }));
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'feature_flags', configValue: updatedFlags })
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Platform Toggles */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>System Controls</h3>
        </div>
        <div className="adm-card-body">
          <div className="adm-toggle-list">
            {[
              { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Display client-facing maintenance screen to all users' },
              { key: 'ai_kill_switch', label: 'AI Signal Kill Switch', desc: 'Immediately pause all automated AI signal execution pipelines' },
              { key: 'new_registrations', label: 'Allow Registrations', desc: 'Permit new traders to register and create accounts' },
              { key: 'demo_mode', label: 'Demo Mode Simulation', desc: 'Route broker signals directly to simulator accounts' },
            ].map(t => (
              <div key={t.key} className="adm-toggle-row">
                <div className="adm-toggle-info">
                  <div>
                    <p className="adm-toggle-name">{t.label}</p>
                    <p className="adm-toggle-desc">{t.desc}</p>
                  </div>
                </div>
                <div
                  className={`adm-switch ${config[t.key] ? 'adm-switch-on' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleConfig(t.key)}
                >
                  <span className="adm-switch-track">
                    <span className="adm-switch-thumb" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Feature Gates</h3>
        </div>
        <div className="adm-card-body">
          {config.feature_flags ? (
            <div className="adm-toggle-list">
              {Object.entries(config.feature_flags as Record<string, boolean>).map(([key, val]) => (
                <div key={key} className="adm-toggle-row">
                  <div className="adm-toggle-info">
                    <div>
                      <p className="adm-toggle-name" style={{ textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`adm-switch ${val ? 'adm-switch-on' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFeatureFlag(key, val)}
                  >
                    <span className="adm-switch-track">
                      <span className="adm-switch-thumb" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--subtext)', padding: '12px 0' }}>No feature gates configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
