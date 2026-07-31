import { and, asc, eq, lte } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  outbox,
  referralAncestors,
  referralCommissions,
  referralEdges,
  referralProgramConfig,
} from "../db/schema";

export interface ReferralConfigRow {
  maxLevels: number;
  levelRatesBps: number[];
  updatedAt: Date;
}

export interface AncestorRow {
  ancestorId: string;
  depth: number;
}

export interface DescendantRow {
  descendantId: string;
  depth: number;
}

export interface NewAncestorRow {
  descendantId: string;
  ancestorId: string;
  depth: number;
}

export interface NewCommissionRow {
  orderId: string;
  beneficiaryId: string;
  level: number;
  rateBps: number;
  amountUsdMinor: number;
}

/** Operations available inside a referral transaction. */
export interface ReferralTxOps {
  getConfig(): Promise<ReferralConfigRow>;
  updateConfig(next: { maxLevels: number; levelRatesBps: number[] }): Promise<ReferralConfigRow>;
  hasEdge(childId: string): Promise<boolean>;
  /** true when `ancestorId` already sits above `descendantId` in the tree. */
  isAncestor(ancestorId: string, descendantId: string): Promise<boolean>;
  /** Ancestors of `descendantId` up to `maxDepth`, closest (depth 1) first. */
  ancestorsOf(descendantId: string, maxDepth: number): Promise<AncestorRow[]>;
  /** Entire subtree below `ancestorId` (any depth ≤ hard cap). */
  descendantsOf(ancestorId: string): Promise<DescendantRow[]>;
  insertEdge(childId: string, parentId: string): Promise<void>;
  /** ON CONFLICT (descendant_id, ancestor_id) DO NOTHING. */
  insertAncestors(rows: NewAncestorRow[]): Promise<void>;
  /** ON CONFLICT (order_id, beneficiary_id, level) DO NOTHING; true when inserted. */
  insertCommission(row: NewCommissionRow): Promise<boolean>;
  /** Marks all accrued rows for the order reversed; returns affected count. */
  reverseCommissions(orderId: string): Promise<number>;
  insertOutbox(topic: string, payload: unknown): Promise<void>;
}

/** DI seam: ReferralsService depends on this, tests inject an in-memory impl. */
export interface ReferralRepo {
  tx<T>(fn: (ops: ReferralTxOps) => Promise<T>): Promise<T>;
  getConfig(): Promise<ReferralConfigRow>;
}

export const REFERRAL_REPO = Symbol("REFERRAL_REPO");

/* ---------- drizzle/pg implementation ---------- */

type Executor = Pick<Db, "select" | "insert" | "update" | "execute">;

const TENANT_ID = "heropips";

const CONFIG_COLUMNS = {
  maxLevels: referralProgramConfig.maxLevels,
  levelRatesBps: referralProgramConfig.levelRatesBps,
  updatedAt: referralProgramConfig.updatedAt,
} as const;

async function getConfigOn(ex: Executor): Promise<ReferralConfigRow> {
  const rows = await ex
    .select(CONFIG_COLUMNS)
    .from(referralProgramConfig)
    .where(eq(referralProgramConfig.tenantId, TENANT_ID))
    .limit(1);
  const row = rows[0];
  if (!row) {
    // migrate.ts seeds this row on boot; missing means bootstrap DDL never ran.
    throw new Error("referral_program_config seed row missing — run migrations");
  }
  return row;
}

export class DrizzleReferralRepo implements ReferralRepo {
  constructor(private readonly db: Db) {}

  tx<T>(fn: (ops: ReferralTxOps) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const ops: ReferralTxOps = {
        getConfig: () => getConfigOn(tx),
        updateConfig: async (next) => {
          const rows = await tx
            .update(referralProgramConfig)
            .set({
              maxLevels: next.maxLevels,
              levelRatesBps: next.levelRatesBps,
              updatedAt: new Date(),
            })
            .where(eq(referralProgramConfig.tenantId, TENANT_ID))
            .returning(CONFIG_COLUMNS);
          const row = rows[0];
          if (!row) throw new Error("referral_program_config seed row missing — run migrations");
          return row;
        },
        hasEdge: async (childId) => {
          const rows = await tx
            .select({ childId: referralEdges.childId })
            .from(referralEdges)
            .where(eq(referralEdges.childId, childId))
            .limit(1);
          return rows.length > 0;
        },
        isAncestor: async (ancestorId, descendantId) => {
          const rows = await tx
            .select({ depth: referralAncestors.depth })
            .from(referralAncestors)
            .where(
              and(
                eq(referralAncestors.descendantId, descendantId),
                eq(referralAncestors.ancestorId, ancestorId),
              ),
            )
            .limit(1);
          return rows.length > 0;
        },
        ancestorsOf: async (descendantId, maxDepth) =>
          tx
            .select({ ancestorId: referralAncestors.ancestorId, depth: referralAncestors.depth })
            .from(referralAncestors)
            .where(
              and(
                eq(referralAncestors.descendantId, descendantId),
                lte(referralAncestors.depth, maxDepth),
              ),
            )
            .orderBy(asc(referralAncestors.depth)),
        descendantsOf: async (ancestorId) =>
          tx
            .select({ descendantId: referralAncestors.descendantId, depth: referralAncestors.depth })
            .from(referralAncestors)
            .where(eq(referralAncestors.ancestorId, ancestorId)),
        insertEdge: async (childId, parentId) => {
          await tx.insert(referralEdges).values({ childId, parentId });
        },
        insertAncestors: async (rows) => {
          if (rows.length === 0) return;
          await tx
            .insert(referralAncestors)
            .values(rows)
            .onConflictDoNothing({
              target: [referralAncestors.descendantId, referralAncestors.ancestorId],
            });
        },
        insertCommission: async (row) => {
          const inserted = await tx
            .insert(referralCommissions)
            .values(row)
            .onConflictDoNothing({
              target: [
                referralCommissions.orderId,
                referralCommissions.beneficiaryId,
                referralCommissions.level,
              ],
            })
            .returning({ id: referralCommissions.id });
          return inserted.length > 0;
        },
        reverseCommissions: async (orderId) => {
          const reversed = await tx
            .update(referralCommissions)
            .set({ status: "reversed" })
            .where(
              and(
                eq(referralCommissions.orderId, orderId),
                eq(referralCommissions.status, "accrued"),
              ),
            )
            .returning({ id: referralCommissions.id });
          return reversed.length;
        },
        insertOutbox: async (topic, payload) => {
          await tx.insert(outbox).values({ topic, payload });
        },
      };
      return fn(ops);
    });
  }

  getConfig(): Promise<ReferralConfigRow> {
    return getConfigOn(this.db);
  }
}
