'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ShieldCheck, TrendingUp, Coins, Server, Eye, EyeOff,
  Loader2, ChevronRight, Search, CheckCircle, XCircle,
  AlertCircle, Globe, ChevronDown,
} from 'lucide-react';

interface ModalNodeProps {
  isOpen: boolean;
  onClose: () => void;
  /** Now async — throws on connection error so modal can show inline error */
  onConnect: (server: string, login: string, password: string) => Promise<void>;
}

type ExchangeType = 'mt5' | 'binance' | 'bybit';
type VerifyState = 'idle' | 'checking' | 'ok' | 'fail' | 'skip';

interface VerifyResult {
  reachable: boolean;
  broker?: string | null;
  country?: string | null;
  type?: string | null;
  note?: string | null;
}

const exchanges = [
  { id: 'mt5' as ExchangeType,     name: 'MetaTrader 5', icon: <TrendingUp />, category: 'forex', color: '#3b82f6', description: 'Forex, Gold, Indices' },
  { id: 'binance' as ExchangeType, name: 'Binance',       icon: <Coins />,     category: 'crypto', color: '#f59e0b', description: 'Crypto Spot & Futures' },
  { id: 'bybit' as ExchangeType,   name: 'Bybit',         icon: <Coins />,     category: 'crypto', color: '#f97316', description: 'Crypto Derivatives' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function ModalNode({ isOpen, onClose, onConnect }: ModalNodeProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<ExchangeType>('mt5');

  // ── Partner Brokers configuration (Admin synchronized) ──
  const [partnerBrokers, setPartnerBrokers] = useState<any[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [showBrokerSelectDropdown, setShowBrokerSelectDropdown] = useState(false);
  const [showServerSelectDropdown, setShowServerSelectDropdown] = useState(false);

  const brokerSelectRef = useRef<HTMLDivElement>(null);
  const serverSelectRef = useRef<HTMLDivElement>(null);

  // ── Server selection ──
  const [serverName, setServerName] = useState('');

  // ── Verification ──
  const [verifyState, setVerifyState] = useState<VerifyState>('idle');

  // ── Credentials ──
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const activeExchange = exchanges.find(e => e.id === selected)!;
  const isCrypto = activeExchange.category === 'crypto';

  // Fetch partner brokers from admin settings
  useEffect(() => {
    if (isOpen) {
      setLoadingPartners(true);
      fetch('/api/partner-brokers')
        .then(r => r.json())
        .then(d => {
          setPartnerBrokers(d.brokers || []);
        })
        .catch(() => {})
        .finally(() => setLoadingPartners(false));
    }
  }, [isOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (brokerSelectRef.current && !brokerSelectRef.current.contains(e.target as Node)) {
        setShowBrokerSelectDropdown(false);
      }
      if (serverSelectRef.current && !serverSelectRef.current.contains(e.target as Node)) {
        setShowServerSelectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleReset = useCallback(() => {
    setStep(1); setServerName(''); setVerifyState('idle');
    setLoginId(''); setPassword(''); setShowPassword(false); setConnecting(false); setConnectError(null);
    setSelectedPartnerId(''); setShowBrokerSelectDropdown(false); setShowServerSelectDropdown(false);
  }, []);

  const handleClose = () => { handleReset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCrypto) {
      if (!loginId.trim() || !password.trim()) return;
    } else {
      if (!serverName.trim() || !loginId.trim() || !password.trim()) return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      await onConnect(isCrypto ? selected : serverName.trim(), loginId.trim(), password.trim());
      // Success — close modal and reset
      setTimeout(() => { handleReset(); onClose(); }, 300);
    } catch (err: any) {
      // Show error inline — don't close the modal
      setConnectError(err?.message || 'Connection failed. Please check your details and try again.');
      setConnecting(false);
    }
  };

  const canConnect = isCrypto
    ? loginId.trim() && password.trim()
    : serverName.trim() && loginId.trim() && password.trim() && (verifyState === 'ok' || verifyState === 'skip');

  if (!isOpen) return null;

  return (
    <div className="bm-overlay" onClick={handleClose}>
      <div className="bm-container" onClick={e => e.stopPropagation()}>
        <div className="bm-close" role="button" tabIndex={0} onClick={handleClose}><X /></div>

        {/* ══ STEP 1: Platform selection ══ */}
        {step === 1 && (
          <div className="bm-step bm-step-in">
            <div className="bm-header">
              <ShieldCheck className="bm-header-icon" />
              <h2>Connect Exchange</h2>
              <p>Choose your trading platform to get started</p>
            </div>

            <div className="bm-category">
              <span className="bm-category-label"><TrendingUp /> Forex · Metals · Indices</span>
              <div className="bm-pills">
                {exchanges.filter(e => e.category === 'forex').map(ex => (
                  <div key={ex.id} className={`bm-pill ${selected === ex.id ? 'bm-pill-active' : ''}`}
                    style={{ '--pill-color': ex.color } as React.CSSProperties}
                    role="button" tabIndex={0} onClick={() => setSelected(ex.id)}>
                    <div className="bm-pill-icon">{ex.icon}</div>
                    <div className="bm-pill-info">
                      <span className="bm-pill-name">{ex.name}</span>
                      <span className="bm-pill-desc">{ex.description}</span>
                    </div>
                    {selected === ex.id && <div className="bm-pill-check">✓</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bm-category">
              <span className="bm-category-label"><Coins /> Crypto Exchanges</span>
              <div className="bm-pills">
                {exchanges.filter(e => e.category === 'crypto').map(ex => (
                  <div key={ex.id} className={`bm-pill ${selected === ex.id ? 'bm-pill-active' : ''}`}
                    style={{ '--pill-color': ex.color } as React.CSSProperties}
                    role="button" tabIndex={0} onClick={() => setSelected(ex.id)}>
                    <div className="bm-pill-icon">{ex.icon}</div>
                    <div className="bm-pill-info">
                      <span className="bm-pill-name">{ex.name}</span>
                      <span className="bm-pill-desc">{ex.description}</span>
                    </div>
                    {selected === ex.id && <div className="bm-pill-check">✓</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bm-pill-continue" role="button" tabIndex={0} onClick={() => setStep(2)}>
              Continue with {activeExchange.name} <ChevronRight />
            </div>
          </div>
        )}

        {/* ══ STEP 2: Broker search + credentials ══ */}
        {step === 2 && (
          <div className="bm-step bm-step-in">
            <div className="bm-header">
              <div className="bm-selected-badge" style={{ background: activeExchange.color + '18', color: activeExchange.color }}>
                {activeExchange.icon} {activeExchange.name}
              </div>
              <h2>{isCrypto ? 'Enter API Credentials' : 'Enter Account Details'}</h2>
              <p>{isCrypto ? 'Use a read/trade-only API key — never enable withdrawals' : 'Your credentials are encrypted end-to-end'}</p>
            </div>

            <form onSubmit={handleSubmit} className="bm-form">

              {/* ── MT5: broker search + server picker ── */}
              {/* ── MT5: broker search + server picker ── */}
              {!isCrypto && (
                <div style={{ marginBottom: 20 }}>
                  {/* Custom Broker Select Dropdown */}
                  <div ref={brokerSelectRef} style={{ position: 'relative', marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)', display: 'block', marginBottom: 6 }}>
                      Select Broker
                    </label>
                    <div
                      onClick={() => setShowBrokerSelectDropdown(!showBrokerSelectDropdown)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: 'var(--input-bg)', border: '1.5px solid var(--border)',
                        borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(() => {
                          const partner = partnerBrokers.find(p => p.id === selectedPartnerId);
                          return partner ? (
                            <>
                              <span style={{ fontSize: 18 }}>{partner.logo || '🏦'}</span>
                              <span style={{ fontWeight: 600 }}>{partner.name}</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--subtext)' }}>Choose a partner broker...</span>
                          );
                        })()}
                      </div>
                      <ChevronDown style={{ width: 14, height: 14, color: 'var(--subtext)' }} />
                    </div>

                    {showBrokerSelectDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        background: 'var(--sidebar-bg)', border: '1.5px solid var(--border)',
                        borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}>
                        {loadingPartners ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--subtext)', fontSize: 12 }}>
                            Loading brokers...
                          </div>
                        ) : partnerBrokers.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--subtext)', fontSize: 12 }}>
                            No active partner brokers configured.
                          </div>
                        ) : (
                          partnerBrokers.map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedPartnerId(p.id);
                                setServerName('');
                                setVerifyState('idle');
                                setShowBrokerSelectDropdown(false);
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                background: selectedPartnerId === p.id ? 'rgba(59,130,246,0.06)' : 'transparent',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = selectedPartnerId === p.id ? 'rgba(59,130,246,0.06)' : 'transparent')}
                            >
                              <span style={{ fontSize: 20 }}>{p.logo || '🏦'}</span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.name}</span>
                                <span style={{ fontSize: 10, color: '#10b981' }}>💰 ${p.rebate_per_lot}/lot rebate</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Server Select Dropdown */}
                  {(() => {
                    const partner = partnerBrokers.find(p => p.id === selectedPartnerId);
                    return partner && (
                      <div ref={serverSelectRef} style={{ position: 'relative', marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)', display: 'block', marginBottom: 6 }}>
                          Select Server
                        </label>
                        <div
                          onClick={() => setShowServerSelectDropdown(!showServerSelectDropdown)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', background: 'var(--input-bg)', border: '1.5px solid var(--border)',
                            borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Server style={{ width: 13, height: 13, color: '#3b82f6' }} />
                            {serverName ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{serverName}</span>
                            ) : (
                              <span style={{ color: 'var(--subtext)' }}>Choose server...</span>
                            )}
                          </div>
                          <ChevronDown style={{ width: 14, height: 14, color: 'var(--subtext)' }} />
                        </div>

                        {showServerSelectDropdown && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            background: 'var(--sidebar-bg)', border: '1.5px solid var(--border)',
                            borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          }}>
                            {(partner.servers || []).length === 0 ? (
                              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--subtext)', fontSize: 12 }}>
                                No servers configured for this broker.
                              </div>
                            ) : (
                              partner.servers.map((srv: string) => (
                                <div
                                  key={srv}
                                  onClick={() => {
                                    setServerName(srv);
                                    setVerifyState('ok'); // automatically verified
                                    setShowServerSelectDropdown(false);
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 14px', cursor: 'pointer',
                                    borderBottom: '1px solid var(--border)',
                                    background: serverName === srv ? 'rgba(16,185,129,0.06)' : 'transparent',
                                    transition: 'background 0.12s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-bg)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = serverName === srv ? 'rgba(16,185,129,0.06)' : 'transparent')}
                                >
                                  <Server style={{ width: 12, height: 12, color: 'var(--subtext)' }} />
                                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>{srv}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── Login ── */}
              <div className="bm-field">
                <label>{isCrypto ? '🔑 API Key' : '👤 Account Login'}</label>
                <div className="bm-input-wrap">
                  <input
                    type="text"
                    placeholder={isCrypto ? 'Paste your API key' : 'e.g. 5050880841'}
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    required
                    inputMode={isCrypto ? undefined : 'numeric'}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* ── Password ── */}
              <div className="bm-field">
                <label>{isCrypto ? '🔐 API Secret' : '🔒 Password'}</label>
                <div className="bm-input-wrap bm-input-pass">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isCrypto ? 'Paste your API secret' : 'Master or Investor password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <div className="bm-pass-toggle" role="button" tabIndex={0}
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="bm-actions">
                <div className="bm-back" role="button" tabIndex={0} onClick={() => setStep(1)}>← Back</div>
                <button
                  type="submit"
                  className="bm-connect"
                  disabled={!canConnect || connecting}
                  style={{
                    background: canConnect ? activeExchange.color : 'var(--border)',
                    cursor: canConnect ? 'pointer' : 'not-allowed',
                    opacity: canConnect ? 1 : 0.6,
                  }}
                >
                  {connecting
                    ? <><Loader2 className="bm-spin" /> Connecting…</>
                    : !isCrypto && !serverName ? 'Search or enter a server above'
                    : !isCrypto && verifyState === 'idle' && serverName ? 'Verify server first'
                    : <>Connect {activeExchange.name}</>}
                </button>
              </div>

              {/* ── Error Banner ── */}
              {connectError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 12,
                }}>
                  <XCircle style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#ef4444', lineHeight: 1.4 }}>{connectError}</span>
                </div>
              )}

              <p className="bm-disclaimer">
                <ShieldCheck /> Encrypted end-to-end · Never stored locally
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
