'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Smartphone, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PlatformTabProps {
  initialConfig: Record<string, any>;
}

export default function PlatformTab({ initialConfig }: PlatformTabProps) {
  const [config, setConfig] = useState(initialConfig);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const getBoolVal = (key: string, defaultVal = true) => {
    const val = config[key];
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    return val === 'true';
  };

  const toggleConfig = async (key: string, defaultVal = true) => {
    const current = getBoolVal(key, defaultVal);
    const newVal = !current;
    
    setConfig(prev => ({ ...prev, [key]: newVal }));
    setSavingKey(key);

    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configKey: key, configValue: newVal }),
      });
    } catch (err) {
      console.error('Failed to update config:', err);
    } finally {
      setTimeout(() => setSavingKey(null), 600);
    }
  };

  const toggleFeatureFlag = async (flagKey: string, currentVal: boolean) => {
    const updatedFlags = { ...(config.feature_flags || {}), [flagKey]: !currentVal };
    setConfig(prev => ({ ...prev, feature_flags: updatedFlags }));
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'feature_flags', configValue: updatedFlags }),
    });
  };

  const isPhoneAuthRequired = getBoolVal('phone_verification_required', true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Security Banner Highlight */}
      <div 
        style={{
          padding: '18px 24px',
          borderRadius: 16,
          background: isPhoneAuthRequired ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
          border: `1.5px solid ${isPhoneAuthRequired ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div 
            style={{ 
              width: 42, 
              height: 42, 
              borderRadius: 12, 
              background: isPhoneAuthRequired ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPhoneAuthRequired ? '#10b981' : '#ef4444'
            }}
          >
            <Smartphone size={22} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Mobile Phone Verification: 
              <span style={{ color: isPhoneAuthRequired ? '#10b981' : '#ef4444', textTransform: 'uppercase' }}>
                {isPhoneAuthRequired ? 'System Enforced (Active)' : 'Disabled (Bypassed)'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 2 }}>
              {isPhoneAuthRequired 
                ? 'All new and unverified traders are required to complete SMS OTP verification before accessing the trading terminal.'
                : 'Phone verification is currently disabled. Users can freely access trading terminal without SMS OTP gates.'}
            </div>
          </div>
        </div>

        <button
          onClick={() => toggleConfig('phone_verification_required', true)}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            background: isPhoneAuthRequired ? '#ef4444' : '#10b981',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 4px 14px ${isPhoneAuthRequired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          {isPhoneAuthRequired ? 'Disable Mobile Verification' : 'Enable Mobile Verification'}
        </button>
      </div>

      {/* Main System Controls */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} color="#ff3c00" />
            System Controls & Authentication Gates
          </h3>
        </div>
        <div className="adm-card-body" style={{ padding: 20 }}>
          <div className="adm-toggle-list">
            {[
              { 
                key: 'phone_verification_required', 
                label: 'Mandatory Phone Verification', 
                desc: 'Require users to verify their mobile number via 6-digit SMS OTP before accessing terminal & live signals',
                default: true,
                badge: 'SECURITY GATE'
              },
              { 
                key: 'maintenance_mode', 
                label: 'Maintenance Mode', 
                desc: 'Display client-facing maintenance screen to all users',
                default: false
              },
              { 
                key: 'ai_kill_switch', 
                label: 'AI Signal Kill Switch', 
                desc: 'Immediately pause all automated AI signal execution pipelines',
                default: false
              },
              { 
                key: 'new_registrations', 
                label: 'Allow Registrations', 
                desc: 'Permit new traders to register and create accounts',
                default: true
              },
              { 
                key: 'demo_mode', 
                label: 'Demo Mode Simulation', 
                desc: 'Route broker signals directly to simulator accounts',
                default: false
              },
            ].map(t => {
              const active = getBoolVal(t.key, t.default);
              return (
                <div key={t.key} className="adm-toggle-row" style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 10, background: active ? 'rgba(0,0,0,0.01)' : 'transparent' }}>
                  <div className="adm-toggle-info">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p className="adm-toggle-name" style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{t.label}</p>
                        {t.badge && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#ff3c00', color: '#fff', letterSpacing: 0.5 }}>
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <p className="adm-toggle-desc" style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--subtext)' }}>{t.desc}</p>
                    </div>
                  </div>
                  <div
                    className={`adm-switch ${active ? 'adm-switch-on' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleConfig(t.key, t.default)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="adm-switch-track">
                      <span className="adm-switch-thumb" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Feature Gates</h3>
        </div>
        <div className="adm-card-body" style={{ padding: 20 }}>
          {config.feature_flags ? (
            <div className="adm-toggle-list">
              {Object.entries(config.feature_flags as Record<string, boolean>).map(([key, val]) => (
                <div key={key} className="adm-toggle-row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="adm-toggle-info">
                    <div>
                      <p className="adm-toggle-name" style={{ textTransform: 'capitalize', margin: 0, fontWeight: 700, fontSize: 13 }}>
                        {key.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`adm-switch ${val ? 'adm-switch-on' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleFeatureFlag(key, val)}
                    style={{ cursor: 'pointer' }}
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
