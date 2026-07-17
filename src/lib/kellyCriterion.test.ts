import { beforeAll, describe, test, expect, vi } from 'vitest';

// Set up environment variables before imports evaluate
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-key';
});

// Mock Supabase Client API Chain
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

import { computeKellySizing } from './kellyCriterion';

describe('Kelly Criterion Position Sizer (computeKellySizing)', () => {
  test('returns default sizing when no trade history exists (or query fails)', async () => {
    // Mock Supabase returning empty data
    vi.mocked(mockSupabase.limit).mockResolvedValueOnce({ data: [], error: null } as any);

    const balance = 10000;
    const result = await computeKellySizing('XAUUSD_DEFAULT', balance);

    expect(result.tradeCount).toBe(0);
    expect(result.winRate).toBe(0.5); // Default win rate
    expect(result.rewardRiskRatio).toBe(1.0); // Default reward/risk ratio
    expect(result.kellyFraction).toBe(0.0); // raw Kelly = 0.5 - 0.5/1 = 0
    expect(result.cappedFraction).toBe(0.0); // Capped at 2% risk but raw is 0, so 0%
    expect(result.recommendedLots).toBe(0.01); // Clamped minimum
    expect(result.confidence).toBe('low');
    expect(result.detail).toContain('Insufficient trade history');
  });

  test('correctly calculates sizer on healthy win rate and positive reward-risk ratio', async () => {
    // Simulate 20 trades: 14 wins (+150 profit) and 6 losses (-100 profit)
    const mockTrades = [
      ...Array(14).fill({ profit: 150 }),
      ...Array(6).fill({ profit: -100 }),
    ];

    vi.mocked(mockSupabase.limit).mockResolvedValueOnce({ data: mockTrades, error: null } as any);

    const balance = 10000;
    const result = await computeKellySizing('XAUUSD_WINNING', balance);

    // Win Rate: 14 / 20 = 70%
    expect(result.winRate).toBe(0.70);
    // Avg Win = 150, Avg Loss = 100
    expect(result.avgWin).toBe(150);
    expect(result.avgLoss).toBe(100);
    // R = 150 / 100 = 1.5
    expect(result.rewardRiskRatio).toBe(1.5);
    // raw Kelly fraction = W - L/R = 0.7 - (0.3 / 1.5) = 0.7 - 0.2 = 0.5
    expect(result.kellyFraction).toBeCloseTo(0.5, 4);
    // cappedFraction = Math.max(0, Math.min(2% risk cap, 50% Kelly)) = 0.02 (2% risk)
    expect(result.cappedFraction).toBe(0.02);
    // recommendedLots = (balance * cappedFraction) / avgLoss = (10000 * 0.02) / 100 = 2.0 lots
    expect(result.recommendedLots).toBe(2.0);
    expect(result.confidence).toBe('medium'); // 20 trades is 'medium'
    expect(result.detail).toContain('Kelly 50.0% → capped 2.0% risk');
  });

  test('scales down and clamps recommended lots on negative expected value (losing strategy)', async () => {
    // Simulate 20 trades: 6 wins (+100 profit) and 14 losses (-100 profit)
    const mockTrades = [
      ...Array(6).fill({ profit: 100 }),
      ...Array(14).fill({ profit: -100 }),
    ];

    vi.mocked(mockSupabase.limit).mockResolvedValueOnce({ data: mockTrades, error: null } as any);

    const balance = 5000;
    const result = await computeKellySizing('XAUUSD_LOSING', balance);

    // Win Rate: 6 / 20 = 30%
    expect(result.winRate).toBe(0.30);
    // Kelly fraction = W - L/R = 0.3 - 0.7 = -0.4 (Negative expected value)
    expect(result.kellyFraction).toBeLessThan(0);
    // cappedFraction = clamped to 0 (no risk)
    expect(result.cappedFraction).toBe(0.0);
    // recommendedLots = clamped to minimum limit (0.01 lots)
    expect(result.recommendedLots).toBe(0.01);
  });
});
