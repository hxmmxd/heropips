'use client';

import React, { useState, useEffect } from 'react';
import { Save, Shield, HelpCircle, CheckCircle, AlertTriangle, Cpu, Zap, Compass, Activity, ArrowRight, ShieldCheck, Sun } from 'lucide-react';

interface GatesConfigTabProps {
  initialConfig: Record<string, any>;
}

type TabCategory = 'core' | 'advanced' | 'risk';

export default function GatesConfigTab({ initialConfig }: GatesConfigTabProps) {
  const [config, setConfig] = useState(initialConfig);
  const [activeCategory, setActiveCategory] = useState<TabCategory>('core');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Read helper with defaults
  const getVal = (key: string, fallback: number) => {
    const val = config[key];
    if (val === undefined || val === null || val === '') return fallback;
    const parsed = Number(val);
    return isNaN(parsed) ? fallback : parsed;
  };

  const getBool = (key: string, fallback: boolean) => {
    const val = config[key];
    if (val === undefined || val === null) return fallback;
    return val === 'true' || val === true;
  };

  const handleSliderChange = (key: string, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (saveSuccess) setSaveSuccess(false);
  };

  const handleToggleChange = (key: string) => {
    const current = getBool(key, true);
    setConfig(prev => ({ ...prev, [key]: !current }));
    if (saveSuccess) setSaveSuccess(false);
  };

  // Selectivity strength calculator based on all 15 gates (12 Technical + 3 Risk)
  const calculateSelectivity = () => {
    let score = 0;
    
    // Core parameters
    const conf = getVal('gate_confluence_min_score', 60);
    const smc = getVal('gate_smc_min_confirmations', 1);
    const cooldown = getVal('gate_cooldown_minutes', 60);
    const news = getVal('gate_news_buffer_minutes', 15);
    const dailyMax = getVal('gate_daily_loss_max_pct', 6.0);
    const drawdownMax = getVal('gate_drawdown_max_pct', 25.0);

    score += (conf - 40) * 1.2; // Conf 40-90
    score += smc * 12; // SMC 0-3
    score += Math.min(30, (cooldown / 240) * 30);
    score += Math.max(0, (10 - dailyMax) * 5); // strict daily limits increase score
    score += Math.max(0, (35 - drawdownMax) * 2);

    // Toggles weighting
    const enabledGates = [
      'gate_confluence_enabled', 'gate_smc_enabled', 'gate_spread_enabled',
      'gate_volatility_enabled', 'gate_cooldown_enabled', 'gate_news_enabled',
      'gate_htf_enabled', 'gate_session_enabled', 'gate_correlation_enabled',
      'gate_mtf_enabled', 'gate_vwap_enabled', 'gate_candle_enabled',
      'gate_ecp_enabled', 'gate_daily_loss_enabled', 'gate_drawdown_enabled'
    ];

    enabledGates.forEach(g => {
      if (getBool(g, true)) score += 5;
    });

    if (score > 135) return { label: 'MAX PROTECTION (AAA+ GRADE ONLY)', color: '#ef4444', desc: 'Squeezes out low-probability setups. Heavy risk blockers active.' };
    if (score > 95) return { label: 'CONSERVATIVE / STABLE', color: '#f97316', desc: 'Strict technical filters with default institutional risk limits.' };
    if (score > 60) return { label: 'BALANCED DEFENSIVE', color: '#10b981', desc: 'Optimized standard settings protecting account equity while capturing moves.' };
    return { label: 'PERMISSIVE (HIGH FREQUENCY)', color: '#3b82f6', desc: 'Low entry filters & high loss buffers. Maximizes transaction rate.' };
  };

  const applyPreset = (presetName: string) => {
    let preset: Record<string, any> = {};
    if (presetName === 'scalper') {
      preset = {
        gate_confluence_min_score: 50,
        gate_smc_min_confirmations: 0,
        gate_spread_min: 0.15,
        gate_volatility_min: 0.3,
        gate_volatility_max: 3.5,
        gate_cooldown_minutes: 15,
        gate_news_buffer_minutes: 5,
        gate_ecp_bootstrap_trades: 10,
        gate_daily_loss_max_pct: 8.0,
        gate_drawdown_max_pct: 30.0,

        // Enabled status mappings
        gate_confluence_enabled: true,
        gate_smc_enabled: false,
        gate_spread_enabled: true,
        gate_volatility_enabled: true,
        gate_cooldown_enabled: true,
        gate_news_enabled: false,
        gate_htf_enabled: true,
        gate_session_enabled: true,
        gate_correlation_enabled: false,
        gate_mtf_enabled: true,
        gate_vwap_enabled: true,
        gate_candle_enabled: true,
        gate_ecp_enabled: true,
        gate_daily_loss_enabled: true,
        gate_drawdown_enabled: true
      };
    } else if (presetName === 'swing') {
      preset = {
        gate_confluence_min_score: 75,
        gate_smc_min_confirmations: 2,
        gate_spread_min: 0.35,
        gate_volatility_min: 0.8,
        gate_volatility_max: 2.0,
        gate_cooldown_minutes: 120,
        gate_news_buffer_minutes: 30,
        gate_ecp_bootstrap_trades: 30,
        gate_daily_loss_max_pct: 4.0,
        gate_drawdown_max_pct: 15.0,

        // All toggles set to true
        gate_confluence_enabled: true,
        gate_smc_enabled: true,
        gate_spread_enabled: true,
        gate_volatility_enabled: true,
        gate_cooldown_enabled: true,
        gate_news_enabled: true,
        gate_htf_enabled: true,
        gate_session_enabled: true,
        gate_correlation_enabled: true,
        gate_mtf_enabled: true,
        gate_vwap_enabled: true,
        gate_candle_enabled: true,
        gate_ecp_enabled: true,
        gate_daily_loss_enabled: true,
        gate_drawdown_enabled: true
      };
    } else {
      // Standard
      preset = {
        gate_confluence_min_score: 60,
        gate_smc_min_confirmations: 1,
        gate_spread_min: 0.25,
        gate_volatility_min: 0.5,
        gate_volatility_max: 2.5,
        gate_cooldown_minutes: 60,
        gate_news_buffer_minutes: 15,
        gate_ecp_bootstrap_trades: 20,
        gate_daily_loss_max_pct: 6.0,
        gate_drawdown_max_pct: 25.0,

        // Standard toggles enabled
        gate_confluence_enabled: true,
        gate_smc_enabled: true,
        gate_spread_enabled: true,
        gate_volatility_enabled: true,
        gate_cooldown_enabled: true,
        gate_news_enabled: true,
        gate_htf_enabled: true,
        gate_session_enabled: true,
        gate_correlation_enabled: true,
        gate_mtf_enabled: true,
        gate_vwap_enabled: true,
        gate_candle_enabled: true,
        gate_ecp_enabled: true,
        gate_daily_loss_enabled: true,
        gate_drawdown_enabled: true
      };
    }

    setConfig(prev => ({ ...prev, ...preset }));
    if (saveSuccess) setSaveSuccess(false);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const keysToSave = [
        'gate_confluence_min_score',
        'gate_smc_min_confirmations',
        'gate_spread_min',
        'gate_volatility_min',
        'gate_volatility_max',
        'gate_cooldown_minutes',
        'gate_news_buffer_minutes',
        'gate_ecp_bootstrap_trades',
        'gate_daily_loss_max_pct',
        'gate_drawdown_max_pct',

        // Toggles
        'gate_confluence_enabled',
        'gate_smc_enabled',
        'gate_spread_enabled',
        'gate_volatility_enabled',
        'gate_cooldown_enabled',
        'gate_news_enabled',
        'gate_htf_enabled',
        'gate_session_enabled',
        'gate_correlation_enabled',
        'gate_mtf_enabled',
        'gate_vwap_enabled',
        'gate_candle_enabled',
        'gate_ecp_enabled',
        'gate_daily_loss_enabled',
        'gate_drawdown_enabled'
      ];

      for (const key of keysToSave) {
        let val = config[key];
        if (val === undefined) {
          if (key.endsWith('_enabled')) {
            val = 'true';
          } else {
            val = String(getVal(key, 0));
          }
        }
        
        const res = await fetch('/api/admin', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configKey: key, configValue: String(val) })
        });

        if (!res.ok) throw new Error(`Failed to save ${key}`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving configs.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectivity = calculateSelectivity();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Slider range styles override */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 5px;
          background: var(--border, #e2e8f0);
          outline: none;
          margin: 10px 0;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ff3c00;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255, 60, 0, 0.4);
          transition: transform 0.1s ease;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }
        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ff3c00;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255, 60, 0, 0.4);
          border: none;
        }
        
        .tab-btn {
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          color: var(--subtext);
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          color: #ff3c00;
          background: rgba(255, 60, 0, 0.05);
          border-color: rgba(255, 60, 0, 0.15);
        }
        .tab-btn:hover:not(.active) {
          color: var(--text);
          background: var(--border);
        }
      `}} />

      {/* Preset selector card */}
      <div className="adm-card adm-card-full" style={{ padding: 20, background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Presets</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--subtext)' }}>Load pre-tuned strategy configurations in one click.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => applyPreset('scalper')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <Zap size={14} color="#3b82f6" /> Scalper Mode
            </button>
            <button
              onClick={() => applyPreset('standard')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <Compass size={14} color="#10b981" /> Balanced Defaults
            </button>
            <button
              onClick={() => applyPreset('swing')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <Cpu size={14} color="#ef4444" /> Swing Institutional
            </button>
          </div>
        </div>
      </div>

      {/* Selectivity Index Card */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', background: selectivity.color,
          boxShadow: `0 0 10px ${selectivity.color}`, flexShrink: 0
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
            Gating Index: <span style={{ color: selectivity.color }}>{selectivity.label}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{selectivity.desc}</div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="adm-card adm-card-full" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border)', borderRadius: 16 }}>
        {/* Card Header with Category Tabs */}
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            <Shield size={18} color="#ff3c00" />
            AI Strategy Gating & Dynamic Thresholds (All 15 Gates)
          </h3>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.02)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap', gap: 4 }}>
            <button className={`tab-btn ${activeCategory === 'core' ? 'active' : ''}`} onClick={() => setActiveCategory('core')}>
              <Compass size={14} /> Core Technicals (1-6)
            </button>
            <button className={`tab-btn ${activeCategory === 'advanced' ? 'active' : ''}`} onClick={() => setActiveCategory('advanced')}>
              <Activity size={14} /> Advanced Stack (7-12)
            </button>

            <button className={`tab-btn ${activeCategory === 'risk' ? 'active' : ''}`} onClick={() => setActiveCategory('risk')}>
              <ShieldCheck size={14} /> Risk Governor (13-15)
            </button>
          </div>
        </div>

        <div className="adm-card-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* CATEGORY 1: CORE TECHNICALS (GATES 1-6) */}
          {activeCategory === 'core' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Gate 1: Confluence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: getBool('gate_confluence_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_confluence_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 1: Min Confluence Score</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_confluence_min_score', 60)}%
                    </span>
                    <div onClick={() => handleToggleChange('gate_confluence_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_confluence_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_confluence_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="30" max="90" step="5" disabled={!getBool('gate_confluence_enabled', true)} value={getVal('gate_confluence_min_score', 60)} onChange={e => handleSliderChange('gate_confluence_min_score', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Calculates aggregated weights of standard filters (RSI, MACD, EMAs) before allowing setups.</span>
              </div>

              {/* Gate 2: SMC */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: getBool('gate_smc_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_smc_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 2: Min SMC Confirmations</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_smc_min_confirmations', 1)} pattern(s)
                    </span>
                    <div onClick={() => handleToggleChange('gate_smc_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_smc_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_smc_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="0" max="3" step="1" disabled={!getBool('gate_smc_enabled', true)} value={getVal('gate_smc_min_confirmations', 1)} onChange={e => handleSliderChange('gate_smc_min_confirmations', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Minimum structural patterns required (Order Blocks, Fair Value Gaps, Sweeps) to validate entries.</span>
              </div>

              {/* Gate 3: HTF Alignment */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, border: '1.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 3: Timeframe Alignment Filter</span>
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Blocks trades if short-term trend conflicts with the primary 1H trend.</span>
                </div>
                <div onClick={() => handleToggleChange('gate_htf_enabled')} style={{ width: 44, height: 22, borderRadius: 22, background: getBool('gate_htf_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: getBool('gate_htf_enabled', true) ? 25 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* Gate 4: Session Filter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, border: '1.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 4: Session Zone Filter</span>
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Restricts execution to active London/New York kill zones. Blocks Asian Session.</span>
                </div>
                <div onClick={() => handleToggleChange('gate_session_enabled')} style={{ width: 44, height: 22, borderRadius: 22, background: getBool('gate_session_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: getBool('gate_session_enabled', true) ? 25 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* Gate 5: Volatility */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, gridColumn: 'span 2', background: getBool('gate_volatility_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_volatility_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 5: ATR Volatility Normal Range</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_volatility_min', 0.5).toFixed(2)}x to {getVal('gate_volatility_max', 2.5).toFixed(2)}x
                    </span>
                    <div onClick={() => handleToggleChange('gate_volatility_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_volatility_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_volatility_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)' }}>Min ATR Limit (Blocks flat/dead sessions)</label>
                    <input type="range" min="0.1" max="1.5" step="0.05" disabled={!getBool('gate_volatility_enabled', true)} value={getVal('gate_volatility_min', 0.5)} onChange={e => handleSliderChange('gate_volatility_min', Number(e.target.value))} className="custom-slider" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)' }}>Max ATR Limit (Blocks massive macro erratic swings)</label>
                    <input type="range" min="1.5" max="5.0" step="0.1" disabled={!getBool('gate_volatility_enabled', true)} value={getVal('gate_volatility_max', 2.5)} onChange={e => handleSliderChange('gate_volatility_max', Number(e.target.value))} className="custom-slider" />
                  </div>
                </div>
              </div>

              {/* Gate 6: Conflict Spread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, gridColumn: 'span 2', background: getBool('gate_spread_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_spread_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 6: Trend Conflict Spread</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {(getVal('gate_spread_min', 0.25) * 100).toFixed(0)}%
                    </span>
                    <div onClick={() => handleToggleChange('gate_spread_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_spread_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_spread_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="10" max="50" step="5" disabled={!getBool('gate_spread_enabled', true)} value={getVal('gate_spread_min', 0.25) * 100} onChange={e => handleSliderChange('gate_spread_min', Number(e.target.value) / 100)} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Required directional spread weight gap to block signals when indicators show conflicting directions.</span>
              </div>
            </div>
          )}

          {/* CATEGORY 2: ADVANCED STACK (GATES 7-12) */}
          {activeCategory === 'advanced' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Gate 7: Cooldown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: getBool('gate_cooldown_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_cooldown_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 7: Signal Cooldown Buffer</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_cooldown_minutes', 60)} minutes
                    </span>
                    <div onClick={() => handleToggleChange('gate_cooldown_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_cooldown_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_cooldown_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="5" max="240" step="5" disabled={!getBool('gate_cooldown_enabled', true)} value={getVal('gate_cooldown_minutes', 60)} onChange={e => handleSliderChange('gate_cooldown_minutes', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Enforces a temporary pause on specific symbols to prevent execution of multiple duplicate positions.</span>
              </div>

              {/* Gate 8: News Buffer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: getBool('gate_news_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_news_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 8: Macro Calendar Buffer</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_news_buffer_minutes', 15)} minutes before
                    </span>
                    <div onClick={() => handleToggleChange('gate_news_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_news_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_news_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="5" max="120" step="5" disabled={!getBool('gate_news_enabled', true)} value={getVal('gate_news_buffer_minutes', 15)} onChange={e => handleSliderChange('gate_news_buffer_minutes', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Blocks setups prior to high-impact economic news announcements (e.g. FOMC, CPI, NFP).</span>
              </div>

              {/* Gate 9: Correlation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, border: '1.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 9: Asset Correlation Agreement</span>
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Verifies correlated assets agree (e.g. DXY must be bearish to buy XAU/USD).</span>
                </div>
                <div onClick={() => handleToggleChange('gate_correlation_enabled')} style={{ width: 44, height: 22, borderRadius: 22, background: getBool('gate_correlation_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: getBool('gate_correlation_enabled', true) ? 25 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* Gate 10: MTF Stack */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, border: '1.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 10: Multi-Timeframe Alignment Stack</span>
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Checks alignment across Weekly, Daily, and 1H candles (need at least 2/3).</span>
                </div>
                <div onClick={() => handleToggleChange('gate_mtf_enabled')} style={{ width: 44, height: 22, borderRadius: 22, background: getBool('gate_mtf_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: getBool('gate_mtf_enabled', true) ? 25 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* Gate 11: VWAP */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, border: '1.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 11: VWAP Boundary Control</span>
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Prevents buying at extreme overbought levels or selling at oversold levels vs VWAP.</span>
                </div>
                <div onClick={() => handleToggleChange('gate_vwap_enabled')} style={{ width: 44, height: 22, borderRadius: 22, background: getBool('gate_vwap_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: getBool('gate_vwap_enabled', true) ? 25 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>

              {/* Gate 12: Candle Pattern */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, border: '1.5px solid var(--border)', borderRadius: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 12: Price Action Candle Pattern</span>
                  <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Blocks trade triggers that conflict with immediate candlestick pattern alerts.</span>
                </div>
                <div onClick={() => handleToggleChange('gate_candle_enabled')} style={{ width: 44, height: 22, borderRadius: 22, background: getBool('gate_candle_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: getBool('gate_candle_enabled', true) ? 25 : 3, transition: 'left 0.2s' }} />
                </div>
              </div>
            </div>
          )}

          {/* CATEGORY 4: RISK MANAGEMENT (GATES 13-15) */}
          {activeCategory === 'risk' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Gate 13: ECP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: getBool('gate_ecp_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_ecp_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 13: ECP Bootstrap Trades</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_ecp_bootstrap_trades', 20)} trades
                    </span>
                    <div onClick={() => handleToggleChange('gate_ecp_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_ecp_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_ecp_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="5" max="50" step="5" disabled={!getBool('gate_ecp_enabled', true)} value={getVal('gate_ecp_bootstrap_trades', 20)} onChange={e => handleSliderChange('gate_ecp_bootstrap_trades', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Minimum closed trades required to seed ECP moving averages (EMA20/SMA50). Autopasses before limit.</span>
              </div>

              {/* Gate 14: Daily Loss Circuit Breaker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: getBool('gate_daily_loss_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_daily_loss_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 14: Max Daily Loss Limit</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_daily_loss_max_pct', 6.0).toFixed(1)}%
                    </span>
                    <div onClick={() => handleToggleChange('gate_daily_loss_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_daily_loss_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_daily_loss_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="1.0" max="15.0" step="0.5" disabled={!getBool('gate_daily_loss_enabled', true)} value={getVal('gate_daily_loss_max_pct', 6.0)} onChange={e => handleSliderChange('gate_daily_loss_max_pct', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Circuit breaker daily drop limit. Caution kicks in at 50% value, Warning at 75%, and Hard Halt at 100%.</span>
              </div>

              {/* Gate 15: Maximum Drawdown Governor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, gridColumn: 'span 2', background: getBool('gate_drawdown_enabled', true) ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: getBool('gate_drawdown_enabled', true) ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gate 15: Max Drawdown Governor</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ff3c00', fontFamily: 'monospace' }}>
                      {getVal('gate_drawdown_max_pct', 25.0).toFixed(1)}%
                    </span>
                    <div onClick={() => handleToggleChange('gate_drawdown_enabled')} style={{ width: 32, height: 16, borderRadius: 16, background: getBool('gate_drawdown_enabled', true) ? '#ff3c00' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: getBool('gate_drawdown_enabled', true) ? 18 : 2, transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                <input type="range" min="5.0" max="40.0" step="1.0" disabled={!getBool('gate_drawdown_enabled', true)} value={getVal('gate_drawdown_max_pct', 25.0)} onChange={e => handleSliderChange('gate_drawdown_max_pct', Number(e.target.value))} className="custom-slider" />
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Halt trading completely if the account equity drops by this percentage from its historical high water mark.</span>
              </div>
            </div>
          )}

          {/* Feedback alerts */}
          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, color: '#22c55e', fontSize: 12, fontWeight: 700 }}>
              <CheckCircle size={15} /> All technical and risk governor configurations saved successfully.
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700 }}>
              <AlertTriangle size={15} /> Save failed: {error}
            </div>
          )}

          {/* Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'black',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isSaving ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <Save size={15} />
              {isSaving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
