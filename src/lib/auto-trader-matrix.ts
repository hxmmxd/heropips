export type StrategyPreset =
  | 'full_15_gates'
  | 'smc_only'
  | 'tech_only'
  | 'high_confluence_80';

export interface BotInstance {
  id: string;
  name: string;
  accountId: string; // MT5 Login ID or UUID
  accountName?: string;
  strategyPreset: StrategyPreset;
  minConfluenceThreshold?: number;
  tpMode?: 'quick_scalp' | 'dynamic_atr';
  customTpDistance?: number;
  intervalMinutes: number;
  sizingMode: 'risk_percent' | 'fixed_dollar' | 'kelly_adaptive' | 'fixed_lots';
  sizingValue: number;
  symbols: string[];
  isEnabled: boolean;
  lastRunAt?: string;
  lastSymbol?: string;
  lastDirection?: 'BUY' | 'SELL';
  lastOutcome?: string;
  lastError?: string;
}

export const STRATEGY_PRESETS: Record<StrategyPreset, {
  name: string;
  desc: string;
  icon: string;
  badgeColor: string;
}> = {
  full_15_gates: {
    name: '15-Gate Quant Consensus',
    desc: 'Requires full 12-Tech + 3-Risk Governor consensus (SIGNAL / SHADOW).',
    icon: '🛡️',
    badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  smc_only: {
    name: 'Pure Smart Money Concepts (SMC)',
    desc: 'Triggers on Order Blocks, Fair Value Gaps (FVG), BOS, and Liquidity Sweeps.',
    icon: '⚡',
    badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },

  tech_only: {
    name: '12 Technical Gates S/R Breakdown',
    desc: 'Focuses strictly on Price Action, RSI/MACD, Trendlines, and Support/Resistance.',
    icon: '📊',
    badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  high_confluence_80: {
    name: 'High Confluence Selective',
    desc: 'Only trades high probability setups matching minimum confluence threshold.',
    icon: '🎯',
    badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
};

/**
 * Evaluates whether a market snapshot meets the given strategy preset requirements.
 */
export function evaluateStrategyPreset(
  preset: StrategyPreset,
  snapshot: any,
  minConfluenceThreshold?: number
): { shouldTrade: boolean; reason: string } {
  if (!snapshot) {
    return { shouldTrade: false, reason: 'No market snapshot computed' };
  }

  const signalOutcome = snapshot.signalOutcome || 'NO_TRADE';
  const confluenceScore = snapshot.confluenceScore || 0;
  const confidenceGrade = snapshot.confidenceGrade || 'BBB';
  const smcConfirmations = snapshot.smcConfirmations || 0;

  switch (preset) {
    case 'full_15_gates': {
      const minScore = minConfluenceThreshold ?? 50;
      const passed = (signalOutcome === 'SIGNAL' || signalOutcome === 'SHADOW') && confluenceScore >= minScore;
      return {
        shouldTrade: passed,
        reason: passed
          ? `15-Gate Consensus Passed (${confluenceScore}% ${signalOutcome})`
          : `Gating Blocked: Outcome state is ${signalOutcome} (${confluenceScore}% vs ${minScore}% min)`,
      };
    }

    case 'smc_only': {
      const passed = smcConfirmations >= 2 || (snapshot.smcPatterns && snapshot.smcPatterns.length >= 2);
      return {
        shouldTrade: passed,
        reason: passed
          ? `SMC Confluence Triggered (${smcConfirmations} SMC confirmations)`
          : `SMC Blocked: Only ${smcConfirmations} SMC confirmations (requires 2+)`,
      };
    }



    case 'tech_only': {
      const techPassedGates = snapshot.gateResults?.filter((g: any) => g.passed)?.length || 0;
      const minScore = minConfluenceThreshold ?? 50;
      const passed = techPassedGates >= 5 || confluenceScore >= minScore;
      return {
        shouldTrade: passed,
        reason: passed
          ? `12 Tech Gates Passed (${techPassedGates} gates passed, ${confluenceScore}% ${confidenceGrade} Confidence)`
          : `Tech Blocked: Only ${techPassedGates} gates passed (requires ${minScore}%+ threshold)`,
      };
    }

    case 'high_confluence_80': {
      const minScore = minConfluenceThreshold ?? 50;
      const passed = confluenceScore >= minScore;
      return {
        shouldTrade: passed,
        reason: passed
          ? `High Confluence Confirmed (${confluenceScore}% Grade ${confidenceGrade})`
          : `High Confluence Blocked: ${confluenceScore}% Grade ${confidenceGrade} (requires ${minScore}%+ threshold)`,
      };
    }

    default: {
      const passed = signalOutcome === 'SIGNAL' || signalOutcome === 'SHADOW';
      return {
        shouldTrade: passed,
        reason: `Default 15-Gate Result: ${signalOutcome}`,
      };
    }
  }
}
