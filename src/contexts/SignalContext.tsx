'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SignalData {
  symbol: string;          // 'XAUUSD'
  apiSymbol: string;       // 'XAU/USD'
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  confluenceScore: number;
  confidenceGrade: string;
  smcPatterns: string[];
  analysis: string;
  rrRatio: string;
  risk: string;
  profit: string;
  timestamp: number;
}

interface SignalContextType {
  pendingSignal: SignalData | null;
  setPendingSignal: (signal: SignalData | null) => void;
  clearSignal: () => void;
  hasSignal: boolean;
}

const SignalContext = createContext<SignalContextType>({
  pendingSignal: null,
  setPendingSignal: () => {},
  clearSignal: () => {},
  hasSignal: false,
});

export function SignalProvider({ children }: { children: React.ReactNode }) {
  const [pendingSignal, setPendingSignal] = useState<SignalData | null>(null);

  const clearSignal = useCallback(() => {
    setPendingSignal(null);
  }, []);

  return (
    <SignalContext.Provider value={{
      pendingSignal,
      setPendingSignal,
      clearSignal,
      hasSignal: pendingSignal !== null,
    }}>
      {children}
    </SignalContext.Provider>
  );
}

export function useSignal() {
  return useContext(SignalContext);
}
