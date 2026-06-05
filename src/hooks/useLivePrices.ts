'use client';

import { useEffect, useRef, useState } from 'react';

// Symbol normalisation: map watchlist "symbol" strings → Twelve Data API keys
const SYMBOL_TO_KEY: Record<string, string> = {
  'Gold': 'XAU/USD',
  'XAU/USD': 'XAU/USD',
  'XAUUSD': 'XAU/USD',
  'XAUUSD.sc': 'XAU/USD',
  'Silver': 'XAG/USD',
  'XAG/USD': 'XAG/USD',
  'XAGUSD': 'XAG/USD',
  'XAGUSD.sc': 'XAG/USD',
  'Bitcoin': 'BTC/USD',
  'BTC/USD': 'BTC/USD',
  'BTCUSD': 'BTC/USD',
  'Ethereum': 'ETH/USD',
  'ETH/USD': 'ETH/USD',
  'ETHUSD': 'ETH/USD',
  'EURUSD': 'EUR/USD',
  'EUR/USD': 'EUR/USD',
  'GBPUSD': 'GBP/USD',
  'GBP/USD': 'GBP/USD',
  'USDJPY': 'USD/JPY',
  'USD/JPY': 'USD/JPY',
  'NAS100': 'QQQ',
  'QQQ': 'QQQ',
  'US30': 'DIA',
  'DIA': 'DIA',
  'Oil': 'USO',
  'USO': 'USO',
  'SPY': 'SPY',
  'SP500': 'SPY',
};

export type PriceMap = Record<string, number>; // key = Twelve Data symbol

export function useLivePrices(): {
  prices: PriceMap;
  getPrice: (watchlistSymbol: string) => number | null;
  connected: boolean;
} {
  const [prices, setPrices] = useState<PriceMap>({});
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource('/api/price-stream');
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data: PriceMap = JSON.parse(e.data);
        setPrices((prev) => ({ ...prev, ...data }));
        setConnected(true);
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Auto-reconnect after 3 s
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  };

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPrice = (watchlistSymbol: string): number | null => {
    // Direct lookup
    const key = SYMBOL_TO_KEY[watchlistSymbol];
    if (key && prices[key] != null) return prices[key];

    // Fallback: try normalizing 6-char forex pairs (e.g. EURUSD → EUR/USD)
    const clean = watchlistSymbol.replace('.sc', '').toUpperCase();
    const fallbackKey = SYMBOL_TO_KEY[clean];
    if (fallbackKey && prices[fallbackKey] != null) return prices[fallbackKey];

    // Last resort: try inserting slash at position 3
    if (clean.length === 6 && !clean.includes('/')) {
      const slashed = clean.slice(0, 3) + '/' + clean.slice(3);
      if (prices[slashed] != null) return prices[slashed];
    }

    return null;
  };

  return { prices, getPrice, connected };
}
