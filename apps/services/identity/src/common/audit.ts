import { randomUUID } from "node:crypto";
import type { IdentityRepo } from "../db/repo";
import { auditEvent, type OutboxInsert } from "../outbox/outbox.service";

/**
 * Audit helper used by every mutating route: writes the audit row and mirrors
 * it to the Kafka audit topic through the outbox in one tx.
 */
export async function audit(
  repo: IdentityRepo,
  at: Date,
  actorId: string,
  action: string,
  target?: string | null,
  meta?: Record<string, unknown> | null,
  extraEvents: OutboxInsert[] = [],
): Promise<void> {
  const row = {
    id: randomUUID(),
    actorId,
    action,
    target: target ?? null,
    meta: meta ?? null,
    createdAt: at,
  };
  await repo.insertAudit(row, [
    auditEvent(action, { actor_id: actorId, target: row.target, meta: row.meta }),
    ...extraEvents,
  ]);
}
