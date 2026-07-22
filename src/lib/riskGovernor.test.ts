import { beforeAll, describe, test, expect, vi } from 'vitest';

// Mock env vars
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key';
});

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  upsert: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
  insert: vi.fn().mockImplementation(() => Promise.resolve({ error: null })),
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

import {
  evaluateGate13,
  evaluateGate14,
  evaluateGate15,
  evaluateStreakMultiplier,
  evaluatePortfolioHeat,
  evaluateAllRiskGates,
  createInitialRiskState,
  updateRiskMetrics,
  updateEquityCurve,
  updateTradeResult,
  performDailyReset,
  RiskState,
} from './riskGovernor';

// Mock initial state factory
const createTestState = (overrides?: Partial<RiskState>): RiskState => {
  return {
    ...createInitialRiskState('acc-123', 'user-456', 10000, 10000),
    ...overrides,
  };
};

describe('Risk Governor (Gates 13–15)', () => {
  
  describe('Gate 13: Equity Curve Protection (ECP)', () => {
    test('Bootstrap mode: passes with GREEN and 1.0 multiplier when trades < 20', () => {
      const state = createTestState();
      const result = evaluateGate13(state, 10);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(1.0);
      expect(result.detail).toContain('Bootstrap mode');
    });

    test('Medium history: uses EMA20 correctly', () => {
      const state = createTestState({ equityEma20: 10200, currentEquity: 10300 });
      // Case A: Current Equity >= EMA20 -> GREEN
      let result = evaluateGate13({ ...state, currentEquity: 10300, equityEma20: 10200 }, 30);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(1.0);
      
      // Case B: Current Equity < EMA20 -> AMBER
      result = evaluateGate13({ ...state, currentEquity: 10100, equityEma20: 10200 }, 30);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(0.5);
    });

    test('Full history (50+ trades): evaluates against EMA20 and SMA50 correctly', () => {
      const state = createTestState();

      // Case A: Equity > EMA20 and Equity > SMA50 -> GREEN (1.0x)
      let result = evaluateGate13({ ...state, currentEquity: 10500, equityEma20: 10400, equitySma50: 10300 }, 60);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(1.0);

      // Case B: Equity > SMA50 but Equity < EMA20 -> AMBER (0.5x)
      result = evaluateGate13({ ...state, currentEquity: 10350, equityEma20: 10400, equitySma50: 10300 }, 60);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(0.5);

      // Case C: Equity < SMA50 -> RED (0.0x - shadow mode)
      result = evaluateGate13({ ...state, currentEquity: 10200, equityEma20: 10400, equitySma50: 10300 }, 60);
      expect(result.passed).toBe(false);
      expect(result.multiplier).toBe(0.0);
    });
  });

  describe('Gate 14: Daily Loss Circuit Breaker (DLCB)', () => {
    test('NORMAL: Daily loss is low', () => {
      const state = createTestState({ dailyStartEquity: 10000, currentEquity: 9900 }); // 1% loss
      const result = evaluateGate14(state);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(1.0);
    });

    test('CAUTION: Daily loss is between 3% and 4.5%', () => {
      const state = createTestState({ dailyStartEquity: 10000, currentEquity: 9650 }); // 3.5% loss
      const result = evaluateGate14(state);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(0.5);
    });

    test('WARNING: Daily loss is between 4.5% and 6.0%', () => {
      const state = createTestState({ dailyStartEquity: 10000, currentEquity: 9500 }); // 5% loss
      const result = evaluateGate14(state);
      expect(result.passed).toBe(false);
      expect(result.multiplier).toBe(0.0);
    });

    test('TERMINAL: Daily loss is 6% or more', () => {
      const state = createTestState({ dailyStartEquity: 10000, currentEquity: 9350 }); // 6.5% loss
      const result = evaluateGate14(state);
      expect(result.passed).toBe(false);
      expect(result.multiplier).toBe(0.0); // Combined evaluator clamps it
    });
  });

  describe('Gate 15: Maximum Drawdown Governor (MDG)', () => {
    test('GREEN: Drawdown is less than 8%', () => {
      const state = createTestState({ peakEquity: 10000, currentEquity: 9600 }); // 4% DD
      const result = evaluateGate15(state);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(1.0);
    });

    test('YELLOW: Drawdown is between 8% and 15%', () => {
      const state = createTestState({ peakEquity: 10000, currentEquity: 9000 }); // 10% DD
      const result = evaluateGate15(state);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(0.5);
    });

    test('ORANGE: Drawdown is between 15% and 20%', () => {
      const state = createTestState({ peakEquity: 10000, currentEquity: 8300 }); // 17% DD
      const result = evaluateGate15(state);
      expect(result.passed).toBe(true);
      expect(result.multiplier).toBe(0.25);
    });

    test('RED: Drawdown is between 20% and 25%', () => {
      const state = createTestState({ peakEquity: 10000, currentEquity: 7800 }); // 22% DD
      const result = evaluateGate15(state);
      expect(result.passed).toBe(false);
      expect(result.multiplier).toBe(0.10);
    });

    test('BLACK: Drawdown is 25% or more', () => {
      const state = createTestState({ peakEquity: 10000, currentEquity: 7400 }); // 26% DD
      const result = evaluateGate15(state);
      expect(result.passed).toBe(false);
      expect(result.multiplier).toBe(0.0);
    });

    test('Recovery mode: applies anti-martingale scaling factor when recoveryWins > 0', () => {
      // 10% drawdown (YELLOW zone, base multiplier 0.5)
      // 2 wins in recovery -> recoveryMultiplier = 2/5 = 0.4. Multiplier = 0.5 * 0.4 = 0.20
      const state = createTestState({ peakEquity: 10000, currentEquity: 9000, drawdownZone: 'YELLOW', recoveryWins: 2 });
      const result = evaluateGate15(state);
      expect(result.multiplier).toBeCloseTo(0.20, 4);
    });
  });

  describe('Streak Multiplier', () => {
    test('returns correct multipliers for loss streak counts', () => {
      expect(evaluateStreakMultiplier(0).multiplier).toBe(1.0);
      expect(evaluateStreakMultiplier(3).multiplier).toBe(1.0);
      expect(evaluateStreakMultiplier(4).multiplier).toBe(0.75);
      expect(evaluateStreakMultiplier(5).multiplier).toBe(0.50);
      expect(evaluateStreakMultiplier(6).multiplier).toBe(0.25);
      expect(evaluateStreakMultiplier(7).shouldCoolDown).toBe(true);
      expect(evaluateStreakMultiplier(7).multiplier).toBe(0.0);
    });
  });

  describe('Portfolio Heat', () => {
    test('applies no reduction when heat is under 75% limit', () => {
      const result = evaluatePortfolioHeat(2.0, 4.0); // 50% limit
      expect(result.multiplier).toBe(1.0);
    });

    test('scales down sizing when heat is between 75% and 100% limit', () => {
      const result = evaluatePortfolioHeat(3.5, 4.0); // 87.5% limit
      expect(result.multiplier).toBeLessThan(1.0);
      expect(result.multiplier).toBeGreaterThanOrEqual(0.25);
    });

    test('blocks trades completely when heat exceeds limit', () => {
      const result = evaluatePortfolioHeat(4.5, 4.0);
      expect(result.multiplier).toBe(0.0);
    });
  });

  describe('Master Risk Evaluator (evaluateAllRiskGates)', () => {
    test('calculates correct combined multiplier', async () => {
      const state = createTestState({
        currentEquity: 9800,
        peakEquity: 10000,
        dailyStartEquity: 10000,
        consecutiveLosses: 4, // 0.75x multiplier
        portfolioHeatPct: 0,
      });

      // ECP -> GREEN (1.0x), Daily -> NORMAL (1.0x), DD -> GREEN (1.0x)
      // Streak -> 4 (0.75x)
      // Combined: 1.0 * 1.0 * 1.0 * 0.75 * 1.0 = 0.75x
      const result = await evaluateAllRiskGates(state, 10);
      expect(result.multipliers.combinedMultiplier).toBe(0.75);
      expect(result.multipliers.shouldHalt).toBe(false);
      expect(result.multipliers.shouldLiquidate).toBe(false);
    });
  });

  describe('State Transitions & Helpers', () => {
    test('updateRiskMetrics: correctly updates peak equity and drawdown metrics', () => {
      const initial = createInitialRiskState('acc-123', 'user-456', 10000, 10000);
      
      // Dynamic updates
      const updated = updateRiskMetrics(initial, 10500, 10000);
      expect(updated.peakEquity).toBe(10500);
      expect(updated.drawdownPct).toBe(0);

      const drawnDown = updateRiskMetrics(updated, 9450, 10000);
      expect(drawnDown.peakEquity).toBe(10500); // Retains high water mark
      // DD: (10500 - 9450)/10500 = 10%
      expect(drawnDown.drawdownPct).toBe(10);
      expect(drawnDown.drawdownZone).toBe('YELLOW');
    });

    test('updateEquityCurve: updates EMA20 and SMA50 correctly', () => {
      const state = createTestState();
      const history = [10000, 10100, 10200, 10150, 10300];
      const updated = updateEquityCurve(state, history);
      
      expect(updated.equityEma20).not.toBeNull();
      expect(updated.equitySma50).toBeNull(); // Not 50 items yet

      // Mocking 50 items
      const longHistory = Array(50).fill(10000);
      const updatedLong = updateEquityCurve(state, longHistory);
      expect(updatedLong.equitySma50).toBe(10000);
    });

    test('updateTradeResult: modifies streaks win/loss counters correctly', () => {
      const state = createTestState();
      
      let nextState = updateTradeResult(state, true);
      expect(nextState.consecutiveWins).toBe(1);
      expect(nextState.consecutiveLosses).toBe(0);

      nextState = updateTradeResult(nextState, false);
      expect(nextState.consecutiveWins).toBe(0);
      expect(nextState.consecutiveLosses).toBe(1);
    });

    test('performDailyReset: resets daily metrics', () => {
      const state = createTestState({
        dailyStartEquity: 10000,
        currentEquity: 9500,
        dailyLossPct: 5,
        tradesToday: 4,
      });

      const reset = performDailyReset(state, 9500, 9500);
      expect(reset.dailyStartEquity).toBe(9500);
      expect(reset.dailyLossPct).toBe(0);
      expect(reset.tradesToday).toBe(0);
    });
  });
});
