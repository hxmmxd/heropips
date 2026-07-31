import { randomUUID } from "node:crypto";
import { TOPICS, type EventEnvelope } from "@heropips/contracts";
import { TENANT_ID } from "../common/config";
import type { OutboxInsert } from "../db/repo";

export function makeEnvelope(type: string, payload: unknown): EventEnvelope {
  return {
    event_id: randomUUID(),
    type,
    occurred_at: new Date().toISOString(),
    tenant_id: TENANT_ID,
    payload,
  };
}

/** payment.* events all flow to the payment events topic. */
export function paymentEvent(type: string, payload: unknown): OutboxInsert {
  return { topic: TOPICS.paymentEvents, envelope: makeEnvelope(type, payload) };
}
