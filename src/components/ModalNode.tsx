'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, TrendingUp, BarChart3, Coins, Server, Eye, EyeOff, Loader2, ChevronRight, Zap, Handshake, Star } from 'lucide-react';

interface ModalNodeProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (server: string, login: string, password: string) => void;
}

type ExchangeType = 'mt5' | 'mt4' | 'ctrader' | 'binance' | 'bybit';

interface ExchangeOption {
  id: ExchangeType;
  name: string;
  icon: React.ReactNode;
  category: 'forex' | 'crypto';
  color: string;
  description: string;
}

interface PartnerBroker {
  id: string;
  name: string;
  logo: string;
  platform: 'mt5' | 'mt4' | 'ctrader';
  servers: string[];
  rebate_per_lot: number;
  rebate_currency: string;
  website: string;
  is_active: boolean;
}

const exchanges: ExchangeOption[] = [
  { id: 'mt5', name: 'MetaTrader 5', icon: <TrendingUp />, category: 'forex', color: '#3b82f6', description: 'Forex, Gold, Indices' },
  { id: 'binance', name: 'Binance', icon: <Coins />, category: 'crypto', color: '#f59e0b', description: 'Crypto Spot & Futures' },
  { id: 'bybit', name: 'Bybit', icon: <Coins />, category: 'crypto', color: '#f97316', description: 'Crypto Derivatives' },
];

export default function ModalNode({ isOpen, onClose, onConnect }: ModalNodeProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<ExchangeType>('mt5');
  const [serverName, setServerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Partner brokers
  const [partnerBrokers, setPartnerBrokers] = useState<PartnerBroker[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerBroker | null>(null);
  const [partnerExpanded, setPartnerExpanded] = useState<string | null>(null); // which partner's server list is open

  const activeExchange = exchanges.find(e => e.id === selected)!;
  const isCrypto = activeExchange.category === 'crypto';

  // Filter partners for the selected platform
  const relevantPartners = partnerBrokers.filter(p => p.platform === selected);

  // Fetch partner brokers once on open
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/partner-brokers')
      .then(r => r.json())
      .then(d => setPartnerBrokers(d.brokers || []))
      .catch(() => {});
  }, [isOpen]);

  const handleReset = () => {
    setStep(1);
    setServerName('');
    setLoginId('');
    setPassword('');
    setShowPassword(false);
    setConnecting(false);
    setSelectedPartner(null);
    setPartnerExpanded(null);
  };

  const handleClose = () => { handleReset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCrypto) {
      if (!loginId.trim() || !password.trim()) return;
    } else {
      if (!serverName.trim() || !loginId.trim() || !password.trim()) return;
    }
    setConnecting(true);
    onConnect(isCrypto ? selected : serverName.trim(), loginId.trim(), password.trim());
    setTimeout(() => { handleReset(); onClose(); }, 300);
  };

  const handleSelectPartnerServer = (partner: PartnerBroker, server: string) => {
    setSelectedPartner(partner);
    setServerName(server);
    setPartnerExpanded(null);
  };

  if (!isOpen) return null;

  return (
    <div className="bm-overlay" onClick={handleClose}>
      <div className="bm-container" onClick={e => e.stopPropagation()}>
        {/* Close */}
        <div className="bm-close" role="button" tabIndex={0} onClick={handleClose}><X /></div>

        {/* Step 1: Exchange Selection */}
        {step === 1 && (
          <div className="bm-step bm-step-in">
            <div className="bm-header">
              <ShieldCheck className="bm-header-icon" />
              <h2>Connect Exchange</h2>
              <p>Choose your trading platform to get started</p>
            </div>

            {/* Category: Forex */}
            <div className="bm-category">
              <span className="bm-category-label"><TrendingUp /> Forex · Metals · Indices</span>
              <div className="bm-pills">
                {exchanges.filter(e => e.category === 'forex').map(ex => (
                  <div
                    key={ex.id}
                    className={`bm-pill ${selected === ex.id ? 'bm-pill-active' : ''}`}
                    style={{ '--pill-color': ex.color } as React.CSSProperties}
                    role="button" tabIndex={0}
                    onClick={() => setSelected(ex.id)}
                  >
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

            {/* Category: Crypto */}
            <div className="bm-category">
              <span className="bm-category-label"><Coins /> Crypto Exchanges</span>
              <div className="bm-pills">
                {exchanges.filter(e => e.category === 'crypto').map(ex => (
                  <div
                    key={ex.id}
                    className={`bm-pill ${selected === ex.id ? 'bm-pill-active' : ''}`}
                    style={{ '--pill-color': ex.color } as React.CSSProperties}
                    role="button" tabIndex={0}
                    onClick={() => setSelected(ex.id)}
                  >
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

        {/* Step 2: Credentials */}
        {step === 2 && (
          <div className="bm-step bm-step-in">
            <div className="bm-header">
              <div className="bm-selected-badge" style={{ background: activeExchange.color + '18', color: activeExchange.color }}>
                {activeExchange.icon} {activeExchange.name}
              </div>
              <h2>{isCrypto ? 'Enter API Credentials' : 'Enter Account Details'}</h2>
              <p>{isCrypto ? 'Use a read/trade-only API key — never enable withdrawals' : 'Your credentials are encrypted end-to-end'}</p>
            </div>

            {/* ── Partner Brokers (forex only) ── */}
            {!isCrypto && relevantPartners.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Handshake style={{ width: 13, height: 13, color: '#10b981' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recommended Partner Brokers
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {relevantPartners.map(pb => {
                    const isSelected = selectedPartner?.id === pb.id;
                    const isExpanded = partnerExpanded === pb.id;
                    return (
                      <div key={pb.id} style={{
                        border: `1.5px solid ${isSelected ? '#10b981' : 'var(--border)'}`,
                        borderRadius: 12,
                        background: isSelected ? 'rgba(16,185,129,0.05)' : 'var(--input-bg)',
                        overflow: 'hidden',
                        transition: 'border-color 0.2s',
                      }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                          onClick={() => setPartnerExpanded(isExpanded ? null : pb.id)}>
                          <span style={{ fontSize: 22, lineHeight: 1 }}>{pb.logo}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{pb.name}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', textTransform: 'uppercase' }}>{pb.platform}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>
                                <Star style={{ width: 9, height: 9, display: 'inline', verticalAlign: 'middle' }} /> ${pb.rebate_per_lot}/lot rebate
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--subtext)' }}>{pb.servers.length} server{pb.servers.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--subtext)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                        </div>

                        {/* Server list (expanded) */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {pb.servers.map(srv => (
                              <div key={srv}
                                onClick={() => handleSelectPartnerServer(pb, srv)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                                  background: serverName === srv ? 'rgba(16,185,129,0.08)' : 'transparent',
                                  border: `1px solid ${serverName === srv ? '#10b981' : 'transparent'}`,
                                  transition: 'all 0.15s',
                                }}
                              >
                                <Server style={{ width: 12, height: 12, color: serverName === srv ? '#10b981' : 'var(--subtext)', flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}>{srv}</span>
                                {serverName === srv && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', fontWeight: 700 }}>Selected ✓</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isCrypto && relevantPartners.length === 0 && (
              <div style={{
                marginBottom: 16,
                padding: '16px',
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, display: 'block', marginBottom: 4 }}>No Partner Brokers Configured</span>
                <span style={{ fontSize: 11, color: 'var(--subtext)' }}>Forex connections are currently restricted to partner brokers. Please contact support.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bm-form">
              {/* Selected Partner Server Display (forex only) */}
              {!isCrypto && (
                <div className="bm-field" style={{ marginBottom: 16 }}>
                  {serverName ? (
                    <div style={{
                      padding: '12px 14px',
                      background: 'rgba(16,185,129,0.06)',
                      border: '1.5px solid #10b981',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Selected Server</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{serverName}</span>
                      </div>
                      {selectedPartner && (
                        <span style={{ fontSize: 11, color: 'var(--subtext)' }}>
                          via {selectedPartner.name}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 14px',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1.5px dashed #ef4444',
                      borderRadius: 12,
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
                        Please select a partner broker server above to continue
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Login / API Key */}
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

              {/* Password / API Secret */}
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

              {/* Actions */}
              <div className="bm-actions">
                <div className="bm-back" role="button" tabIndex={0} onClick={() => setStep(1)}>← Back</div>
                <button type="submit" className="bm-connect" disabled={connecting || (!isCrypto && !serverName)}
                  style={{ background: (!isCrypto && !serverName) ? 'var(--border)' : activeExchange.color, cursor: (!isCrypto && !serverName) ? 'not-allowed' : 'pointer' }}>
                  {connecting ? <><Loader2 className="bm-spin" /> Connecting...</> : <>Connect {activeExchange.name}</>}
                </button>
              </div>

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
