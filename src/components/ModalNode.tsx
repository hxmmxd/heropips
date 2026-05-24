'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ModalNodeProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (name: string, loginId: string) => void;
}

export default function ModalNode({ isOpen, onClose, onAddNode }: ModalNodeProps) {
  const [brokerName, setBrokerName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerName.trim() || !loginId.trim()) return;

    onAddNode(brokerName.trim(), loginId.trim());

    // Reset fields
    setBrokerName('');
    setLoginId('');
    setPassword('');
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
