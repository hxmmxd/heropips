// Load env variables (mocked values used below)

// Mock Database data
const mockRiskSettings = {
  exclude_hedged_positions: true,
  hedge_time_buffer_seconds: 15,
  max_drawdown_limit: 35.00,
  spread_protection_multiplier: 0.70,
  clawback_grace_period_days: 14,
};

const mockVolumeTiers = [
  { min_monthly_lots: 0.00, max_monthly_lots: 10.00, payout_multiplier: 1.00 },
  { min_monthly_lots: 10.00, max_monthly_lots: 50.00, payout_multiplier: 1.10 },
  { min_monthly_lots: 50.00, max_monthly_lots: 999999.00, payout_multiplier: 1.25 }
];

const mockPromotions = [
  { symbol: 'XAUUSD', multiplier: 1.25, start_time: '2026-06-01T00:00:00Z', end_time: '2026-06-03T00:00:00Z', name: 'Gold Boost' }
];

const mockRules = [
  { symbol: '*', rebate_per_lot: 2.00, min_hold_time_seconds: 120, min_pip_distance: 3.00, free_multiplier: 0.60, pro_multiplier: 0.80, enterprise_multiplier: 1.00 },
  { symbol: 'XAUUSD', rebate_per_lot: 2.50, min_hold_time_seconds: 60, min_pip_distance: 2.00, free_multiplier: 0.60, pro_multiplier: 0.80, enterprise_multiplier: 1.00 }
];

// Helper to simulate the sync-rebates logic
function calculateMockRebate({
  deal,
  userPlan = 'free',
  monthlyLots = 5.00,
  accountBalance = 10000,
  accountEquity = 10000,
  existingTransactions = []
}) {
  // 1. Drawdown safeguard limit check
  const balance = accountBalance;
  const equity = accountEquity;
  if (balance > 0) {
    const drawdownPercent = ((balance - equity) / balance) * 100;
    if (drawdownPercent > mockRiskSettings.max_drawdown_limit) {
      return { status: 'FAILED', reason: `Drawdown limit exceeded: ${drawdownPercent.toFixed(2)}% > ${mockRiskSettings.max_drawdown_limit}%` };
    }
  }

  // 2. Volume tier calculation
  const matchingTier = mockVolumeTiers.find(
    t => monthlyLots >= t.min_monthly_lots && monthlyLots < t.max_monthly_lots
  );
  const tierMultiplier = matchingTier ? matchingTier.payout_multiplier : 1.00;

  // 3. Hold time validation (MTP check)
  const matchingRule = mockRules.find(r => r.symbol === deal.symbol) || mockRules.find(r => r.symbol === '*');
  const baseRate = matchingRule ? matchingRule.rebate_per_lot : 2.00;
  const minHoldTime = matchingRule ? matchingRule.min_hold_time_seconds : 120;

  if (deal.holdTimeSeconds < minHoldTime) {
    return { status: 'FAILED', reason: `Hold time short: ${deal.holdTimeSeconds}s < ${minHoldTime}s` };
  }

  // 4. Plan multiplier
  let planMultiplier = 0.60;
  if (matchingRule) {
    planMultiplier = userPlan === 'enterprise' 
      ? matchingRule.enterprise_multiplier 
      : userPlan === 'pro' 
        ? matchingRule.pro_multiplier 
        : matchingRule.free_multiplier;
  }

  // 5. Promo boost check
  const dealDate = new Date(deal.time);
  const activePromo = mockPromotions.find(p => {
    const start = new Date(p.start_time);
    const end = new Date(p.end_time);
    return dealDate >= start && dealDate <= end && (p.symbol === deal.symbol || p.symbol === '*');
  });
  const promoMultiplier = activePromo ? activePromo.multiplier : 1.00;

  // 6. Hedge correlation check
  if (mockRiskSettings.exclude_hedged_positions) {
    const dealTime = new Date(deal.time).getTime();
    const timeBuffer = mockRiskSettings.hedge_time_buffer_seconds * 1000;
    const opposingType = deal.type === 'DEAL_TYPE_BUY' ? 'DEAL_TYPE_SELL' : 'DEAL_TYPE_BUY';

    const hasHedge = existingTransactions.some(tx => {
      if (tx.tx_type !== 'rebate') return false;
      if (tx.metadata.symbol !== deal.symbol) return false;
      if (tx.metadata.deal_type !== opposingType) return false;
      const txTime = new Date(tx.metadata.deal_time).getTime();
      return Math.abs(txTime - dealTime) <= timeBuffer;
    });

    if (hasHedge) {
      return { status: 'FAILED', reason: `Hedge detected: opposing direction inside ${mockRiskSettings.hedge_time_buffer_seconds}s buffer` };
    }
  }

  // 7. Base calculation
  let amount = deal.volume * baseRate * planMultiplier * tierMultiplier * promoMultiplier;

  // 8. Revenue protection check
  let capped = false;
  let originalAmount = amount;
  if (deal.commission) {
    const brokerCharges = Math.abs(deal.commission);
    const maxAllowed = brokerCharges * mockRiskSettings.spread_protection_multiplier;
    if (amount > maxAllowed) {
      amount = maxAllowed;
      capped = true;
    }
  }

  return {
    status: 'SUCCESS',
    rateUsed: baseRate,
    planMultiplier,
    tierMultiplier,
    promoMultiplier,
    finalAmount: Number(amount.toFixed(2)),
    capped,
    originalAmount: Number(originalAmount.toFixed(2))
  };
}

// RUN TESTS
const testCases = [
  {
    name: '1. Standard free tier Gold deal',
    deal: { symbol: 'XAUUSD', volume: 1.0, holdTimeSeconds: 150, time: '2026-06-02T10:00:00Z', type: 'DEAL_TYPE_SELL', commission: -10.00 },
    userPlan: 'free',
    monthlyLots: 5.0,
  },
  {
    name: '2. Pro plan Gold deal with active happy hour promo boost',
    deal: { symbol: 'XAUUSD', volume: 1.0, holdTimeSeconds: 150, time: '2026-06-02T10:00:00Z', type: 'DEAL_TYPE_SELL', commission: -10.00 },
    userPlan: 'pro',
    monthlyLots: 5.0,
  },
  {
    name: '3. Volume tier boost (monthly volume > 50 lots) on Enterprise plan',
    deal: { symbol: 'EURUSD', volume: 2.0, holdTimeSeconds: 200, time: '2026-06-02T10:00:00Z', type: 'DEAL_TYPE_SELL', commission: -15.00 },
    userPlan: 'enterprise',
    monthlyLots: 75.0,
  },
  {
    name: '4. Hold time restriction filter (MTP check fail)',
    deal: { symbol: 'XAUUSD', volume: 1.0, holdTimeSeconds: 45, time: '2026-06-02T10:00:00Z', type: 'DEAL_TYPE_SELL', commission: -10.00 },
    userPlan: 'pro',
    monthlyLots: 5.0,
  },
  {
    name: '5. Max account drawdown safeguard filter (drawdown 40% > 35% cap)',
    deal: { symbol: 'XAUUSD', volume: 1.0, holdTimeSeconds: 150, time: '2026-06-02T10:00:00Z', type: 'DEAL_TYPE_SELL', commission: -10.00 },
    userPlan: 'pro',
    monthlyLots: 5.0,
    accountBalance: 10000,
    accountEquity: 6000, // 40% drawdown
  },
  {
    name: '6. Spread/Revenue guard protection cap (rebate capped to 70% of broker commission)',
    deal: { symbol: 'XAUUSD', volume: 2.0, holdTimeSeconds: 120, time: '2026-06-02T10:00:00Z', type: 'DEAL_TYPE_SELL', commission: -3.00 },
    userPlan: 'enterprise', // Base rebate without cap would be 2.0 lots * $2.50 * 1.0 * 1.25 = $6.25
    monthlyLots: 5.0, // Commission is only $3.00, max allowed is 70% of $3 = $2.10
  },
  {
    name: '7. Multi-account hedge detection (opposing direction deal within buffer window)',
    deal: { symbol: 'XAUUSD', volume: 1.0, holdTimeSeconds: 150, time: '2026-06-02T10:00:10Z', type: 'DEAL_TYPE_SELL', commission: -10.00 },
    userPlan: 'pro',
    monthlyLots: 5.0,
    existingTransactions: [
      {
        tx_type: 'rebate',
        metadata: {
          symbol: 'XAUUSD',
          deal_type: 'DEAL_TYPE_BUY',
          deal_time: '2026-06-02T10:00:02Z' // 8 seconds apart (within the 15-second buffer)
        }
      }
    ]
  }
];

console.log('========================================================================');
console.log('             REBATE ENGINE SIMULATED VALIDATION TEST SUITE               ');
console.log('========================================================================\n');

testCases.forEach((tc) => {
  const result = calculateMockRebate(tc);
  console.log(`Test: ${tc.name}`);
  console.log(`Status: ${result.status}`);
  if (result.status === 'SUCCESS') {
    console.log(`  - Calculated Rebate: $${result.finalAmount} (Base: $${result.rateUsed})`);
    console.log(`  - Multipliers: Plan ${result.planMultiplier}x, Tier ${result.tierMultiplier}x, Promo ${result.promoMultiplier}x`);
    if (result.capped) {
      console.log(`  - [CAPPED] Spread revenue protection applied (Uncapped: $${result.originalAmount})`);
    }
  } else {
    console.log(`  - [DISQUALIFIED] Reason: ${result.reason}`);
  }
  console.log('------------------------------------------------------------------------');
});
