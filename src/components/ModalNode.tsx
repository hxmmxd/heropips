'use client';

import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface ModalNodeProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (server: string, login: string, password: string) => void;
}

export default function ModalNode({ isOpen, onClose, onConnect }: ModalNodeProps) {
  const [serverName, setServerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/broker?q=${encodeURIComponent(serverName)}`);
        const data = await res.json();
        if (data.servers) {
          setSuggestions(data.servers);
          setIsSimulation(!!data.isSimulation);
        }
      } catch (err) {
        console.error('Failed to fetch server suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [serverName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim() || !loginId.trim() || !password.trim()) return;

    onConnect(serverName.trim(), loginId.trim(), password.trim());

    // Reset fields
    setServerName('');
    setLoginId('');
    setPassword('');
    setShowSuggestions(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-glass w-full max-w-sm p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--subtext)]">
              Initialize MT5 Node
            </span>
          </div>
          <button onClick={onClose} className="text-[var(--subtext)] hover:opacity-80 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Broker Server */}
          <div className="relative">
            <label className="text-[9px] uppercase tracking-widest text-[var(--subtext)] font-bold mb-1.5 block">
              Broker Server
            </label>
            <input
              type="text"
              placeholder="e.g. ICMarketsSC-Live"
              value={serverName}
              onChange={(e) => {
                setServerName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="w-full bg-[var(--input-bg)] border-none p-4 rounded-xl outline-none text-sm font-mono text-[var(--text)] placeholder-[var(--subtext)]/60"
              required
              autoComplete="off"
            />
            {showSuggestions && (suggestions.length > 0 || loading) && (
              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl z-50 shadow-lg modal-glass divide-y divide-[var(--border)]/30">
                {loading && (
                  <div className="p-3 text-[10px] text-[var(--subtext)] font-mono flex items-center justify-between">
                    <span>Searching MT5 servers registry...</span>
                    <div className="w-3 h-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                )}
                {!loading && suggestions.map((srv) => (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => {
                      setServerName(srv);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left p-3 text-xs font-mono text-[var(--text)] hover:bg-blue-500/10 hover:text-blue-400 transition"
                  >
                    {srv}
                  </button>
                ))}
                {isSimulation && !loading && (
                  <div className="p-3 text-[9px] text-[var(--subtext)]/80 font-sans bg-yellow-500/5 leading-relaxed">
                    💡 Showing simulator suggestions. Add your <code className="text-yellow-400 font-mono text-[8px] bg-yellow-500/10 px-1 py-0.5 rounded">META_API_TOKEN</code> in <code className="text-yellow-400 font-mono text-[8px] bg-yellow-500/10 px-1 py-0.5 rounded">.env.local</code> to search MT5 registry live.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. MT5 User ID */}
          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--subtext)] font-bold mb-1.5 block">
              MT5 User ID
            </label>
            <input
              type="text"
              placeholder="e.g. 882910"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full bg-[var(--input-bg)] border-none p-4 rounded-xl outline-none text-sm font-mono text-[var(--text)] placeholder-[var(--subtext)]/60"
              required
              inputMode="numeric"
            />
          </div>

          {/* 3. Password */}
          <div>
            <label className="text-[9px] uppercase tracking-widest text-[var(--subtext)] font-bold mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              placeholder="MT5 Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--input-bg)] border-none p-4 rounded-xl outline-none text-sm font-mono text-[var(--text)] placeholder-[var(--subtext)]/60"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[var(--text)] text-[var(--bg)] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest mt-2 active:scale-95 hover:opacity-90 transition"
          >
            Connect Account
          </button>

          <p className="text-[9px] text-[var(--subtext)]/60 text-center leading-relaxed">
            Credentials are encrypted end-to-end and never stored locally.
          </p>
        </form>
      </div>
    </div>
  );
}
