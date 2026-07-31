import { timingSafeEqual } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  REFERRAL,
  REFERRAL_EVENTS,
  TOPICS,
  type ReferralAttributionRes,
  type ReferralConfigPatchReq,
  type ReferralConfigRes,
} from "@heropips/contracts";
import { GROWTH_CONFIG, type GrowthConfig } from "../common/config";
import { apiError } from "../common/errors";
import { makeEnvelope } from "../outbox/outbox.service";
import { REFERRAL_REPO, type NewAncestorRow, type ReferralRepo } from "./referrals.repo";

/** Business cap: rates may never sum past 50% of an order (zod only caps at 100%). */
const RATE_SUM_CAP_BPS = 5000;

@Injectable()
export class ReferralsService {
  constructor(
    @Inject(REFERRAL_REPO) private readonly repo: ReferralRepo,
    @Inject(GROWTH_CONFIG) private readonly config: GrowthConfig,
  ) {}

  /**
   * Attach child under parent. Closure rows are ALWAYS built to the hard cap
   * (REFERRAL.MAX_LEVELS), independent of the payout config, so admins can
   * raise config.max_levels later without rebuilding the tree. New ancestors
   * are also propagated to the child's existing subtree, so link order
   * between generations does not matter.
   */
  async link(childId: string, parentId: string): Promise<{ ok: true }> {
    if (childId === parentId) {
      throw apiError(422, "validation_failed", "child_id and parent_id must differ.");
    }
    await this.repo.tx(async (ops) => {
      if (await ops.hasEdge(childId)) {
        throw apiError(409, "referral_conflict", "This user already has a referrer.");
      }
      // Cycle guard: the prospective parent may not sit below the child.
      if (await ops.isAncestor(childId, parentId)) {
        throw apiError(409, "referral_cycle", "Linking would create a referral cycle.");
      }

      const parentAncestors = await ops.ancestorsOf(parentId, REFERRAL.MAX_LEVELS);
      const gained = [
        { ancestorId: parentId, depth: 1 },
        ...parentAncestors.map((a) => ({ ancestorId: a.ancestorId, depth: a.depth + 1 })),
      ];
      const members = [{ descendantId: childId, depth: 0 }, ...(await ops.descendantsOf(childId))];

      const rows: NewAncestorRow[] = [];
      for (const member of members) {
        for (const ancestor of gained) {
          const depth = member.depth + ancestor.depth;
          if (depth <= REFERRAL.MAX_LEVELS) {
            rows.push({ descendantId: member.descendantId, ancestorId: ancestor.ancestorId, depth });
          }
        }
      }

      await ops.insertEdge(childId, parentId);
      await ops.insertAncestors(rows);
    });
    return { ok: true };
  }

  async getConfig(): Promise<ReferralConfigRes> {
    const row = await this.repo.getConfig();
    return { max_levels: row.maxLevels, level_rates_bps: row.levelRatesBps };
  }

  async patchConfig(
    adminToken: string | undefined,
    patch: ReferralConfigPatchReq,
  ): Promise<ReferralConfigRes> {
    if (!this.config.adminToken) {
      throw apiError(503, "admin_disabled", "Admin mutations are disabled: ADMIN_TOKEN is not set.");
    }
    // M9: constant-time compare. `!==` leaked the length of the shared prefix,
    // and this was the one secret comparison in the repo that wasn't timing
    // safe (see common/token.ts and common/verification.ts for the pattern).
    if (!adminTokenMatches(adminToken, this.config.adminToken)) {
      throw apiError(401, "unauthorized", "Invalid admin token.");
    }
    return this.repo.tx(async (ops) => {
      const current = await ops.getConfig();
      const maxLevels = patch.max_levels ?? current.maxLevels;
      const rates = patch.level_rates_bps ?? current.levelRatesBps;

      // zod bounds each field (1..10 levels, 0..10000 bps); cross-field rules live here.
      if (rates.length !== maxLevels) {
        throw apiError(422, "validation_failed", "level_rates_bps length must equal max_levels.");
      }
      const sum = rates.reduce((a, b) => a + b, 0);
      if (sum > RATE_SUM_CAP_BPS) {
        throw apiError(
          422,
          "validation_failed",
          `level_rates_bps sum ${sum} exceeds the ${RATE_SUM_CAP_BPS} bps (50%) cap.`,
        );
      }

      const next = await ops.updateConfig({ maxLevels, levelRatesBps: rates });
      return { max_levels: next.maxLevels, level_rates_bps: next.levelRatesBps };
    });
  }

  /**
   * Idempotent commission accrual for a paid order. Levels without an
   * ancestor and zero-amount entries are skipped; re-calls insert nothing
   * (unique order/beneficiary/level) and emit no duplicate events.
   */
  async attribute(
    orderId: string,
    buyerId: string,
    totalUsdMinor: number,
  ): Promise<ReferralAttributionRes> {
    return this.repo.tx(async (ops) => {
      const cfg = await ops.getConfig();
      const ancestors = await ops.ancestorsOf(buyerId, cfg.maxLevels);

      const entries: ReferralAttributionRes["entries"] = [];
      for (const ancestor of ancestors) {
        const rateBps = cfg.levelRatesBps[ancestor.depth - 1];
        if (rateBps === undefined || rateBps <= 0) continue;
        const amountUsdMinor = Math.floor((totalUsdMinor * rateBps) / 10_000);
        if (amountUsdMinor <= 0) continue;

        const inserted = await ops.insertCommission({
          orderId,
          beneficiaryId: ancestor.ancestorId,
          level: ancestor.depth,
          rateBps,
          amountUsdMinor,
        });
        if (inserted) {
          await ops.insertOutbox(
            TOPICS.growthEvents,
            makeEnvelope(REFERRAL_EVENTS.commissionAccrued, {
              order_id: orderId,
              beneficiary_id: ancestor.ancestorId,
              level: ancestor.depth,
              rate_bps: rateBps,
              amount_usd_minor: amountUsdMinor,
            }),
          );
        }
        entries.push({
          beneficiary_id: ancestor.ancestorId,
          level: ancestor.depth,
          rate_bps: rateBps,
          amount_usd_minor: amountUsdMinor,
        });
      }

      return { order_id: orderId, total_usd_minor: totalUsdMinor, entries };
    });
  }

  /** Refund clawback: mark every accrued commission for the order reversed. */
  async reverse(orderId: string): Promise<{ ok: true; reversed: number }> {
    return this.repo.tx(async (ops) => {
      const reversed = await ops.reverseCommissions(orderId);
      if (reversed > 0) {
        await ops.insertOutbox(
          TOPICS.growthEvents,
          makeEnvelope(REFERRAL_EVENTS.commissionReversed, {
            order_id: orderId,
            reversed,
          }),
        );
      }
      return { ok: true as const, reversed };
    });
  }
}

/** Length check first: timingSafeEqual throws on a length mismatch. */
function adminTokenMatches(presented: string | undefined, expected: string): boolean {
  if (presented === undefined) return false;
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
