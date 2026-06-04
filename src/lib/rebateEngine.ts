/**
 * Multi-Level Rebate Distribution Engine
 * 
 * Walks up the referral tree from the trader and distributes
 * rebate earnings to each ancestor according to rebate_levels percentages.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RebateLevel {
  level: number;
  percentage: number;
  label: string;
  active: boolean;
}

interface TradeLogEntry {
  id: string;
  user_id: string;
  broker_account_id: string | null;
  deal_id: string;
  symbol: string;
  deal_type: string;
  volume: number;
  profit: number;
  commission: number;
  closed_at: string;
}

/**
 * Fetch the active rebate level percentages from the database
 */
async function getRebateLevels(): Promise<RebateLevel[]> {
  const { data, error } = await supabaseAdmin
    .from('rebate_levels')
    .select('*')
    .eq('active', true)
    .order('level', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Walk up the referral tree from a given user, returning ancestors in order.
 * Returns: [{userId, level}] where level 1 = direct referrer, 2 = referrer's referrer, etc.
 */
async function getUpline(userId: string, maxLevels: number): Promise<{ userId: string; level: number }[]> {
  const upline: { userId: string; level: number }[] = [];
  let currentId = userId;

  for (let level = 1; level <= maxLevels; level++) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referred_by')
      .eq('id', currentId)
      .maybeSingle();

    if (!profile?.referred_by) break;

    upline.push({ userId: profile.referred_by, level });
    currentId = profile.referred_by;
  }

  return upline;
}

/**
 * Distribute rebate for a single trade to the upline.
 * 
 * @param trade - The trade log entry
 * @param grossRebate - The total rebate amount for this trade (volume × rate × multipliers)
 * @returns Number of distributions made
 */
export async function distributeRebate(
  trade: TradeLogEntry,
  grossRebate: number
): Promise<number> {
  if (grossRebate <= 0) return 0;

  const levels = await getRebateLevels();
  if (levels.length === 0) return 0;

  const maxLevel = Math.max(...levels.map(l => l.level));
  const upline = await getUpline(trade.user_id, maxLevel);

  let distributions = 0;

  for (const ancestor of upline) {
    const levelConfig = levels.find(l => l.level === ancestor.level);
    if (!levelConfig) continue;

    const earnedAmount = Number((grossRebate * (levelConfig.percentage / 100)).toFixed(2));
    if (earnedAmount <= 0) continue;

    // Write referral rebate to wallet_transactions
    const referenceId = `ref_${trade.deal_id}_L${ancestor.level}`;
    
    const { data: existing } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('reference_id', referenceId)
      .maybeSingle();

    if (existing) continue; // Already distributed

    const { error: txErr } = await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: ancestor.userId,
        amount: earnedAmount,
        tx_type: 'referral',
        status: 'completed',
        reference_id: referenceId,
        metadata: {
          source_user_id: trade.user_id,
          trade_log_id: trade.id,
          deal_id: trade.deal_id,
          symbol: trade.symbol,
          volume: trade.volume,
          gross_rebate: grossRebate,
          level: ancestor.level,
          level_label: levelConfig.label,
          percentage: levelConfig.percentage,
        },
      });

    if (txErr) {
      console.error(`[Rebate Distribution] L${ancestor.level} to ${ancestor.userId} failed:`, txErr.message);
      continue;
    }

    // Credit the ancestor's wallet balance
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', ancestor.userId)
      .maybeSingle();

    const currentBalance = Number(profile?.wallet_balance || 0);
    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: currentBalance + earnedAmount })
      .eq('id', ancestor.userId);

    distributions++;
    console.log(`[Rebate Distribution] L${ancestor.level} → ${ancestor.userId}: +$${earnedAmount} (${levelConfig.percentage}% of $${grossRebate})`);
  }

  return distributions;
}

/**
 * 40/40/20 Milestone Check Engine
 * 
 * For a given user and milestone, calculates whether they qualify
 * by capping each direct leg's contribution at leg_cap_pct% of the target.
 */
export interface LegBreakdown {
  legUserId: string;
  legName: string;
  rawLots: number;
  cappedLots: number;
  capped: boolean;
}

export interface MilestoneResult {
  qualified: boolean;
  totalRawLots: number;
  totalCountedLots: number;
  targetLots: number;
  legCap: number;
  breakdown: LegBreakdown[];
}

export async function checkMilestone(
  userId: string,
  milestoneId: string
): Promise<MilestoneResult> {
  // Fetch milestone config
  const { data: milestone } = await supabaseAdmin
    .from('milestones')
    .select('*')
    .eq('id', milestoneId)
    .maybeSingle();

  if (!milestone) throw new Error('Milestone not found');

  const targetLots = Number(milestone.target_lots);
  const legCapPct = Number(milestone.leg_cap_pct) / 100; // 0.40
  const legCap = targetLots * legCapPct;

  // Get direct referrals (Level 1 = legs)
  const { data: directRefs } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('referred_by', userId);

  const legs = directRefs || [];

  const breakdown: LegBreakdown[] = [];
  let totalRawLots = 0;
  let totalCountedLots = 0;

  for (const leg of legs) {
    // Get total volume for this leg + everyone under them
    const { data: legVolumeResult } = await supabaseAdmin
      .rpc('get_leg_volume', { leg_user_id: leg.id });

    const rawLots = Number(legVolumeResult || 0);
    const cappedLots = Math.min(rawLots, legCap);

    totalRawLots += rawLots;
    totalCountedLots += cappedLots;

    breakdown.push({
      legUserId: leg.id,
      legName: leg.full_name || leg.email || 'Unknown',
      rawLots,
      cappedLots,
      capped: rawLots > legCap,
    });
  }

  // Sort by raw volume descending
  breakdown.sort((a, b) => b.rawLots - a.rawLots);

  const qualified = totalCountedLots >= targetLots;

  // Upsert progress
  await supabaseAdmin
    .from('milestone_progress')
    .upsert({
      user_id: userId,
      milestone_id: milestoneId,
      status: qualified ? 'qualified' : 'in_progress',
      total_raw_lots: totalRawLots,
      total_counted_lots: totalCountedLots,
      legs_breakdown: breakdown,
      qualified_at: qualified ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,milestone_id' });

  return {
    qualified,
    totalRawLots,
    totalCountedLots,
    targetLots,
    legCap,
    breakdown,
  };
}

/**
 * Check all milestones for a given user
 */
export async function checkAllMilestones(userId: string): Promise<MilestoneResult[]> {
  const { data: milestones } = await supabaseAdmin
    .from('milestones')
    .select('id')
    .eq('active', true)
    .order('sort_order');

  const results: MilestoneResult[] = [];
  for (const m of (milestones || [])) {
    const result = await checkMilestone(userId, m.id);
    results.push(result);
  }
  return results;
}
