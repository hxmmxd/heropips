'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, TrendingUp, BarChart3, Coins, Server, Eye, EyeOff, Loader2, ChevronRight, Zap } from 'lucide-react';

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

const exchanges: ExchangeOption[] = [
  { id: 'mt5', name: 'MetaTrader 5', icon: <TrendingUp />, category: 'forex', color: '#3b82f6', description: 'Forex, Gold, Indices' },
  { id: 'mt4', name: 'MetaTrader 4', icon: <BarChart3 />, category: 'forex', color: '#6366f1', description: 'Forex, CFDs' },
  { id: 'ctrader', name: 'cTrader', icon: <Zap />, category: 'forex', color: '#a855f7', description: 'Forex, Metals' },
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const activeExchange = exchanges.find(e => e.id === selected)!;
  const isCrypto = activeExchange.category === 'crypto';

  React.useEffect(() => {
    if (!isOpen) return;
    if (isCrypto) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/broker?q=${encodeURIComponent(serverName)}`);
        const data = await res.json();
        if (data.servers) {
          setSuggestions(data.servers);
          setIsSimulation(!!data.isSimulation);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };

    const delay = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(delay);
  }, [serverName, isOpen, isCrypto]);

  const handleReset = () => {
    setStep(1);
    setServerName('');
    setLoginId('');
    setPassword('');
    setShowPassword(false);
    setShowSuggestions(false);
    setConnecting(false);
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

            <form onSubmit={handleSubmit} className="bm-form">
              {/* Broker Server (forex only) */}
              {!isCrypto && (
                <div className="bm-field">
                  <label><Server className="bm-field-icon" /> Broker Server</label>
                  <div className="bm-input-wrap">
                    <input
                      type="text"
                      placeholder={selected === 'ctrader' ? 'e.g. demo.ctrader.com' : 'e.g. ICMarketsSC-Live'}
                      value={serverName}
                      onChange={e => { setServerName(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      required autoComplete="off"
                    />
                  </div>
                  {showSuggestions && (suggestions.length > 0 || loading) && (
                    <div className="bm-suggestions">
                      {loading && (
                        <div className="bm-suggest-loading">
                          <span>Searching servers...</span>
                          <Loader2 className="bm-spin" />
                        </div>
                      )}
                      {!loading && suggestions.map(srv => (
                        <div key={srv} className="bm-suggest-item" role="button" tabIndex={0}
                          onClick={() => { setServerName(srv); setShowSuggestions(false); }}>
                          <Server /> {srv}
                        </div>
                      ))}
                      {isSimulation && !loading && (
                        <div className="bm-suggest-note">💡 Showing simulated results</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Login / API Key */}
              <div className="bm-field">
                <label>{isCrypto ? '🔑 API Key' : `👤 ${selected === 'ctrader' ? 'cTrader ID' : 'Account Login'}`}</label>
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
                <button type="submit" className="bm-connect" disabled={connecting}
                  style={{ background: activeExchange.color }}>
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
