import React, { useState, useEffect } from 'react';

interface AssetsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowedSymbols?: string[];
  onSelectSymbol: (symbol: string) => void;
}

const FALLBACK_SYMBOLS = ['Gold', 'Bitcoin', 'Ethereum', 'EURUSD', 'GBPUSD', 'NAS100', 'US30', 'Oil', 'SPY'];

export default function AssetsSearchModal({
  isOpen,
  onClose,
  allowedSymbols,
  onSelectSymbol,
}: AssetsSearchModalProps) {
  const [browseSearch, setBrowseSearch] = useState('');

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBrowseSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const symbolsToBrowse = allowedSymbols && allowedSymbols.length > 0
    ? allowedSymbols
    : FALLBACK_SYMBOLS;

  const filteredBrowseSymbols = symbolsToBrowse
    .filter(sym => sym.toLowerCase().includes(browseSearch.toLowerCase()))
    .slice(0, 100);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4" 
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-3xl p-6 text-[var(--text)] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
            🌐 Allowed Instruments
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--input-bg)] text-[var(--subtext)] hover:text-[var(--text)] transition cursor-pointer"
          >
            ✕
          </button>
        </div>
        
        <p className="text-[11px] text-[var(--subtext)] mb-4">
          These are the permitted instruments allowed to trade on your active account. Click any instrument to analyze it.
        </p>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            value={browseSearch}
            onChange={(e) => setBrowseSearch(e.target.value)}
            placeholder="Search stocks, forex, metals..."
            className="w-full px-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto pr-1 space-y-1 no-scrollbar">
          {filteredBrowseSymbols.length > 0 ? (
            filteredBrowseSymbols.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  onSelectSymbol(sym);
                  onClose();
                }}
                className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[var(--accent)]/10 text-xs font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors border border-[var(--border)] hover:border-[var(--accent)]/30 cursor-pointer"
              >
                {sym}
              </button>
            ))
          ) : (
            <div className="p-4 text-xs text-[var(--subtext)] text-center">No matching assets found</div>
          )}
        </div>
      </div>
    </div>
  );
}
