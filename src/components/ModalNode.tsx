'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ModalNodeProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (name: string, loginId: string, password?: string, server?: string) => void;
}

export default function ModalNode({ isOpen, onClose, onAddNode }: ModalNodeProps) {
  const [brokerName, setBrokerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [serverName, setServerName] = useState('');
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
    if (!brokerName.trim() || !loginId.trim()) return;

    onAddNode(brokerName.trim(), loginId.trim(), password.trim(), serverName.trim());

    // Reset fields
    setBrokerName('');
    setLoginId('');
    setPassword('');
    setServerName('');
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--subtext)]">
            Initialize MT5 Node
          </span>
          <button onClick={onClose} className="text-[var(--subtext)] hover:opacity-80 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Broker Display Name"
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            className="w-full bg-[var(--input-bg)] border-none p-4 rounded-xl outline-none text-sm font-medium text-[var(--text)] placeholder-[var(--subtext)]/60"
            required
          />
          <input
            type="text"
            placeholder="MT5 Login ID"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full bg-[var(--input-bg)] border-none p-4 rounded-xl outline-none text-sm font-mono text-[var(--text)] placeholder-[var(--subtext)]/60"
            required
          />
          
          <div className="relative">
            <input
              type="text"
              placeholder="MT5 Server (e.g. ICMarketsSC-Demo)"
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

          <input
            type="password"
            placeholder="Master Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[var(--input-bg)] border-none p-4 rounded-xl outline-none text-sm font-mono text-[var(--text)] placeholder-[var(--subtext)]/60"
            required
          />
          <button
            type="submit"
            className="w-full bg-[var(--text)] text-[var(--bg)] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest mt-2 active:scale-95 hover:opacity-90 transition"
          >
            Link Account
          </button>
        </form>
      </div>
    </div>
  );
}
