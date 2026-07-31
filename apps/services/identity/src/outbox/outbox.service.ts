import { randomUUID } from "node:crypto";
import { TOPICS, type EventEnvelope } from "@heropips/contracts";
import { TENANT_ID } from "../common/config";
import type { OutboxInsert } from "../db/repo";

export type { OutboxInsert };

export function makeEnvelope(type: string, payload: unknown): EventEnvelope {
  return {
    event_id: randomUUID(),
    type,
    occurred_at: new Date().toISOString(),
    tenant_id: TENANT_ID,
    payload,
  };
}

/** Every audit row is mirrored to the audit log topic via the outbox. */
export function auditEvent(type: string, payload: unknown): OutboxInsert {
  return { topic: TOPICS.auditLog, envelope: makeEnvelope(type, payload) };
}

/** Lifecycle events consumed by growth-svc (messaging engine). */
export function identityEvent(type: string, payload: unknown): OutboxInsert {
  return { topic: TOPICS.identityEvents, envelope: makeEnvelope(type, payload) };
}
