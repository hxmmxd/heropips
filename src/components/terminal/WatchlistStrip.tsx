import React, { useState, useRef } from 'react';
import { useLivePrices } from '@/hooks/useLivePrices';
import { WatchIcon } from './AssetIcons';

interface WatchlistStripProps {
  allowedSymbols?: string[];
  onSelectSymbol: (symbol: string) => void;
  onOpenAssetsModal: () => void;
}

const WATCHLIST_ASSETS = [
  { symbol: 'Gold', label: 'XAUUSD', iconType: 'gold' },
  { symbol: 'Bitcoin', label: 'BTCUSD', iconType: 'btc' },
  { symbol: 'Ethereum', label: 'ETHUSD', iconType: 'eth' },
  { symbol: 'EURUSD', label: 'EURUSD', iconType: 'eur' },
  { symbol: 'GBPUSD', label: 'GBPUSD', iconType: 'gbp' },
  { symbol: 'NAS100', label: 'NAS100', iconType: 'nasdaq' },
  { symbol: 'US30', label: 'US30', iconType: 'dow' },
  { symbol: 'Oil', label: 'OIL', iconType: 'oil' },
  { symbol: 'SPY', label: 'SP500', iconType: 'spy' },
];

export default function WatchlistStrip({
  allowedSymbols,
  onSelectSymbol,
  onOpenAssetsModal,
}: WatchlistStripProps) {
  const { getPrice, connected } = useLivePrices();
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});

  // Detect price direction for flash effect
  const checkFlash = (symbol: string, newPrice: number | null) => {
    if (newPrice === null) return;
    const prev = prevPricesRef.current[symbol];
    if (prev !== undefined && prev !== newPrice) {
      setFlashMap((f) => ({ ...f, [symbol]: newPrice > prev ? 'up' : 'down' }));
      setTimeout(() => setFlashMap((f) => ({ ...f, [symbol]: null })), 600);
    }
    prevPricesRef.current[symbol] = newPrice;
  };

  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg)]">
      <style>{`
        @keyframes priceFlashUp {
          0%   { background: rgba(16,185,129,0.22); color: #10b981; }
          100% { background: transparent; }
        }
        @keyframes priceFlashDown {
          0%   { background: rgba(239,68,68,0.18); color: #ef4444; }
          100% { background: transparent; }
        }
        .price-flash-up   { animation: priceFlashUp   0.55s ease-out forwards; border-radius: 4px; }
        .price-flash-down { animation: priceFlashDown 0.55s ease-out forwards; border-radius: 4px; }
        .live-dot { width:5px; height:5px; border-radius:50%; background:#10b981; display:inline-block; margin-right:3px; }
        .live-dot-pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
      `}</style>
      <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 shrink-0 mr-1">
          <span 
            className={`live-dot ${connected ? 'live-dot-pulse' : ''}`} 
            style={{ background: connected ? '#10b981' : '#ef4444' }} 
          />
          <span className="text-[9px] font-bold text-[var(--subtext)] uppercase tracking-widest">
            {connected ? 'Live' : 'Off'}
          </span>
        </div>

        {/* Allowed Instruments Modal Trigger */}
        <button
          onClick={onOpenAssetsModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--sidebar-bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 active:scale-95 transition-all text-[11px] font-bold text-[var(--subtext)] hover:text-[var(--text)] cursor-pointer shrink-0"
        >
          <span>🌐 {allowedSymbols && allowedSymbols.length > 0 ? `${allowedSymbols.length} Assets` : 'Default Assets'}</span>
        </button>

        {WATCHLIST_ASSETS.map((asset) => {
          const livePrice = getPrice(asset.symbol);
          checkFlash(asset.symbol, livePrice);
          const flash = flashMap[asset.symbol];
          return (
            <button
              key={asset.symbol}
              onClick={() => onSelectSymbol(asset.symbol)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--sidebar-bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 active:scale-95 transition-all shrink-0 group"
            >
              <WatchIcon type={asset.iconType} />
              <span className="text-[11px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                {asset.label}
              </span>
              {livePrice !== null && (
                <span
                  className={`text-[11px] font-mono font-bold ml-0.5 px-1 ${
                    flash === 'up' ? 'price-flash-up text-green-400'
                    : flash === 'down' ? 'price-flash-down text-red-400'
                    : 'text-[var(--subtext)]'
                  }`}
                >
                  {livePrice > 999 
                    ? livePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : livePrice.toFixed(4)
                  }
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
